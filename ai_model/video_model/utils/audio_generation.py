# --- audio_generation_rest.py ---

import os
import re
import logging
import tempfile
import uuid
import requests # Use requests library for direct API calls
import json
from google.auth.transport.requests import Request
from google.oauth2 import service_account # For authentication

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(funcName)s] - %(message)s')

AUDIO_TEMP_DIR = os.path.join(tempfile.gettempdir(), f"know_your_terms_audio_{uuid.uuid4().hex[:6]}")
try:
    os.makedirs(AUDIO_TEMP_DIR, exist_ok=True)
    logging.info(f"Using temp directory for audio: {AUDIO_TEMP_DIR}")
except OSError as e:
    logging.critical(f"FATAL: Could not create audio temp directory {AUDIO_TEMP_DIR}: {e}")
    AUDIO_TEMP_DIR = "."

SERVICE_ACCOUNT_CREDENTIALS = os.getenv("SERVICE_ACCOUNT_CREDENTIALS")
if SERVICE_ACCOUNT_CREDENTIALS:
    os.environ["SERVICE_ACCOUNT_CREDENTIALS"] = SERVICE_ACCOUNT_CREDENTIALS

SERVICE_ACCOUNT_FILE = os.getenv("SERVICE_ACCOUNT_CREDENTIALS")

SCOPES = ['https://www.googleapis.com/auth/cloud-platform']
credentials = None

if SERVICE_ACCOUNT_FILE and os.path.exists(SERVICE_ACCOUNT_FILE):
    try:
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )
        logging.info(f"Service account credentials loaded successfully from {SERVICE_ACCOUNT_FILE} for REST API.")
    except Exception as e:
        logging.critical(f"FATAL: Failed to load service account credentials from {SERVICE_ACCOUNT_FILE}: {e}")
        credentials = None
else:
    logging.critical("FATAL: SERVICE_ACCOUNT_CREDENTIALS environment variable not set or file does not exist.")
    credentials = None

# --- Main TTS Function using REST API ---
def generate_tts_audio_with_timing(
    script_text: str,
    language_code: str = "en-IN",
    preferred_voice_name: str | None = None,
    output_filename_base: str = "summary_audio"
) -> tuple[str | None, list[tuple[str, float, float]] | None]:
    """
    Generates audio and word timings using the Google Cloud TTS REST API v1.
    """
    if not credentials:
        logging.error("Google Cloud credentials not available. Cannot make REST API call.")
        return None, None
    if not script_text or not script_text.strip():
        logging.error("Cannot generate audio from empty script text.")
        return None, None

    script_text = re.sub(r'\s+', ' ', script_text).strip()
    logging.info(f"Requesting TTS audio via REST for language: {language_code}")

    # --- Construct REST API Request Body (JSON) ---
    # Expect script_text to be valid SSML with <mark name="..."/> tags
    request_body = {
        "input": { "ssml": script_text },
        "voice": { "languageCode": language_code, "ssmlGender": "FEMALE" },
        "audioConfig": { "audioEncoding": "MP3" },
        "enableTimePointing": ["SSML_MARK"]
    }
    # Clean up optional parameters if not set
    if preferred_voice_name and language_code in preferred_voice_name:
        request_body["voice"]["name"] = preferred_voice_name
        logging.info(f"Using preferred voice: {preferred_voice_name}")
    else:
        request_body["voice"]["ssmlGender"] = "NEUTRAL"
        logging.info(f"Using default NEUTRAL voice for language {language_code}.")

    # --- Prepare for API Call ---
    credentials.refresh(Request())
    auth_token = credentials.token
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    rest_api_url = "https://texttospeech.googleapis.com/v1beta1/text:synthesize"

    # --- Generate Unique Filename ---
    unique_id = uuid.uuid4().hex[:8]
    output_filename = f"{output_filename_base}_{language_code}_{unique_id}.mp3"
    audio_filepath = os.path.join(AUDIO_TEMP_DIR, output_filename)

    try:
        # --- Make the REST API Call ---
        logging.debug(f"Sending POST request to {rest_api_url}")
        response = requests.post(rest_api_url, headers=headers, json=request_body, timeout=60)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        response_data = response.json()

        # --- Decode Audio Content (Base64) ---
        import base64
        audio_content_base64 = response_data.get("audioContent")
        if not audio_content_base64:
            logging.error("API response did not contain audioContent.")
            return None, None

        audio_bytes = base64.b64decode(audio_content_base64)

        # --- Save the Audio File ---
        with open(audio_filepath, "wb") as out:
            out.write(audio_bytes)
        if not os.path.exists(audio_filepath) or os.path.getsize(audio_filepath) == 0:
            logging.error(f"Failed to write audio content to file: {audio_filepath}")
            return None, None
        logging.info(f'Audio content written successfully to "{os.path.basename(audio_filepath)}"')

        # --- Optionally copy audio file to user-accessible directory for testing ---
        # Set this to your desired accessible directory
        accessible_dir = os.path.join(os.path.dirname(__file__), "..", "test_audio")
        try:
            os.makedirs(accessible_dir, exist_ok=True)
            accessible_path = os.path.join(accessible_dir, os.path.basename(audio_filepath))
            import shutil
            shutil.copy2(audio_filepath, accessible_path)
            logging.info(f'Audio file also copied to: {accessible_path}')
        except Exception as copy_err:
            logging.warning(f"Could not copy audio file to accessible directory: {copy_err}")

        # --- Process Timings (from REST response structure) ---
        mark_timings = []
        timepoints_data = response_data.get("timepoints")
        if timepoints_data:
            # Extract <mark name="..."/> tags from SSML
            mark_names = re.findall(r'<mark name=["\'](.*?)["\']\s*/>', script_text)
            num_marks = len(mark_names)
            num_timepoints = len(timepoints_data)

            if num_marks == num_timepoints:
                for i, point in enumerate(timepoints_data):
                    mark = mark_names[i]
                    time_sec = float(point.get("timeSeconds", 0.0))
                    mark_timings.append((mark, time_sec))
                logging.info(f"Successfully extracted {len(mark_timings)} SSML mark timings via REST.")
            else:
                logging.error(f"CRITICAL TIMING MISMATCH (REST): Marks ({num_marks}) vs Timepoints ({num_timepoints}). Cannot reliably generate mark timings.")
                return audio_filepath, None # Return audio path but None for timings
        else:
            logging.warning("REST API response did not return timepoints despite request.")
            mark_timings = None

        return audio_filepath, mark_timings

    except requests.exceptions.HTTPError as http_err:
        logging.error(f"HTTP error occurred during TTS REST call: {http_err} - {http_err.response.text}")
        return None, None
    except requests.exceptions.RequestException as req_err:
        logging.error(f"Request error occurred during TTS REST call: {req_err}")
        return None, None
    except Exception as e:
        logging.error(f"Unexpected error during TTS REST generation: {e}", exc_info=True)
        if os.path.exists(audio_filepath):
             try: os.remove(audio_filepath)
             except OSError: pass
        return None, None

# --- (Example Usage remains similar, just call this function instead) ---