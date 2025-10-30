import os
from flask import Flask, jsonify, render_template, request
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
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
import time
import multiprocessing
executor = ThreadPoolExecutor(max_workers=min(8, (multiprocessing.cpu_count() or 4)))  # Use CPU count for optimal parallelism


def clean_llm_response(text: str) -> str:
    """Clean LLM output by removing surrounding code fences like ```json and stray backticks.

    This extracts the content inside the first pair of triple backticks if present
    (and removes an optional language token like `json`), otherwise strips
    single-backtick wrappers and whitespace.
    """
    if not text:
        return text

    s = text.strip()

    # If there are fenced blocks, extract the content inside the first pair
    if "```" in s:
        first = s.find("```")
        last = s.rfind("```")
        if first != -1 and last != -1 and last > first:
            inner = s[first + 3:last]
            # Remove optional language token on the first line (e.g., json) and leading newline
            inner = re.sub(r'^\s*[a-zA-Z0-9_+-]+\s*\n', '', inner)
            return inner.strip()

    # If wrapped in single backticks, remove them
    if s.startswith("`") and s.endswith("`"):
        return s.strip("`").strip()

    return s


def detect_language(text):
    """Detect whether the text is Hindi or English based on script characters."""
    
    hindi_chars = re.findall(r'[\u0900-\u097F]', text)
    return "hindi" if len(hindi_chars) > len(text) * 0.2 else "english"

def chunk_text(text, chunk_size=6000, overlap=200):  # Increased chunk size for fewer chunks
    
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
        1. Output ONLY valid JSON. No markdown, no extra text, no explanations.
        2. If you do not return valid JSON, your output will be rejected and not used.
        3. Follow the exact same structure, spacing, emojis, punctuation, and placeholders from the provided format.
        4. Do NOT remove, rename, or reorder any label, header, or section.
        5. Replace every "........." placeholder with accurate, well-phrased, and complete information from the document.
        6. Keep the {template_text} structure 100% intact — all headers and emojis must remain.
        7. Each section (like Description, Verified Info, Notes, Recommendation, etc.) should contain **clear, simple explanations** that help the user understand what the document means, why it matters, and what actions or risks are mentioned.
        8. The summary must be **comprehensive, professional, and detailed** — not minimal or generic.
        9. Use **plain and understandable language**, even for legal or financial terms. Explain complex points briefly inside parentheses.

        10. Language Handling:
            - Automatically detect the document language.
            - If the document or chunk is in Hindi (Devanagari script), produce the ENTIRE summary in Hindi.
            - Translate all headings, labels, and placeholders (e.g., Document Name → दस्तावेज़ का नाम, Date → तिथि, Recommendation → सिफ़ारिशें).
            - Keep acts, act numbers, and categories in English.
            - If in English, generate the summary in English.

        11. Do **not** include any explanations, introductions, or text outside the structured format.
        12. Return **only** the filled summary in the defined structure — nothing else.

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
    return clean_llm_response(response.content)

@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")

@app.route("/active", methods=["GET"])
def active():
    return "active"

@app.route("/summarize", methods=["POST"])
def summarize():
    category = request.form.get("category", "").strip().lower()
    doc_text = request.form.get("document_text", "").strip()
    # Normalize whitespace (replace multiple spaces/newlines/tabs with single space)
    doc_text = re.sub(r"\s+", " ", doc_text)

    lang = detect_language(doc_text)

    template_text = category_templates.get(category, "{text}")

    start_total = time.time()
    if not doc_text:
        return jsonify({"error": "Empty document_text"}), 400

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
            verified_prompt += (
                "\nThe input document is in Hindi — output the ENTIRE summary in Hindi.\n"
                "Translate all headings, labels, and explanatory sentences.\n"
                "Keep Act names and section numbers in English.\n"
            )
        start_llm = time.time()
        response = llm.invoke(verified_prompt)
        summary_text = clean_llm_response(response.content)
        end_llm = time.time()
        print(f"[TIMING] Short doc LLM call: {end_llm - start_llm:.2f} seconds")
        print(f"[TIMING] Total short doc: {end_llm - start_total:.2f} seconds")
        return summary_text, 200, {'Content-Type': 'application/json; charset=utf-8'}

    start_chunking = time.time()
    chunks = chunk_text(doc_text)
    print(f"[TIMING] Number of chunks: {len(chunks)}")
    start_parallel = time.time()
    futures = [
        executor.submit(summarize_chunk, i + 1, chunk, len(chunks), template_text, lang)
        for i, chunk in enumerate(chunks)
    ]
    # Collect results in order for better merging and less overhead
    summaries = [f.result() for f in futures]
    end_parallel = time.time()
    print(f"[TIMING] Parallel chunk summarization: {end_parallel - start_parallel:.2f} seconds")

    combined_summaries = "\n\n".join(summaries)

    merge_prompt = f"""
        You are a professional legal document summarizer.
        Your output MUST be a JSON array containing a single object with a 'DocumentSummary' key, whose value is an object matching the structure below. The 'Category' field must be correct for the document type. Do NOT change key names, add, or remove keys. Do NOT flatten or merge keys. Do NOT add any extra text, explanations, or markdown. If you do not follow this structure, your output will be rejected.

        Example output:
        {{
            "DocumentSummary": {{
                "Category": "Business",
                "Header": {{
                    "Document_Name": "",
                    "Document_Type": "",
                    "Purpose": "",
                    "Date": "",
                    "Jurisdiction": ""
                }},
                "Parties_Involved": {{
                    "Party_1": "",
                    "Party_2": "",
                    "Relationship": "",
                    "Key_Obligations": ""
                }},
                "Overview": "2–3 lines summarizing document purpose, involved companies, and business intent.",
                "Key_Terms": {{
                    "Payment_Terms": "",
                    "Deliverables": "",
                    "Confidentiality": "",
                    "Termination": "",
                    "Jurisdiction_Dispute_Resolution": ""
                }},
                "Applicable_Laws_and_Acts": {{
                    "Explicit_Acts": [
                        {{"Act": "Indian Contract Act, 1872", "Section": "10", "Relevance": "Essentials of valid contract."}},
                        {{"Act": "Companies Act, 2013", "Section": "2(20)", "Relevance": "Defines company structure."}}
                    ],
                    "Implicit_Acts": [
                        {{"Act": "Information Technology Act, 2000", "Reason": "Covers digital and data protection terms."}}
                    ]
                }},
                "Risk_and_Compliance": [
                    {{"Issue": "Ambiguous payment timeline.", "Recommendation": "Add penalty clause for delays."}},
                    {{"Issue": "Missing dispute resolution.", "Recommendation": "Add arbitration clause under Arbitration Act, 1996."}}
                ],
                "Confidence_and_Risk_Score": {{
                    "Confidence": "94%",
                    "Risk_Level": "Low",
                    "Document_Clarity": "Clear"
                }},
                "Recommendations": [
                    "Include SLA or penalty terms for deliverables.",
                    "Clarify IP ownership and termination obligations.",
                    "Add data protection clause as per IT Act, 2000."
                ],
                "Simple_Summary": "3–4 sentence summary explaining business intent, obligations, and what to verify before signing."
            }}
        }}

        Instructions:
        - Output ONLY valid JSON as shown above. No markdown, no extra text, no explanations, no headings outside JSON.
        - Do NOT change key names, add, or remove keys.
        - Do NOT flatten or merge keys.
        - Use professional tone and Indian legal context.
        - If you do not follow this structure, your output will be rejected.

        PART-WISE SUMMARIES:
        {combined_summaries}
    """

    if lang == "hindi":
        merge_prompt += """
        The document is in Hindi — translate the ENTIRE final summary into Hindi,
        including all headings, labels, and explanations.
        Keep Act names and section numbers in English.
        """

    start_merge = time.time()
    final_response = llm.invoke(merge_prompt)
    summary_text = clean_llm_response(final_response.content)
    end_merge = time.time()
    end_total = time.time()
    print(f"[TIMING] Merge LLM call: {end_merge - start_merge:.2f} seconds")
    print(f"[TIMING] Total long doc: {end_total - start_total:.2f} seconds")

    # return summary_text, 200, {'Content-Type': 'text/plain; charset=utf-8'}
    return summary_text, 200, {'Content-Type': 'application/json; charset=utf-8'}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, threaded=True)