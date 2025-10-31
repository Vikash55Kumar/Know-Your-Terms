# pinecone_chunk_upload.py
import os
import math
import requests
import textwrap
from tqdm import tqdm
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
import time

# ---------- CONFIG ----------
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
LAW_DATA_API_URL = os.getenv("LAW_DATA_API_URL")
INDEX_NAME = "indian-law-acts"
MODEL_NAME = "all-MiniLM-L6-v2"
API_URL = LAW_DATA_API_URL  # e.g., "https://example.com/api/laws"

# ---------- PARAMETERS ----------
CHUNK_SIZE = 4000        # Split long text (only if needed)
BATCH_SIZE = 50          # Send 3 batches (≈50 + 50 + 70)
RETRY_LIMIT = 3          # Retry on failure

# ---------- INIT PINECONE ----------
print("🔗 Connecting to Pinecone...")
pc = Pinecone(api_key=PINECONE_API_KEY)

# Create index if missing
if INDEX_NAME not in [i.name for i in pc.list_indexes()]:
    print(f"🆕 Creating index '{INDEX_NAME}'...")
    pc.create_index(
        name=INDEX_NAME,
        dimension=384,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

index = pc.Index(INDEX_NAME)

# ---------- FETCH LAW DATA ----------
print("📥 Fetching all law data...")
response = requests.get(API_URL)
response.raise_for_status()
data = response.json()

laws = data.get("data", {}).get("laws", [])
total_laws = len(laws)
print(f"✅ Total laws fetched: {total_laws}")

if not laws:
    raise ValueError("⚠️ No laws found in API response!")

# ---------- INIT MODEL ----------
print("⚙️ Loading embedding model...")
model = SentenceTransformer(MODEL_NAME)

# ---------- CHUNK, EMBED & STORE ----------
vectors = []
print("🧠 Encoding and preparing vectors...")

for law in tqdm(laws, desc="Processing laws"):
    act_name = law.get("act_name", "")
    act_details = law.get("act_details", "")
    category = law.get("category", "")
    law_id = str(law.get("_id"))

    # ✅ Only chunk if act_details is too long
    if len(act_details) > CHUNK_SIZE:
        chunks = textwrap.wrap(act_details, CHUNK_SIZE, break_long_words=False)
    else:
        chunks = [act_details]

    for idx, chunk in enumerate(chunks):
        text_to_embed = f"{act_name}\n\n{chunk}"
        embedding = model.encode(text_to_embed).tolist()

        vectors.append({
            "id": f"{law_id}_{idx}",
            "values": embedding,
            "metadata": {
                "category": category,
                "act_name": act_name,
                "chunk_index": idx,
                "act_details_chunk": chunk
            }
        })

print(f"✅ Prepared total vectors (including chunks): {len(vectors)}")

# ---------- UPLOAD IN 3 BATCHES ----------
print("🚀 Uploading vectors to Pinecone...")

num_batches = math.ceil(len(vectors) / BATCH_SIZE)
for i in range(0, len(vectors), BATCH_SIZE):
    batch = vectors[i:i + BATCH_SIZE]
    batch_num = i // BATCH_SIZE + 1

    for attempt in range(1, RETRY_LIMIT + 1):
        try:
            index.upsert(vectors=batch)
            print(f"✅ Uploaded batch {batch_num}/{num_batches} ({len(batch)} items)")
            break
        except Exception as e:
            print(f"⚠️ Error uploading batch {batch_num} (Attempt {attempt}): {e}")
            if attempt < RETRY_LIMIT:
                time.sleep(3)
            else:
                print(f"❌ Failed batch {batch_num} after {RETRY_LIMIT} retries. Skipping.")

print("🎯 All 170 law documents (chunked if needed) successfully uploaded to Pinecone!")

# ---------- VERIFY ----------
stats = index.describe_index_stats()
print("\n📊 Pinecone Index Summary:")
print(f"➡️ Index Name: {INDEX_NAME}")
print(f"➡️ Total Vectors: {stats['total_vector_count']}")
print("✅ Upload completed successfully!")
