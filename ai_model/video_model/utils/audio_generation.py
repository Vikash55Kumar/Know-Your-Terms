# --- audio_generation_rest.py ---

import os
import re
import logging
import tempfile
import uuid
import requests # Use requests library for direct API calls
import json
import base64
import shutil
from google.auth.transport.requests import Request
from google.oauth2 import service_account # For authentication
from requests.exceptions import HTTPError, RequestException

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(funcName)s] - %(message)s')

# --- Cleaned-up Credential Loading ---
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
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
else:
    logging.critical(f"FATAL: SERVICE_ACCOUNT_CREDENTIALS env var not set or file does not exist at path: {SERVICE_ACCOUNT_FILE}")


# --- Main TTS Function using REST API ---
def generate_tts_audio_with_timing(
    script_text: str,
    language_code: str = "en-IN",
    output_filename_base: str = "summary_audio"
) -> tuple[str | None, list[tuple[str, float]] | None]:
    """
    Generates audio and SSML mark timings using the Google Cloud TTS REST API v1beta1.
    Returns the path to the *temporary* audio file and a list of (mark_name, time_seconds) tuples.
    """
    if not credentials:
        logging.error("Google Cloud credentials not available. Cannot make REST API call.")
        return None, None
    if not script_text or not script_text.strip():
        logging.error("Cannot generate audio from empty script text.")
        return None, None

    logging.info(f"Requesting TTS audio via REST for language: {language_code}")

    # --- Construct REST API Request Body (JSON) ---
    request_body = {
        "input": { "ssml": script_text }, # Expecting SSML with <mark> tags
        "voice": { "languageCode": language_code },
        "audioConfig": { "audioEncoding": "MP3" },
        "enableTimePointing": ["SSML_MARK"]
    }
 
    # --- Optimized Voice Selection Logic ---
    # Set known good defaults based on language.
    if language_code in ["en-IN", "en"]:
        request_body["voice"]["name"] = "en-IN-Wavenet-A"
        request_body["voice"]["ssmlGender"] = "MALE"
        logging.info("Using default voice: en-IN-Wavenet-A (Male)")
    elif language_code in ["hi-IN", "hi"]:
        request_body["voice"]["name"] = "hi-IN-Wavenet-D"
        request_body["voice"]["ssmlGender"] = "MALE"
        logging.info("Using default voice: hi-IN-Wavenet-D (Male)")
    else:
        request_body["voice"]["ssmlGender"] = "NEUTRAL"
        logging.info(f"No specific default for {language_code}, letting API choose NEUTRAL.")
    # --- Prepare for API Call ---
    try:
        credentials.refresh(Request()) # Refresh token
    except Exception as auth_err:
        logging.error(f"Failed to refresh auth token: {auth_err}", exc_info=True)
        return None, None

    auth_token = credentials.token
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    rest_api_url = "https://texttospeech.googleapis.com/v1beta1/text:synthesize"

    # --- Generate Unique Filename in test_audio Directory ---
    unique_id = uuid.uuid4().hex[:8]
    output_filename = f"{output_filename_base}_{language_code}_{unique_id}.mp3"
    test_audio_dir = os.path.join(os.path.dirname(__file__), "..", "test_audio")
    test_audio_dir = os.path.abspath(test_audio_dir)
    try:
        os.makedirs(test_audio_dir, exist_ok=True)
    except Exception as dir_err:
        logging.error(f"Could not create test_audio directory: {dir_err}")
        test_audio_dir = os.path.dirname(__file__)
    audio_filepath = os.path.join(test_audio_dir, output_filename)

    try:
        # --- Make the REST API Call ---
        logging.debug(f"Sending POST request to {rest_api_url}")
        response = requests.post(rest_api_url, headers=headers, json=request_body, timeout=60)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        response_data = response.json()

        # --- Decode Audio Content (Base64) ---
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

        # --- Process Timings (from REST response structure) ---
        mark_timings = []
        timepoints_data = response_data.get("timepoints")
        if timepoints_data:
            mark_names = re.findall(r'<mark name=["\'](.*?)["\']\s*/>', script_text)
            num_marks = len(mark_names)
            num_timepoints = len(timepoints_data)

            if num_marks == num_timepoints:
                for i, point in enumerate(timepoints_data):
                    mark = mark_names[i]
                    time_sec = float(point.get("timeSeconds", 0.0))
                    mark_timings.append((mark, time_sec)) # Return (mark_name, time_in_seconds)
                logging.info(f"Successfully extracted {len(mark_timings)} SSML mark timings via REST.")
            else:
                logging.error(f"CRITICAL TIMING MISMATCH (REST): Marks ({num_marks}) vs Timepoints ({num_timepoints}).")
                return audio_filepath, None # Return audio path but None for timings
        else:
            logging.warning("REST API response did not return timepoints despite request.")
            mark_timings = None # Return None for timings

        # --- Return the AUTHORITATIVE temp path ---
        return audio_filepath, mark_timings

    except HTTPError as http_err:
        logging.error(f"HTTP error occurred during TTS REST call: {http_err} - {http_err.response.text}")
        return None, None
    except RequestException as req_err:
        logging.error(f"Request error occurred during TTS REST call: {req_err}")
        return None, None
    except Exception as e:
        logging.error(f"Unexpected error during TTS REST generation: {e}", exc_info=True)
        if os.path.exists(audio_filepath):
             try: os.remove(audio_filepath)
             except OSError: pass
        return None, None