import os, re
import logging
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
from utils.image_generation import generate_images_for_prompts
from utils.audio_generation import generate_tts_audio_with_timing
# from utils.image_generation import generate_images_for_prompts
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

app = Flask(__name__)



# --- 3. Audio Generation ---
def generate_tts_audio(script_text: str, language_code: str = "en-US", output_path: str = "audio.mp3"):
    """Generate audio from script using Google Cloud Text-to-Speech API."""
    pass

# --- 4. Video Assembly ---
def assemble_video(image_paths: list, audio_path: str, script_parts: list, language: str = "en", output_path: str = "video.mp4"):
    """Combine images, audio, and text overlays into a video using MoviePy."""
    pass

def generate_video_thumbnail(video_path: str, output_path: str):
    """Create a thumbnail image for the video."""
    pass

# --- 5. Postprocessing ---
def cleanup_temp_files(paths: list):
    """Remove temporary files after video creation."""
    pass

def upload_video_to_storage(video_path: str):
    """Upload the final video to cloud storage or return a download link."""
    pass

# Video Generation Pipeline
def generate_video_pipeline(summary_text, image_queries, use_ai_flags, language="en", category="business"):
    script, script_parts, image_prompts = generate_script_and_image_prompts(summary_text, language, category)
    # image_paths = generate_images(use_ai_flags, image_queries, language=language)
    # audio_path = generate_tts_audio(script, language_code=language, output_path="audio.mp3")
    # video_path = assemble_video(image_paths, audio_path, script_parts, language=language, output_path="video.mp4")
    # thumbnail_path = generate_video_thumbnail(video_path, output_path="thumbnail.png")
    # cleanup_temp_files(image_paths + [audio_path])
    # video_url = upload_video_to_storage(video_path)
    # return {
    #     "video_url": video_url,
    #     "thumbnail_path": thumbnail_path
    # }

    return {
        "script": script,
        "script_parts": script_parts,
        "image_prompts": image_prompts,
    }

# --- Flask API Router ---

@app.route('/generate_script', methods=['POST'])
def uploads():
    category = request.form.get("category")
    summary_text = request.form.get("summary_text")
    language = request.form.get("language", "en")

    if not summary_text or not category or not language:
        return jsonify({
            "error": "Missing summary_text, category, or language"
        }), 400
    
    # Call your existing function
    result = generate_video_pipeline(summary_text, category, language)

    # Return JSON directly
    return jsonify(result)


@app.route('/generate_images', methods=['POST'])
def generate_images_api():

    data = request.get_json()
    image_prompts = data.get("image_queries") # Match key from Postman
    use_ai_flags = data.get("use_ai_flags")
    language = data.get("language", "en")
    # Add fallback image path from config or default
    fallback_img_path = os.getenv("FALLBACK_IMAGE_PATH", "path/to/default_placeholder.png") # Provide a default path

    # Basic Input Validation
    if not isinstance(image_prompts, list) or not isinstance(use_ai_flags, list):
        return jsonify({"error": "image_queries and use_ai_flags must be lists."}), 400
    if len(image_prompts) != len(use_ai_flags):
         return jsonify({"error": "image_queries and use_ai_flags must have the same length."}), 400
    if not all(isinstance(p, str) for p in image_prompts):
         return jsonify({"error": "image_queries must contain only strings."}), 400
    if not all(isinstance(f, bool) for f in use_ai_flags):
         return jsonify({"error": "use_ai_flags must contain only booleans."}), 400

        # Call the main orchestrator function
    result_paths = generate_images_for_prompts(
        image_prompts=image_prompts,
        use_ai_flags=use_ai_flags,
        language=language,
        fallback_image_path=fallback_img_path
    )

    # Return the full list including None/fallbacks
    return jsonify(result_paths)

@app.route('/generate_audio', methods=['POST'])
def generate_audio_api():

    data = request.get_json()
    summary_text = data.get("summary_text") # Match key from Postman
    language = data.get("language", "en-IN")

        # Call the main orchestrator function
    result_paths = generate_tts_audio_with_timing(
        script_text=summary_text,
        language_code=language,
    )

    # Return the full list including None/fallbacks
    return jsonify(result_paths)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, threaded=True)