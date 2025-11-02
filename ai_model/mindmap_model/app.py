# import warnings
# warnings.filterwarnings("ignore", category=FutureWarning)
# import os
# import json
# import re
# import logging
# import uuid # For generating unique node IDs
# from flask import Flask, request, jsonify
# from dotenv import load_dotenv

# # --- Core AI Libraries ---
# import vertexai
# from langchain_core.prompts import PromptTemplate
# from langchain_google_vertexai import ChatVertexAI, HarmBlockThreshold, HarmCategory

# # --- Configuration ---
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# load_dotenv()

# # ---------- Step 1: Initialize LLM Client ----------
# # (Note: These should ideally be set in your app.py, but including here for completeness)
# try:

#     PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
#     LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")

#     VERTEX_AI_CREDENTIALS = os.getenv("VERTEX_AI_CREDENTIALS")
#     if VERTEX_AI_CREDENTIALS:
#         os.environ["VERTEX_AI_CREDENTIALS"] = VERTEX_AI_CREDENTIALS

#     vertexai.init(project=PROJECT_ID, location=LOCATION)

#     safety_settings = {
#         HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE,
#         HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
#         HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
#         HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
#         HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
#     }

#     llm = ChatVertexAI(
#         model="gemini-2.5-flash",
#         temperature=0.3,
#         max_output_tokens=4048,
#         project=PROJECT_ID,
#         safety_settings=safety_settings
#     )

#     app = Flask(__name__)

#     logging.info("Vertex AI LLM Client initialized successfully.")

# except Exception as e:
#     logging.critical(f"Failed to initialize Vertex AI: {e}")
#     llm = None # Set to None to handle failure

# # ---------- Step 2: Generate Mind Map JSON from LLM ----------
# def generate_mindmap_json(llm_client, summary_text):
#     """
#     Takes a document summary and uses the LLM to generate a
#     hierarchical JSON structure for a mind map.
#     """
    
#     # This prompt is excellent. It guides the LLM to create the
#     # recursive structure we need.
#     mindmap_prompt_template = (
#         "The following is a comprehensive, structured JSON summary of a document.\n"
#         "Transform this summary STRICTLY into a single JSON object for a hierarchical mind map.\n"
#         "1. The root 'topic' should be the Document_Name.\n"
#         "2. Top-level 'subtopics' should correspond to the main keys in the input (e.g., 'Header', 'Parties_Involved', 'Clause_Insights').\n"
#         "3. **Ensure recursive nesting** using the 'subtopics' key for a deep, logical graph.\n"
#         "4. **Nodes must be short, conceptual phrases (max 5-7 words).**\n"
#         "5. If a section has simple key-value pairs (like 'Header'), turn those pairs into 'details'.\n"
#         "6. If a section has a list of objects (like 'Clause_Insights'), turn each object's 'Topic' into a 'name' for a new subtopic.\n"
#         "Use the following structure (do not include backticks or 'json' headers):\n"
#         "{{\n"
#         '  "topic": "Document Name Node",\n'
#         '  "subtopics": [\n'
#         '    {{"name": "Subtopic Level 1", "subtopics": [{{"name": "Subtopic Level 2", "details": ["Point 1", "Point 2"]}}]}},\n'
#         '    {{"name": "Another Subtopic", "details": ["Final Detail"]}}\n'
#         "  ]\n"
#         "}}\n\n"
#         "If the input summary is too simple or cannot be mapped, return a JSON with an 'error' key.\n"
#         "Structured Summary (Input):\n{text}"
#     )
    
#     prompt = PromptTemplate(
#         input_variables=["text"],
#         template=mindmap_prompt_template
#     )
    
#     formatted_prompt = prompt.format(text=summary_text)
    
#     logging.info("Generating mind map JSON from LLM...")
#     response = llm_client.invoke(formatted_prompt)
#     raw_output = response.content.strip()

#     # --- Robust JSON Cleaning ---
#     if raw_output.startswith("```"):
#         # Remove markdown fences (e.g., ```json ... ```)
#         raw_output = re.sub(r"^```[json]*\n", "", raw_output)
#         raw_output = re.sub(r"\n```$", "", raw_output)
        
#     raw_output = raw_output.strip()

#     try:
#         mindmap_data = json.loads(raw_output)
#         logging.info("Mind map JSON parsed successfully.")
#         return mindmap_data
#     except json.JSONDecodeError as e:
#         logging.error(f"Model output was not valid JSON. Error: {e}")
#         logging.error(f"--- Raw Output ---:\n{raw_output}")
#         return None

# # ---------- Step 3: Convert Hierarchical JSON to React Flow JSON ----------
# def convert_hierarchical_to_react_flow(hier_json):
#     """
#     Converts the hierarchical JSON from Gemini into the
#     flat 'nodes' and 'edges' format required by React Flow.
#     """
#     nodes = []
#     edges = []
    
#     # This helper function will recursively walk the tree
#     # and calculate positions for a simple tree layout.
#     def add_node(node_data, parent_id=None, x=0, y=0, level=0):
        
#         node_label = node_data.get("topic") or node_data.get("name")
#         if not node_label:
#             return y # Return current y position

#         node_id = f"rf-node-{uuid.uuid4().hex[:8]}"
        
#         # --- UI/UX Styling ---
#         is_root = (level == 0)
#         node_type = 'input' if is_root else 'default'
#         bg_color = '#f0ad4e' if is_root else '#5865F2' # Root node is orange
#         text_color = '#ffffff'
#         font_size = 20 if is_root else 14
        
#         nodes.append({
#             "id": node_id,
#             "data": { "label": node_label },
#             "position": { "x": x, "y": y },
#             "type": node_type,
#             "style": { 
#                 "background": bg_color, 
#                 "color": text_color, 
#                 "border": "1px solid #333",
#                 "padding": "10px",
#                 "fontSize": font_size
#             }
#         })
        
#         if parent_id:
#             edges.append({
#                 "id": f"rf-edge-{parent_id}-{node_id}",
#                 "source": parent_id,
#                 "target": node_id,
#                 "type": "smoothstep", # Curved line
#                 "markerEnd": { "type": "arrowclosed" } # Arrow at the end
#             })
        
#         # --- Layout Children ---
#         child_y_start = y + 100 # Vertical spacing
#         current_x = x - (len(node_data.get("subtopics", [])) * 125) # Simple horizontal spread

#         # RECURSIVE CALL for subtopics
#         for sub in node_data.get("subtopics", []):
#             child_y_start = add_node(sub, node_id, current_x, child_y_start, level + 1)
#             current_x += 250 # Space out siblings

#         # LEAF NODES for details
#         detail_y_start = child_y_start + 20
#         for det in node_data.get("details", []):
#             detail_label = str(det)
#             detail_id = f"rf-node-{uuid.uuid4().hex[:8]}"
            
#             nodes.append({
#                 "id": detail_id,
#                 "data": { "label": detail_label },
#                 "position": { "x": x, "y": detail_y_start }, # Stack details under parent
#                 "type": "output", # 'output' type for leaf nodes
#                 "style": { "background": "#99AAB5", "color": "#000", "fontSize": 10, "padding": 5 }
#             })
#             edges.append({
#                 "id": f"rf-edge-{node_id}-{detail_id}",
#                 "source": node_id,
#                 "target": detail_id,
#                 "type": "smoothstep",
#                 "markerEnd": { "type": "arrowclosed" }
#             })
#             detail_y_start += 50 # Stack details
        
#         # Return the 'bottom' y-coordinate of this branch
#         return max(child_y_start, detail_y_start)

#     # Start the recursive process from the root
#     add_node(hier_json)
    
#     return { "nodes": nodes, "edges": edges }

# # ---------- Step 4: Create Flask App and Endpoint ----------
# app = Flask(__name__)

# @app.route("/generate_mindmap", methods=['POST'])
# def generate_mindmap_api():

#     if not llm:
#         return jsonify({"error": "LLM client not initialized."}), 503 # Service Unavailable

#     # Get the raw JSON string from the request body
#     summary_json_str = request.data.decode('utf-8')
#     if not summary_json_str:
#         return jsonify({"error": "No summary data provided in request body."}), 400

#     # 1. Generate the hierarchical JSON from the summary
#     hier_json = generate_mindmap_json(llm, summary_json_str)
#     if not hier_json or "error" in hier_json:
#         logging.error("Failed to generate hierarchical JSON from LLM.")
#         return jsonify({"error": "Failed to generate mind map data from LLM."}), 500
    
#     # 2. Convert to React Flow format
#     try:
#         react_flow_data = convert_hierarchical_to_react_flow(hier_json)
#     except Exception as e:
#         logging.error(f"Failed to convert hierarchical JSON to React Flow format: {e}", exc_info=True)
#         return jsonify({"error": "Failed to process mind map structure."}), 500
        
#     # 3. Return the final JSON for React Flow
#     return jsonify(react_flow_data), 200

# # ---------- Main Execution (for local testing) ----------
# if __name__ == "__main__":
#     port = int(os.environ.get("PORT", "8080"))
#     app.run(host="0.0.0.0", port=port, debug=True)







import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
import os
import json
import re
import logging
import uuid # For generating unique node IDs
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# --- Core AI Libraries ---
import vertexai
from langchain_core.prompts import PromptTemplate
from langchain_google_vertexai import ChatVertexAI, HarmBlockThreshold, HarmCategory
from requests.exceptions import RequestException

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(funcName)s] - %(message)s')
load_dotenv()

# ---------- Step 1: Initialize LLM Client ----------
try:
    PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
    LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")

    VERTEX_AI_CREDENTIALS = os.getenv("VERTEX_AI_CREDENTIALS")
    if VERTEX_AI_CREDENTIALS:
        os.environ["VERTEX_AI_CREDENTIALS"] = VERTEX_AI_CREDENTIALS

    vertexai.init(project=PROJECT_ID, location=LOCATION)

    safety_settings = {
        HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    }

    llm = ChatVertexAI(
        model="gemini-2.5-flash",
        temperature=0.2,
        max_output_tokens=8148,
        project=PROJECT_ID,
        safety_settings=safety_settings
    )

except Exception as e:
    logging.critical(f"Failed to initialize Vertex AI: {e}", exc_info=True)
    llm = None

# --- *** NEW OPTIMIZED PROMPT GUIDELINES *** ---
COMMON_PROMPT_GUIDELINES = """
You are "Kanoon Mitra," an expert legal analyst and UI/UX designer.
Your task is to convert a complex 'DocumentSummary' JSON into a simple, hierarchical JSON tree for a mind map.
You MUST return ONLY a single, valid JSON object. Do NOT use markdown.
Your response MUST start with {{ and end with }}.

**Output JSON Schema:**
{{
  "id": "string (Unique ID, e.g., 'root')",
  "label": "string (A VERY SHORT, 2-4 word title for the node)",
  "details": "string (A **CONCISE 1-2 SENTENCE SUMMARY** max 10-15 words of the explanation. 'N/A' if none.)",
  "icon": "string (Icon name: 'document', 'law', 'people', 'risk_high', 'risk_low', 'check', 'money', 'time', 'info', 'recommendation', 'star')",
  "status": "string ('positive', 'negative', 'neutral', 'info')",
  "secondaryLabel": "string (Optional shorter text, e.g., '9/10' or 'Low Risk')",
  "children": [
    {{
      "id": "string",
      "label": "string (SHORT 2-4 word title)",
      "details": "string (CONCISE 1-2 SENTENCE SUMMARY)",
      "icon": "string",
      "status": "string",
      "secondaryLabel": "string",
      "children": [ ... ] // Recursive structure
    }}
  ]
}}

**Node Generation Rules (Critical):**
1.  **Root Node:** The 'Document_Name' must be the 'label' for the root node (id: 'root'). 'details' should be a 1-sentence summary of the 'Purpose'.
2.  **Hierarchy:** Create a logical hierarchy from the summary.
3.  **LABELS MUST BE SHORT:** The 'label' field MUST be a short, 2-4 word conceptual title (e.g., "Payment Terms", "Risk Level").
4.  **DETAILS MUST BE SUMMARIZED:** Put the long explanatory text from the input into the 'details' field, but you **MUST summarize it** into a concise, 1-2 sentence max 10-15 words explanation. Do not just copy the full long paragraph.
5.  **Informative Data:** Use the 'icon', 'status', and 'secondaryLabel' fields for at-a-glance context.
6.  **Language:** All text fields MUST be in the language of the input summary.
"""

# --- Category-Specific Prompt Templates ---
category_templates = {
    "business": f"""
    {COMMON_PROMPT_GUIDELINES}
    **Business Instructions:**
    - Create main branches for: 'Header', 'Parties Involved', 'Clause Insights', 'Key Terms', 'Applicable Laws', 'Risk & Compliance', and 'Recommendations'.
    - For 'Clause Insights', create a child node for each 'Topic'. The 'label' should be the 'Topic' (e.g., "Confidentiality"). The 'details' MUST be a **1-sentence summary** of the 'Explanation'.
    - For 'Applicable Laws', create a child node for each 'Act'. 'label' is the Act name, 'details' is a **1-sentence summary** of the 'Relevance'.
    - For 'Risk & Compliance', create child nodes for 'Confidence_Score', 'Risk_Level', and each 'Issue' in 'Potential_Issues'.
    - For 'Potential_Issues', the 'label' should be a **short summary** of the 'Issue' and the 'details' should be a **1-sentence summary** of the 'Recommendation'.
    - For 'Risk_Level: Low', set `status: 'positive'`, 'icon: 'risk_low'', 'secondaryLabel: 'Low''.
    - For 'Risk_Level: High', set `status: 'negative'`, 'icon: 'risk_high'', 'secondaryLabel: 'High''.
    
    **Input Summary (JSON):**
    {{text}}
    **Your Hierarchical JSON Output:**
    """,
    
    "citizen": f"""
    {COMMON_PROMPT_GUIDELINES}
    **Citizen Instructions:**
    - Create main branches for: 'Header', 'Parties Involved', 'Key Terms', 'Rights & Obligations', 'Applicable Laws', 'Validation Status', and 'Recommendations'.
    - For 'Key Terms', create child nodes for each key (e.g., 'Duration_or_Tenure'). 'label' is the key, 'details' is a **1-sentence summary** of the value.
    - For 'Risk_and_Compliance', create a main branch and child nodes for each 'Issue'. 'label' is a **short summary** of the 'Issue', 'details' is a **1-sentence summary** of the 'Recommendation'.
    
    **Input Summary (JSON):**
    {{text}}
    **Your Hierarchical JSON Output:**
    """,
    
    "student": f"""
    {COMMON_PROMPT_GUIDELINES}
    **Student Instructions:**
    - Create main branches for: 'Header', 'Parties Involved', 'Key Terms', 'Rights and Fairness', 'Applicable Laws', 'Risk & Compliance', and 'Recommendations'.
    - For 'Key Terms', create child nodes for each key (e.g., 'Stipend_or_Payment'). 'label' is the key, 'details' is a **1-sentence summary** of the value.
    - For 'Risk_and_Compliance', create a main branch and child nodes for each 'Issue'. 'label' is a **short summary** of the 'Issue', 'details' is a **1-sentence summary** of the 'Recommendation'.
    
    **Input Summary (JSON):**
    {{text}}
    **Your Hierarchical JSON Output:**
    """
}


# ---------- Step 2: Generate Mind Map Data from LLM ----------
def generate_mindmap_data(llm_client, summary_json_str: str, category: str) -> dict | None:
    """
    Takes a document summary JSON string and category, and uses the LLM
    to generate a HIERARCHICAL JSON structure.
    """
    
    prompt_template = category_templates.get(category.lower(), category_templates["citizen"])
    formatted_prompt = PromptTemplate(input_variables=["text"], template=prompt_template).format(text=summary_json_str)

    logging.info(f"Generating mind map data from LLM for category: {category}...")

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            response = llm_client.invoke(formatted_prompt)
            raw_output = response.content.strip()
        except Exception as e:
            logging.error(f"LLM invocation failed (attempt {attempt}): {e}", exc_info=True)
            if attempt == max_retries:
                return None
            continue

        # --- Robust JSON Cleaning ---
        if raw_output.startswith("```"):
            raw_output = re.sub(r"^```[json]*\n", "", raw_output, flags=re.MULTILINE)
            raw_output = re.sub(r"\n```$", "", raw_output, flags=re.MULTILINE)
        raw_output = raw_output.strip()

        try:
            raw_output = re.sub(r",\s*(\]|})", r"\1", raw_output) # Fix trailing commas
            mindmap_data = json.loads(raw_output)
            logging.info(f"Mind map JSON parsed successfully on attempt {attempt}.")
            if "label" not in mindmap_data:
                logging.error(f"Generated JSON is missing root 'label' key (attempt {attempt}).")
                if attempt == max_retries:
                    return None
                continue
            return mindmap_data
        except json.JSONDecodeError as e:
            logging.error(f"Model output was not valid JSON (attempt {attempt}). Error: {e}")
            logging.error(f"--- Raw Output ---:\n{raw_output}")
            if attempt == max_retries:
                return None
            continue

# ---------- Step 3: Create Flask App and Endpoint ----------
app = Flask(__name__)

@app.route("/generate_mindmap", methods=['POST'])
def generate_mindmap_api():

    if not llm:
        return jsonify({"error": "LLM client not initialized."}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request must be JSON."}), 400
            
        summary_json_obj = data.get("summary_json") 
        summary_json_str = json.dumps(summary_json_obj) 
        category = data.get("category", "citizen").lower()

        if not summary_json_str or category not in ["business", "citizen", "student"]:
            return jsonify({"error": "Missing 'summary_json' or invalid 'category'."}), 400
            
    except Exception as e:
        return jsonify({"error": f"Invalid request format: {e}"}), 400

    # --- 1. Generate the HIERARCHICAL JSON ---
    hierarchical_data = generate_mindmap_data(llm, summary_json_str, category)
    
    if not hierarchical_data:
        logging.error("Failed to generate hierarchical JSON from LLM.")
        return jsonify({"error": "Failed to generate mind map data from LLM."}), 500
        
    # --- 2. Return the HIERARCHICAL JSON directly ---
    return jsonify(hierarchical_data), 200

# ---------- Main Execution (for local testing) ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    logging.info(f"Starting Flask server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)