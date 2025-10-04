FROM python:3.11-slim

# Install system dependencies for OCR, PDF, and image processing
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

# Upgrade pip and install requirements with version pinning
RUN pip install --upgrade pip==23.3.1
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the sentence transformer model to avoid runtime downloads
#RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

EXPOSE 8000
ENV PORT=8000

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000", "--timeout", "300", "--workers", "1"]
