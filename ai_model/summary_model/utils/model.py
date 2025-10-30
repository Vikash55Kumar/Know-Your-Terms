# summarizer.py
import os
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
import vertexai
from langchain_google_vertexai import ChatVertexAI, HarmBlockThreshold, HarmCategory

# ------------------ ENV SETUP ------------------
load_dotenv()
# vertex_key_path = os.getenv("VERTEX_AI_KEY")
# os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = vertex_key_path

VERTEX_AI_CREDENTIALS = os.getenv("VERTEX_AI_CREDENTIALS")
if VERTEX_AI_CREDENTIALS:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = VERTEX_AI_CREDENTIALS

# GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
# if GOOGLE_APPLICATION_CREDENTIALS:
#     os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS

PROJECT_ID = "still-cipher-475415-t3"
vertexai.init(project=PROJECT_ID, location="us-central1")

# print(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))
print("Vertex AI", os.environ.get("VERTEX_AI_CREDENTIALS"))
# ------------------ SAFETY SETTINGS ------------------
safety_settings = {
    HarmCategory.HARM_CATEGORY_UNSPECIFIED: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
}

# ------------------ INITIALIZE LLM ------------------
llm = ChatVertexAI(
    model="gemini-2.5-flash",
    temperature=0.3,
    max_output_tokens=20000,
    project=PROJECT_ID,
    # safety_settings=safety_settings,
    # context="You are a multilingual summarizer supporting English and Hindi documents."
)

# ------------------ CATEGORY SUMMARY TEMPLATES ------------------
category_templates = {
    "student": """==================== 🎓 STUDENT DOCUMENT SUMMARY 🎓 ====================
Document Name : .........
Date          : ..............
Student Name  : .........
Document Type : .........
Category      : .........
===================================================================

 WHAT THIS DOCUMENT IS ABOUT

Give a short, plain explanation of what the document does and why it was created. 
---------------------------------------------------------------------


------------------ KEY DETAILS ----------------------
DETAIL : Main Section
----------------------------------------
Description: "{text}"
Verified Information:
- Issued By     : .........
- Reference     : .........
- Validity      : .........
- Financial / Score Info: .........
Status: .........
Notes / Issues: .........
Recommendation / Action: .........
Risk & Confidence Assessment:
- Potential Risk     : .........
- Confidence Score   : .........%
------------------------------------------------------

--------------------------------------------------
RISK ANALYSIS
-List possible problems, confusing points, or risky clauses in easy language.
-----------------------------------------------


SUMMARY HIGHLIGHTS
- Total Sections Verified : .........
- Fully Verified          : .........
- Issues / Attention      : .........
- General Recommended Actions : .........
- Overall Confidence Score     : .........%
===================================================================

-----------------------------------------------------------------
ECOMMENDATIONS / IMPROVEMENTS
-Add / modify clauses
-suggested correction
-best practice recommendation
-------------------------------------------------------------------

-----------------------------------------------------------
Verified Acts Fetched : [Automatically from DB if found]
---------------------------------------------------------

MAIN DETAILS / KEY TERMS
-----------------------------------------------------


LEGAL RULES
------------------------------------------------------


RISKS OR THINGS TO WATCH
-List possible problems, confusing points, or risky clauses in easy language.

----------------------------------------------------
Mention clear, well-defined, or protective clauses.
-----------------------------------------------
----------------------------------------------------------------------------
SIMPLE SUMMARY FOR RULES
-In 3–5 plain sentences, explain what the document means for the user, what actions to take, and why it matters.
Example:
"This contract explains who will do what, how much it costs, and what happens after delivery. 
It is safe to sign once payment and renewal terms are confirmed."
----------------------------------------------------------------------------

-----------------------------------------------------------
TIP: Always review flagged items and follow recommendations to ensure your documents are complete, compliant, and ready for submission or verification.
===================================================================
""",



    "citizen": """==================== 🏛 CITIZEN DOCUMENT SUMMARY 🏛 ====================
Document Name       : .........
Date                : .........
Citizen Name        : .........
Document Type       : .........
Category            : .........
Purpose / Objective : .........
👤 Parties / Persons Involved :
- .........
- .........
===================================================================
-------------------------------------------------------------------------
🧾  WHAT THIS DOCUMENT IS ABOUT

Give a short, plain explanation of what the document does and why it was created. 
Example: "This agreement is between two companies for website development and maintenance over 12 weeks."
-----------------------------------------------------------------------------
APPLICABLE LAWS & ACTS

List all laws, rules, or acts that directly or indirectly apply to this document.

📘 Explicit Acts Mentioned:
- [Act Name] — Section No. — Short Explanation

📘 Implicit / Related Acts:
- [Act Name] — Why it applies

Example:
- Indian Contract Act, 1872 — Governs all commercial agreements.
- Information Technology Act, 2000 — Applicable for digital transactions.
- Goods and Services Tax (GST) Act, 2017 — For invoice and tax compliance.
- Arbitration and Conciliation Act, 1996 — For dispute resolution clause.

------------------ KEY DETAILS ----------------------
ALl LEGAL POINTS / ARGUMENTS / TERMS / clauses

-Description: "{text}"
-Verified Information:
- Issued By       : .........
- Reference Link  : .........
- Validity Period : ..................
- Financial Info  : .........
- Legal / Compliance Info : .........
Status: .........
Notes / Issues: .........
Recommendation: .........
Special Instructions: .........

-----------------------------------------------------
CONFIDENCE SCORE & ANALYSIS
- Confidence Score (AI Understanding) : .........%
- Document Clarity / Completeness   : .........
- Risk Level                        : Low / Medium / High
------------------------------------------------------

RECOMMENDATIONS / IMPROVEMENTS
-Add / modify clauses
-suggested correction
-best practice recommendation

-----------------------------------------------

RISKS OR THINGS TO WATCH

-List possible problems, confusing points, or risky clauses in easy language.
-----------------------------------------------------------------------------
RISK AND ISSUES
-
-----------------------------------------------
SUMMARY HIGHLIGHTS
- Total Sections Verified   : .........
- Fully Verified            : .........
- Issues / Attention        : .........
- Recommended Actions       : .........
- Compliance Status         : .........
------------------------------------------------


Verified Acts Fetched : [Automatically from DB if found]

---------------------------------------------------------------

SIMPLE SUMMARY FOR RULES
-In 3–5 plain sentences, explain what the document means for the user, what actions to take, and why it matters.
Example:
"This contract explains who will do what, how much it costs, and what happens after delivery. 
It is safe to sign once payment and renewal terms are confirmed."
------------------------------------------------------------------------


OVERALL DOCUMENT SUMMARY
===================================================================
TIP: Always review flagged items, meet deadlines, and follow recommendations to ensure your legal, financial, and identity documents are complete, compliant, and actionable.
===================================================================
""",





    "businessman": """==================== 💼 BUSINESS DOCUMENT SUMMARY 💼 ====================
Document Name       : .........
Date                : .........
Business / Company  : .........
Prepared By / DEPARTMENT        : .........
Document Type       : .........
Category            : .........
Purpose / Objective : .........
🎯 Purpose / Objective  : Explain briefly why this document exists (e.g., service agreement, partnership, invoice settlement, tender response).
===================================================================

-------------------------------------------------------------
WHAT THIS DOCUMENT IS ABOUT
-Give a short, plain explanation of what the document does and why it was created. 

-------------------------------------------------------------------------
APPLICABLE LAWS & ACTS

List all laws, rules, or acts that directly or indirectly apply to this document.

📘 Explicit Acts Mentioned:
- [Act Name] — Section No. — Short Explanation

📘 Implicit / Related Acts:
- [Act Name] — Why it applies

Example:
- Indian Contract Act, 1872 — Governs all commercial agreements.
- Information Technology Act, 2000 — Applicable for digital transactions.
- Goods and Services Tax (GST) Act, 2017 — For invoice and tax compliance.
- Arbitration and Conciliation Act, 1996 — For dispute resolution clause.

------------------ KEY DETAILS ----------------------
DETAIL : Main Section
----------------------------------------
Description: "{text}"
Verified Information:
- Issued By        : .........
- Reference Link   : .........
- Validity Period  : ......... 
- Financial Info   : .........
- Legal / Compliance : .........
Status: .........
Notes / Issues: .........
Recommendation: .........
Special Instructions: .........
------------------------------------------------------

MAIN DETAILS / KEY TERMS
-----------------------------------------------------


LEGAL RULES
------------------------------------------------------


RISKS OR THINGS TO WATCH

-List possible problems, confusing points, or risky clauses in easy language.

----------------------------------------------------
Mention clear, well-defined, or protective clauses.
-----------------------------------------------


SUGGESTION AND IMPROVEMENT
-Write clear improvement tips.
-------------------------------------------------

------------------------------------------------------------------

📈  CONFIDENCE & RISK SCORE

- Confidence Score (Understanding Accuracy): .........%
- Overall Risk Level: Low / Medium / High
- Document Clarity: Clear / Moderate / Complex
-------------------------------------------------------------------

------------------------------------------------------

RECOMMENDATIONS / IMPROVEMENTS
-Add / modify clauses
-suggested correction
-best practice recommendation

-----------------------------------------------

SUMMARY HIGHLIGHTS
- Total Sections Verified   : .........
- Fully Verified            : .........
- Issues / Attention        : .........
- Recommended Actions       : .........
- Compliance Status         : .........
-------------------------------------------------------


Verified Acts Fetched : [Automatically from DB if found]

----------------------------------------------------------------------

SIMPLE SUMMARY FOR RULES
-In 3–5 plain sentences, explain what the document means for the user, what actions to take, and why it matters.
Example:
"This contract explains who will do what, how much it costs, and what happens after delivery. 
It is safe to sign once payment and renewal terms are confirmed."

===================================================================
TIP: Always review flagged items, check deadlines, and follow recommendations to ensure your business documents are compliant, complete, and actionable.
===================================================================
"""
}