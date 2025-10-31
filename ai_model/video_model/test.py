# summarizer.py
import os
import re
import requests
import json
import html
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
import vertexai
from langchain_google_vertexai import ChatVertexAI, HarmBlockThreshold, HarmCategory
from requests.exceptions import RequestException

load_dotenv()

vertex_key_path = os.getenv("VERTEX_AI_KEY")
indiankanoon_key = os.getenv("KANOON_API_KEY")

VERTEX_AI_CREDENTIALS = os.getenv("VERTEX_AI_CREDENTIALS")
if VERTEX_AI_CREDENTIALS:
    os.environ["VERTEX_AI_CREDENTIALS"] = VERTEX_AI_CREDENTIALS

GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if GOOGLE_APPLICATION_CREDENTIALS:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

print(os.environ["GOOGLE_APPLICATION_CREDENTIALS"])

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

prompt_template = PromptTemplate(
    input_variables=["text"],
    template=(
        "You are a legal and document summarization assistant.\n"
        "Summarize the following text clearly and concisely.\n"
        "Highlight only the key insights, legal acts, and outcomes.\n\n"
        "Text:\n{text}\n\n"
        "Summary:"
    )
)

input_text = """
Mahatma Gandhi was a leader in India's independence movement against British rule.
He promoted non-violence and civil disobedience, leading major movements like the Salt March.
He inspired global movements for peace and civil rights.
"""

formatted_prompt = prompt_template.format(text=input_text)


response = llm.invoke(formatted_prompt)


print("\nSummary:\n", response.content)

