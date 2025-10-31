# --- image_generation.py ---
import os, re
import logging
from click import prompt
import requests
from PIL import Image
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from google.cloud import language_v1
from google.cloud import texttospeech
from concurrent.futures import ThreadPoolExecutor, as_completed
from langchain_core.prompts import PromptTemplate
import vertexai
from langchain_google_vertexai import ChatVertexAI, HarmBlockThreshold, HarmCategory
from requests.exceptions import RequestException
from utils.script import generate_script_and_image_prompts
from google import genai
from google.genai.types import GenerateImagesConfig
 # ...existing code...
import threading
import logging
import tempfile
from google.cloud import storage
import uuid # For unique filenames
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests # For download_image (if using stock photos as fallback)
import shutil # For download_image

load_dotenv()

language_client = language_v1.LanguageServiceClient()
tts_client = texttospeech.TextToSpeechClient()
vertex_key_path = os.getenv("VERTEX_AI_KEY")
indiankanoon_key = os.getenv("KANOON_API_KEY")
pixel_key = os.getenv("PEXELS_API_KEY")

VERTEX_AI_CREDENTIALS = os.getenv("VERTEX_AI_CREDENTIALS")
if VERTEX_AI_CREDENTIALS:
    os.environ["VERTEX_AI_CREDENTIALS"] = VERTEX_AI_CREDENTIALS

PROJECT_ID = "still-cipher-475415-t3"
vertexai.init(project=PROJECT_ID, location="us-central1")

safety_settings = {
    HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
}

llm = ChatVertexAI(
    model="gemini-2.5-flash",
    temperature=0.3,
    max_output_tokens=2048,
    project=PROJECT_ID,
    safety_settings=safety_settings
)

client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location="us-central1"
)

output_file = "output-image.png"
# image = client.models.generate_images(
#     model="imagen-4.0-generate-001",
#     prompt="Regarding rental agreement Simple diagram showing payment milestones: 40% start, 30% demo, 20% approval, 10% launch, labeled in English.",
#     config=GenerateImagesConfig(
#         image_size="2K",
#     ),
# )

# image.generated_images[0].image.save(output_file)
# print(f"Created output image using {len(image.generated_images[0].image.image_bytes)} bytes")




# GCS bucket config
GCS_BUCKET_NAME = "law-data-genai"
GCS_IMAGE_URL_FORMAT = "https://storage.googleapis.com/{bucket}/{filename}"

IMAGE_TEMP_DIR = os.path.join(tempfile.gettempdir(), "know_your_terms_images")
os.makedirs(IMAGE_TEMP_DIR, exist_ok=True)
logging.info(f"Using temp directory for images: {IMAGE_TEMP_DIR}")

app = Flask(__name__)


def upload_to_gcs(local_path: str, gcs_filename: str) -> str | None:
    """Uploads a file to GCS and returns its public URL."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(gcs_filename)
        blob.upload_from_filename(local_path)
        # If bucket is public, no need to set per-object ACLs
        url = GCS_IMAGE_URL_FORMAT.format(bucket=GCS_BUCKET_NAME, filename=gcs_filename)
        logging.info(f"Uploaded image to GCS: {url}")
        return url
    except Exception as e:
        logging.error(f"Failed to upload {local_path} to GCS: {e}", exc_info=True)
        return None

def generate_ai_image(prompt: str, output_filepath: str) -> str | None:
    """Generates an image using Google GenAI Imagen 4 and uploads to GCS."""
    logging.info(f"Generating AI image for prompt: '{prompt[:50]}...' -> {os.path.basename(output_filepath)}")
    try:
        image_response = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=prompt,
            config=GenerateImagesConfig(
                image_size="2K",
            ),
        )
        if image_response.generated_images:
            image_response.generated_images[0].image.save(output_filepath)
            if os.path.exists(output_filepath) and os.path.getsize(output_filepath) > 100:
                logging.info(f"Successfully generated AI image: {os.path.basename(output_filepath)}")
                # Upload to GCS
                gcs_filename = os.path.basename(output_filepath)
                gcs_url = upload_to_gcs(output_filepath, gcs_filename)
                # Optionally delete local file after upload
                try:
                    os.remove(output_filepath)
                except OSError:
                    pass
                return gcs_url
            else:
                logging.error(f"AI image saved incorrectly or empty: {os.path.basename(output_filepath)}")
                if os.path.exists(output_filepath): os.remove(output_filepath)
                return None
        else:
            logging.error(f"AI image generation failed (API returned no images) for prompt: '{prompt[:50]}...'")
            return None
    except Exception as e:
        logging.error(f"Exception during GenAI image generation for '{prompt[:50]}...': {e}", exc_info=True)
        if os.path.exists(output_filepath):
            try: os.remove(output_filepath)
            except OSError: pass
        return None

def search_stock_images(query: str, num_images: int = 1, language: str = "en") -> list[str]:
    """Searches Pexels API for images."""
    logging.info(f"Searching Pexels for query: '{query}', lang: {language}")
    image_urls = []
    if not pixel_key:
        logging.error("PEXELS_API_KEY not set. Cannot search stock images.")
        return image_urls
    try:
        headers = {"Authorization": pixel_key}
        # Pexels uses 'locale' not 'language'
        params = {"query": query, "per_page": num_images, "locale": language if language != "en" else "en-US"} # Pexels locale format
        response = requests.get("https://api.pexels.com/v1/search", headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        photos = data.get("photos", [])
        if photos:
            image_urls = [p.get("src", {}).get("original") or p.get("src", {}).get("large")
                          for p in photos if p.get("src")]
            image_urls = [url for url in image_urls if url] # Filter out None URLs
        else:
            logging.warning(f"No Pexels images found for query: '{query}'")
    except RequestException as e:
        logging.error(f"Network error searching Pexels for '{query}': {e}")
    except Exception as e:
        logging.error(f"Exception during Pexels search for '{query}': {e}", exc_info=True)
    logging.info(f"Found {len(image_urls)} Pexels image URL(s) for '{query}'")
    return image_urls

def download_image(image_url: str, output_filepath: str) -> bool:
    """Downloads a single image from URL."""
    logging.info(f"Downloading image: {image_url} -> {os.path.basename(output_filepath)}")
    try:
        response = requests.get(image_url, stream=True, timeout=30)
        response.raise_for_status()
        content_type = response.headers.get('content-type', '').lower()
        if not content_type.startswith('image/'):
            logging.warning(f"URL not an image (Content-Type: {content_type}): {image_url}")
            return False
        with open(output_filepath, 'wb') as f:
            response.raw.decode_content = True
            shutil.copyfileobj(response.raw, f)
        if os.path.exists(output_filepath) and os.path.getsize(output_filepath) > 100:
             logging.info(f"Successfully downloaded image: {os.path.basename(output_filepath)}")
             return True
        else:
             logging.error(f"Download empty/failed: {os.path.basename(output_filepath)}")
             if os.path.exists(output_filepath): os.remove(output_filepath)
             return False
    except RequestException as e:
        logging.error(f"Network error downloading {image_url}: {e}")
        return False
    except Exception as e:
        logging.error(f"Exception downloading {image_url}: {e}", exc_info=True)
        if os.path.exists(output_filepath):
             try: os.remove(output_filepath)
             except OSError: pass
        return False

# --- Worker Function ---
def fetch_or_generate_image(query: str, use_ai: bool, language: str, output_dir: str) -> str | None:
    """Worker: gets AI or stock image, returns GCS URL or None."""
    unique_id = uuid.uuid4()
    file_extension = ".png" if use_ai else ".jpg"
    safe_query_part = "".join(filter(str.isalnum, query.split()[:5]))[:30]
    filename = f"{safe_query_part}_{unique_id}{file_extension}"
    output_filepath = os.path.join(output_dir, filename)

    if use_ai:
        gcs_url = generate_ai_image(prompt=query, output_filepath=output_filepath)
        return gcs_url
    else:
        image_urls = search_stock_images(query, num_images=1, language=language)
        if image_urls:
            success = download_image(image_urls[0], output_filepath=output_filepath)
            if success:
                # Upload to GCS
                gcs_url = upload_to_gcs(output_filepath, filename)
                try:
                    os.remove(output_filepath)
                except OSError:
                    pass
                return gcs_url
            else:
                logging.warning(f"Download failed for stock image: {image_urls[0]}")
        else:
            logging.warning(f"No stock URL for query '{query}', cannot download.")
    # Error logged within generate/download functions
    logging.error(f"Failed to obtain final image for query: '{query[:50]}...' (use_ai={use_ai})")
    if os.path.exists(output_filepath): # Cleanup just in case
        try: os.remove(output_filepath)
        except OSError: pass
    return None

# --- Main Orchestrator Function ---
def generate_images_for_prompts(
    image_prompts: list[str],
    use_ai_flags: list[bool],
    language: str = "en",
    max_workers: int = 5,
    fallback_image_path: str | None = None
) -> list[str | None]:
    """Generates/fetches images in parallel for a list of prompts."""
    # (Code remains the same as previous correct version)
    if len(image_prompts) != len(use_ai_flags):
        logging.error("Mismatched lengths for image_prompts and use_ai_flags.")
        raise ValueError("Length of image_prompts and use_ai_flags must match.")

    image_filepaths_ordered: list[str | None] = [None] * len(image_prompts)
    logging.info(f"Starting image processing for {len(image_prompts)} prompts (max_workers={max_workers}).")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_index = {
            executor.submit(fetch_or_generate_image, prompt, use_ai, language, IMAGE_TEMP_DIR): idx
            for idx, (prompt, use_ai) in enumerate(zip(image_prompts, use_ai_flags))
        }

        processed_count = 0
        for future in as_completed(future_to_index):
            idx = future_to_index[future]
            prompt = image_prompts[idx]
            try:
                result_path = future.result()
                image_filepaths_ordered[idx] = result_path if result_path else fallback_image_path
                if result_path:
                    logging.debug(f"Success for prompt index {idx} ('{prompt[:30]}...') -> {os.path.basename(result_path)}")
                else:
                    logging.warning(f"Using fallback for prompt index {idx} ('{prompt[:30]}...')")
            except Exception as e:
                logging.error(f"Exception from future for prompt index {idx} ('{prompt[:30]}...'): {e}", exc_info=True)
                image_filepaths_ordered[idx] = fallback_image_path # Apply fallback on exception
            processed_count += 1
            logging.info(f"Processed {processed_count}/{len(image_prompts)} image tasks.")


    # Final validation pass (accept GCS URLs as valid)
    final_paths = []
    valid_count = 0
    fallback_count = 0
    failed_count = 0
    for i, path in enumerate(image_filepaths_ordered):
        current_path = path
        # Accept GCS URLs as valid
        if current_path and isinstance(current_path, str) and current_path.startswith("https://storage.googleapis.com/"):
            final_paths.append(current_path)
            valid_count += 1
        # Accept valid local fallback image
        elif fallback_image_path and isinstance(fallback_image_path, str) and os.path.exists(fallback_image_path) and os.path.getsize(fallback_image_path) > 100:
            final_paths.append(fallback_image_path)
            fallback_count += 1
            logging.warning(f"Using fallback for image index {i} (Prompt: '{image_prompts[i][:30]}...')")
        else:
            final_paths.append(None)
            failed_count += 1
            logging.error(f"Fallback image path '{fallback_image_path}' is invalid or missing for index {i}.")

    logging.info(f"Image processing complete. Valid: {valid_count}. Used Fallback: {fallback_count}. Failed (None): {failed_count}.")
    return final_paths
