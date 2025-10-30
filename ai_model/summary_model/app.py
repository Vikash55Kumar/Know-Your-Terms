import os
from flask import Flask, jsonify, render_template, request
from concurrent.futures import ThreadPoolExecutor, as_completed

from utils.model import llm, category_templates
from utils.rag_utils import predict_law_from_doc, verify_laws, build_verified_context
from utils.indiankanoon_utils import verify_with_indiankanoon
import re

app = Flask(__name__)

# Initialize a ThreadPoolExecutor for concurrent tasks outside of the request handling
# Max workers set to a reasonable number (e.g., 4) to handle both short and long doc cases.
# We will use this executor for both the short document verification AND the long document chunking.
# NOTE: Using a global executor is fine for Flask/Threaded environments, but for higher-scale
# production (like WSGI/Gunicorn), you might need a different approach (e.g., async/await).
executor = ThreadPoolExecutor(max_workers=4) 


def detect_language(text):
    """Detect whether the text is Hindi or English based on script characters."""
    
    hindi_chars = re.findall(r'[\u0900-\u097F]', text)
    return "hindi" if len(hindi_chars) > len(text) * 0.2 else "english"



def chunk_text(text, chunk_size=4000, overlap=200):
    
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


# ---------------------- SINGLE CHUNK SUMMARIZER ----------------------
def summarize_chunk(i, chunk, total, template_text, lang):
    
    strict_prompt = f"""
You are a professional and precise document summarizer trained to produce highly structured, human-readable summaries.

YOUR OBJECTIVE:
Summarize the document chunk below clearly and completely using the given format. 
The goal is to make the summary easy for non-experts to understand while preserving accuracy, structure, and professionalism.

RULES:
1. Follow the exact same structure, spacing, emojis, punctuation, and placeholders from the provided format.
2. Do NOT remove, rename, or reorder any label, header, or section.
3. Replace every "........." placeholder with accurate, well-phrased, and complete information from the document.
4. Keep the {template_text} structure 100% intact — all headers and emojis must remain.
5. Each section (like Description, Verified Info, Notes, Recommendation, etc.) should contain **clear, simple explanations** that help the user understand what the document means, why it matters, and what actions or risks are mentioned.
6. The summary must be **comprehensive, professional, and detailed** — not minimal or generic.
7. Use **plain and understandable language**, even for legal or financial terms. Explain complex points briefly inside parentheses.

8. Language Handling:
    - Automatically detect the document language.
    - If the document or chunk is in Hindi (Devanagari script), produce the ENTIRE summary in Hindi.
    - Translate all headings, labels, and placeholders (e.g., Document Name → दस्तावेज़ का नाम, Date → तिथि, Recommendation → सिफ़ारिशें).
    - Keep acts, act numbers, and categories in English.
    - If in English, generate the summary in English.

9. Do **not** include any explanations, introductions, or text outside the structured format.
10. Return **only** the filled summary in the defined structure — nothing else.

Verification Status :  Verified using Indian Legal Database (Pinecone)
Verified Acts Fetched : [Automatically from DB if found]
Verified By : Third-Party Legal RAG Engine (Pinecone + Gemini + indiankanoon)

 FORMAT TO FOLLOW:
{template_text}

 DOCUMENT TEXT (PART {i}/{total}):
{chunk}
"""

    if lang == "hindi":
        strict_prompt += """
 The input document is in Hindi — output the ENTIRE summary in Hindi.
Translate all headings, labels, and explanatory sentences.
Keep Act names and section numbers in English.
"""

    response = llm.invoke(strict_prompt)
    return response.content.strip()



@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


@app.route("/summarize", methods=["POST"])
def summarize():
    category = request.form.get("category", "").strip().lower()
    doc_text = request.form.get("document_text", "").strip()
    doc_text = " ".join(doc_text.split())

    
    lang = detect_language(doc_text)

    template_text = category_templates.get(category, "{text}")

    #
    if len(doc_text) < 3500:
        
       
        predicted_text = predict_law_from_doc(doc_text)
        predicted_act = predicted_text.split("Act Name:")[-1].split("\n")[0].strip() if "Act Name:" in predicted_text else ""
        predicted_category = predicted_text.split("Category:")[-1].split("\n")[0].strip() if "Category:" in predicted_text else ""

        
        future_laws = executor.submit(verify_laws, predicted_act, predicted_category)
        future_kanoon = executor.submit(verify_with_indiankanoon, predicted_act, predicted_category)
        
        
        verified_laws = future_laws.result()
        indiankanoon_cases = future_kanoon.result()
        
        
        verification_status = (
            " No external verification found — analyzed using Gemini’s internal reasoning."
            if not verified_laws and not indiankanoon_cases
            else " Verified using Indian Legal Database (Pinecone + IndianKanoon)"
        )

        verified_prompt = build_verified_context(doc_text, template_text, predicted_text, verified_laws)

        if indiankanoon_cases:
            verified_prompt += "\n\nThird-Party Legal Verification (IndianKanoon):\n"
            for case in indiankanoon_cases:
                verified_prompt += f"- {case['title']} ({case['citation']}) → {case['link']}\n"

        verified_prompt += f"\n\nVerification Status: {verification_status}\n"

        
        if lang == "hindi":
            verified_prompt += """
 The input document is in Hindi — output the ENTIRE summary in Hindi.
Translate all headings, labels, and explanatory sentences.
Keep Act names and section numbers in English.
"""

       
        response = llm.invoke(verified_prompt)
        summary_text = response.content.strip()

        return jsonify({"summary": summary_text})

   
    chunks = chunk_text(doc_text)
    summaries = []

    
    futures = [
        executor.submit(summarize_chunk, i + 1, chunk, len(chunks), template_text, lang)
        for i, chunk in enumerate(chunks)
    ]
    for future in as_completed(futures):
        summaries.append(future.result())

    combined_summaries = "\n\n".join(summaries)

    merge_prompt = f"""
You are a summarization expert.
Combine the following part-wise summaries into ONE cohesive, non-repetitive summary 
that strictly follows the same format and structure as below.

FORMAT TO FOLLOW:
{template_text}

PART-WISE SUMMARIES:
{combined_summaries}
"""

    
    if lang == "hindi":
        merge_prompt += """
 The document is in Hindi — translate the ENTIRE final summary into Hindi,
including all headings, labels, and explanations.
Keep Act names and section numbers in English.
"""

    final_response = llm.invoke(merge_prompt)
    summary_text = final_response.content.strip()

    return jsonify({"summary": summary_text})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, threaded=True)