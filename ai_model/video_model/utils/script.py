# --- script_generation.py ---
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


def create_script(summary_text: str, language: str = "en", category: str = "business") -> str | None:

    # Construct the optimized prompt
    prompt = f"""
    You are an expert explainer for Indian citizens and small business owners.

    **Target Audience:** Indian citizens and small business owners.
    **Language:** Generate the script in the exact same language as the Input Summary ({language}). Use simple, clear, conversational language. Avoid complex jargon. If technical terms are necessary, explain them briefly and simply.

    **Content Focus:**
    - Identify and clearly explain the most important clauses or points from the summary.
    - Highlight any aspects related to Indian law mentioned or implied in the summary, explaining their practical relevance to the audience.
    - Focus on practical implications for citizens or small businesses in India.

     **Structure & Format:**
     - Break the script down into 3 to 5 logical parts (e.g., Intro, Point 1, Point 2, Implications, Conclusion).
     - Use `---` (three hyphens on a new line) as a separator between each part.
     - Keep sentences and paragraphs short.

     **Tone:** Informal, helpful, and direct.

     **Output:** Provide only the refined script text in the specified part-by-part format, with `---` separators. Do not include any extra explanations or introductory text from yourself (the AI).

     Input Summary:
     {summary_text}
     """
     
    try:

        response = llm.invoke(prompt)

        # Extract script text from response
        script_text = getattr(response, "content", None) or getattr(response, "text", None)
        if not script_text or not script_text.strip():
            logging.warning("LLM returned empty script text.")
            return None

        # Remove markdown bold/italics etc. for cleaner TTS input
        refined_script = re.sub(r"[\*_]", "", script_text.strip())

        if not refined_script:
            logging.warning("Extracted script text is empty after cleaning.")
            return None

        logging.info("Script generated successfully.")
        return refined_script

    except Exception as e:
        logging.error(f"Exception during video script generation with Vertex AI: {e}", exc_info=True)
        return None # Indicate failure clearly

# --- 2. Refined Script Splitting ---
def split_script_parts(script: str) -> list[str]:
    """
    Splits the script into logical parts/scenes.
    Prefers '---' separator, falls back to grouping sentences.
    """
    if not script:
        return []
    try:
        # 1. Try splitting by explicit separator '---'
        if '\n---\n' in script:
            parts = [part.strip() for part in script.split('\n---\n') if part.strip()]
            if len(parts) > 1: # Check if separator actually split something
                 logging.info(f"Script split into {len(parts)} parts using '---' separator.")
                 return parts
            else:
                 logging.warning("Separator '---' found but did not result in multiple parts. Falling back.")

        # 2. Fallback: Split by sentences and group them
        # Note: Simple regex split might incorrectly split on abbreviations (Mr., Dr., etc.).
        # For a hackathon, this is often acceptable. For production, consider NLTK's sentence tokenizer.
        logging.info("Falling back to sentence splitting for script parts.")
        sentences = re.split(r'(?<=[.!?])\s+', script.strip()) # Split after sentence-ending punctuation + space
        sentences = [s.strip() for s in sentences if s.strip()] # Clean up

        if not sentences:
            return [script.strip()] # Return the whole script if sentence split fails

        group_size = 3 # Aim for roughly 3 sentences per part (adjust as needed)
        num_sentences = len(sentences)
        # Adjust group size slightly to avoid tiny last parts if possible
        if num_sentences > 4 and num_sentences % group_size == 1:
            group_size += 1

        parts = [' '.join(sentences[i:min(i + group_size, num_sentences)]).strip()
                 for i in range(0, num_sentences, group_size)]

        # Filter out any potentially empty parts again after joining
        parts = [p for p in parts if p]

        logging.info(f"Script split into {len(parts)} parts using sentence grouping (size ~{group_size}).")
        return parts

    except Exception as e:
        logging.error(f"Error splitting script into parts: {e}", exc_info=True)
        # Fallback to returning the whole script as one part
        return [script.strip()] if script else []

# --- 3. NEW: Generate Descriptive Image Prompts ---
def _generate_prompt_for_part(part_index: int, script_part: str, language: str, category: str, prompts_per_part: int, model=None) -> list[str]:
    """Helper function to generate prompts for a single script part."""
    style_hint = ""
    if category.lower() == "business":
        style_hint = "a professional, clean business setting, photorealistic style or clear illustration."
    elif category.lower() == "legal":
        style_hint = "a clear, modern legal illustration or symbolic graphic."
    elif category.lower() == "citizen":
        style_hint = "a relatable, everyday scene for an Indian citizen, clear illustration or photo."

    llm_prompt = f"""
    Analyze the following paragraph from a video script for Indian citizens/small businesses (category: {category}, language: {language}).
    Generate {prompts_per_part} distinct, highly descriptive, single-sentence image prompts (in English) that perfectly capture the essence and visual narrative of this segment. These prompts are for an AI image generation model (like Imagen).
    Focus on concrete objects, actions, simple diagrams, or symbolic graphics relevant to an Indian context.
    The graphic can include minimal, relevant text (like labels, in {language}) if it clarifies the concept, specify this in the prompt (e.g., 'diagram showing X labeled in {language}').
    Avoid abstract prompts. Ensure prompts are safe for generation.

    Target Audience: Indian small businesses/citizens.
    Style Preference: {style_hint}

    Video Segment {part_index+1}:
    ```
    {script_part}
    ```

    Image Generation Prompts (one per line, without numbers or bullet points):
    """
    try:
        if model is None:
            logging.error("No model provided for image prompt generation.")
            return []

        # Use the same llm.invoke(...) pattern used elsewhere (model is expected to be llm)
        response = model.invoke(llm_prompt)

        # Extract text safely from the AIMessage-like response
        generated_text = getattr(response, "content", None) or getattr(response, "text", None) or str(response)
        generated_prompts_raw = [line.strip() for line in generated_text.splitlines() if line.strip()]

        # Filter out short/invalid lines and keep descriptive prompts
        part_prompts = [p for p in generated_prompts_raw if len(p) > 10]

        if not part_prompts:
            logging.warning(f"LLM returned empty or too-short prompts for Part {part_index+1}. Raw: {generated_text!r}")
            return []

        logging.info(f"Generated prompts for Part {part_index+1}: {part_prompts[:prompts_per_part]}")
        return part_prompts[:prompts_per_part]

    except Exception as e:
        logging.error(f"Error generating descriptive prompts for Part {part_index+1}: {e}", exc_info=True)
        return []

def generate_image_prompts(
    script_parts: list[str],
    language: str = "en",
    category: str = "business",
    prompts_per_part: int = 1, # How many visual ideas per script part
    max_workers: int = 3 # Use fewer workers for LLM calls to avoid rate limits
) -> list[str]:
    """
    Uses an LLM (Gemini via llm.invoke) to generate descriptive image prompts for each script part in parallel.
    """
    all_image_prompts = [[] for _ in script_parts] # Initialize list of lists to maintain order

    # Use the existing llm instance (ChatVertexAI) instead of undefined 'client'
    model = llm
    logging.info(f"Starting image prompt generation for {len(script_parts)} script parts using up to {max_workers} workers.")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_index = {
            executor.submit(_generate_prompt_for_part, i, part, language, category, prompts_per_part, model): i
            for i, part in enumerate(script_parts)
        }

        for future in as_completed(future_to_index):
            idx = future_to_index[future]
            try:
                result_prompts = future.result()
                if result_prompts:
                    all_image_prompts[idx] = result_prompts
                else:
                    logging.warning(f"No prompts generated for part {idx+1}, adding fallback.")
                    all_image_prompts[idx] = [f"Abstract graphic representing {category} concept in India"]

            except Exception as e:
                logging.error(f"Exception processing image prompt future for Part {idx+1}: {e}", exc_info=True)
                all_image_prompts[idx] = [f"Abstract graphic representing {category} concept in India"]

    # Flatten the list of lists and deduplicate simply
    final_prompts = [prompt for part_prompts in all_image_prompts for prompt in part_prompts] # Flatten
    final_prompts = list(dict.fromkeys(final_prompts)) # Simple deduplication

    logging.info(f"Final descriptive image prompts ({len(final_prompts)}): {final_prompts}")
    return final_prompts


def generate_script_and_image_prompts(summary_text, language="en", category="business"):
    script = create_script(summary_text, language, category)
    if not script:
        logging.error("Pipeline failed: Script generation returned None.")
        return None, [], [] # Indicate failure

    script_parts = split_script_parts(script)
    if not script_parts:
         logging.error("Pipeline failed: Script splitting resulted in no parts.")
         return script, [], [] # Return script but indicate no parts/prompts

    # Generate descriptive image prompts based *on the final script parts*
    image_prompts = generate_image_prompts(script_parts, language, category, prompts_per_part=1) # Get 1 visual idea per part

    return script, script_parts, image_prompts
