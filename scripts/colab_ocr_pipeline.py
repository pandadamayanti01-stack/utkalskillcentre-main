# ==============================================================================
# 📖 GUNDULU AI - RESILIENT MULTIMODAL OCR & TEXTBOOK VECTOR SEARCH PIPELINE 📖
# ==============================================================================
# Designed by Gundulu Apa for Utkal Skill Centre (utkal-prod database)
# 
# This script is designed to run in GOOGLE COLAB. It recursively digitizes 
# scanned textbook PDFs from Google Drive, transcribes them using Gemini 2.5 Flash,
# and generates 768-dimensional embeddings using gemini-embedding-001.
#
# Features:
# - Resilient API Key Rotation (7 keys)
# - Adaptive Rate-Limit Cooldown & Pacing (strictly stays under RPM/RPD limits)
# - Real-time Progress Saving & 1-Click Resume capability
# - Bulk, safe Firestore transactional uploads in 400-doc batches
# ==============================================================================

# ------------------------------------------------------------------------------
# STEP 1: INSTALL SYSTEM DEPENDENCIES (Run in Colab cell)
# ------------------------------------------------------------------------------
# !apt-get install -y poppler-utils
# !pip install pdf2image pdfplumber google-genai google-cloud-firestore pillow

import os
import io
import re
import json
import time
import glob
from pathlib import Path
from PIL import Image
from pdf2image import convert_from_path
import pdfplumber

# For Google GenAI and Cloud Firestore
from google import genai
from google.genai import types
from google.cloud import firestore

print("✅ Dependencies imported successfully!")

# ------------------------------------------------------------------------------
# STEP 2: MOUNT GOOGLE DRIVE
# ------------------------------------------------------------------------------
# from google.colab import drive
# drive.mount('/content/drive')

# ------------------------------------------------------------------------------
# STEP 3: API KEY CONFIGURATION & TARGET SELECTION
# ------------------------------------------------------------------------------
# We will use your Pay-As-You-Go API Key.
# The script will try to load it from Google Colab Secrets (User Data) or Environment variables.
API_KEY = None

try:
    from google.colab import userdata
    API_KEY = userdata.get('GEMINI_API_KEY')
except Exception:
    pass

if not API_KEY:
    API_KEY = os.environ.get("GEMINI_API_KEY")

# Paste your API key here directly if not using Colab Secrets or Env Variables:
if not API_KEY or API_KEY == "YOUR_PAY_AS_YOU_GO_KEY_HERE":
    API_KEY = "AIzaSyChC5vHsWedo2EQbISIgrCp0bakJBPztdw"

# Set active target class to process (e.g. '10', '9', '8')
TARGET_CLASS = "10"
SUBJECT_FILTER = "odia"  # Use None to process all subjects, or 'odia', 'science', 'math'

# Google Drive folder path containing the textbook PDFs
DRIVE_TEXTBOOK_DIR = f"/content/drive/MyDrive/Rag Text Book(Class 1 to 10)/Class {TARGET_CLASS}"
PROGRESS_FILE_PATH = f"/content/drive/MyDrive/textbook_vectors_class_{TARGET_CLASS}_progress.json"

# Credentials file path in your mounted Google Drive
SERVICE_ACCOUNT_PATH = "/content/drive/MyDrive/utkalskillcentre-4ed1afa2f6a3.json"

global_cooldown_until = 0

# ------------------------------------------------------------------------------
# STEP 4: ADAPTIVE OCR CALL HANDLER
# ------------------------------------------------------------------------------
def perform_ocr_with_rate_limit_handling(image, prompt="Please transcribe all text from this textbook page. Transcribe Odia script perfectly with all characters and matras intact."):
    """
    Performs Gemini 2.5 Flash OCR on a page image using a single Pay-As-You-Go API key,
    with adaptive rate-limit retries and safety checks disabled for educational contents.
    """
    global global_cooldown_until
    
    max_attempts = 15
    fallback_delay = 5
    
    for attempt in range(1, max_attempts + 1):
        # 1. Respect global cooldown
        now = time.time()
        if now < global_cooldown_until:
            wait_time = int(global_cooldown_until - now)
            print(f"⏳ [Quota Cooldown] Sleeping for {wait_time}s...")
            time.sleep(wait_time)
            
        try:
            client = genai.Client(api_key=API_KEY)
            
            # Execute Gemini 2.5 Flash OCR with safety settings disabled
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[image, prompt],
                config=types.GenerateContentConfig(
                    safety_settings=[
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE,
                        ),
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE,
                        ),
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE,
                        ),
                        types.SafetySetting(
                            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                            threshold=types.HarmBlockThreshold.BLOCK_NONE,
                        ),
                    ]
                )
            )
            
            ocr_text = response.text
            if not ocr_text:
                finish_reason = "Unknown"
                if response.candidates and len(response.candidates) > 0:
                    candidate = response.candidates[0]
                    finish_reason = getattr(candidate, 'finish_reason', 'Unknown')
                raise ValueError(f"Returned text payload is empty. (Finish Reason: {finish_reason})")
                
            # SUCCESS pacing: Natural sleep delay of 1.0s to pace requests
            time.sleep(1.0)
            return ocr_text
            
        except Exception as e:
            err_msg = str(e)
            print(f"⚠️ Attempt {attempt}/{max_attempts} failed: {err_msg[:120]}")
            
            # Handle Quota / Rate-Limit (429)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                sleep_duration = fallback_delay
                delay_match = re.search(r"retry in\s+([\d\.]+)\s*s", err_msg)
                if delay_match:
                    sleep_duration = int(float(delay_match.group(1))) + 2
                elif "retryDelay" in err_msg:
                    delay_match_json = re.search(r"retryDelay':\s*'(\d+)s'", err_msg)
                    if delay_match_json:
                        sleep_duration = int(delay_match_json.group(1)) + 2
                
                print(f"⏳ Rate limited (429). Pausing for {sleep_duration} seconds...")
                global_cooldown_until = time.time() + sleep_duration
                fallback_delay = min(fallback_delay * 1.5, 30)
                
            # Handle Service Unavailable (503)
            elif "503" in err_msg or "UNAVAILABLE" in err_msg:
                print(f"⏳ Service unavailable (503). Retrying in 5 seconds...")
                time.sleep(5)
                
            else:
                # Other errors: back off slightly and retry
                time.sleep(2)
                
    raise RuntimeError("❌ All attempts failed on OCR generation. Pipeline halted.")

# ------------------------------------------------------------------------------
# STEP 5: EMBEDDING ENGINE
# ------------------------------------------------------------------------------
def generate_page_embedding(text):
    """
    Generates a 768-dimensional vector embedding for a page using gemini-embedding-001.
    Uses the single API key with retries.
    """
    global global_cooldown_until
    
    max_attempts = 15
    fallback_delay = 5
    
    for attempt in range(1, max_attempts + 1):
        now = time.time()
        if now < global_cooldown_until:
            wait_time = int(global_cooldown_until - now)
            time.sleep(wait_time)
            
        try:
            client = genai.Client(api_key=API_KEY)
            response = client.models.embed_content(
                model="models/gemini-embedding-001",
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=768)
            )
            
            vector = response.embedding.values
            if vector and len(vector) == 768:
                time.sleep(0.5) # Pacing
                return vector
            raise ValueError("Embedding returned incorrect dimension or format.")
            
        except Exception as e:
            err_msg = str(e)
            print(f"⚠️ Embedding Attempt {attempt}/{max_attempts} failed: {err_msg[:120]}")
            
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                sleep_duration = fallback_delay
                delay_match = re.search(r"retry in\s+([\d\.]+)\s*s", err_msg)
                if delay_match:
                    sleep_duration = int(float(delay_match.group(1))) + 2
                
                global_cooldown_until = time.time() + sleep_duration
                fallback_delay = min(fallback_delay * 1.5, 30)
            else:
                time.sleep(2)
                
    raise RuntimeError("❌ All attempts failed on Embedding generation.")

# ------------------------------------------------------------------------------
# STEP 6: MAIN OCR PROCESSING & EMBEDDING LOOP (With Resume Capability)
# ------------------------------------------------------------------------------
def run_textbook_digitization_pipeline():
    """
    Main loop that recursively finds and processes PDFs, transcribes pages,
    embeds them, and saves progress in real-time.
    """
    print(f"⚡ Initializing Textbook Ingestion Pipeline for Class {TARGET_CLASS}...")
    
    # 1. Load progress if exists
    progress = {}
    if os.path.exists(PROGRESS_FILE_PATH):
        try:
            with open(PROGRESS_FILE_PATH, 'r', encoding='utf-8') as f:
                progress = json.load(f)
            print(f"📖 Loaded existing progress! {len(progress)} files already indexed.")
        except Exception as e:
            print(f"⚠️ Failed to load progress file: {e}. Starting fresh.")
            
    # 2. Collect all PDF files in Drive directory
    pdf_paths = glob.glob(os.path.join(DRIVE_TEXTBOOK_DIR, "**/*.pdf"), recursive=True)
    pdf_paths = [os.path.abspath(p) for p in pdf_paths]
    print(f"📂 Found {len(pdf_paths)} PDF textbook files to process in Google Drive.")
    
    # Sort files for deterministic processing
    pdf_paths.sort()
    
    for idx, pdf_path in enumerate(pdf_paths):
        filename = os.path.basename(pdf_path)
        
        # Filter by subject if specified
        if SUBJECT_FILTER:
            if SUBJECT_FILTER.lower() not in filename.lower():
                continue
                
        print(f"\n📖 [{idx+1}/{len(pdf_paths)}] Processing: {filename}...")
        
        # Skip if already fully processed in previous runs
        if filename in progress and progress[filename].get("status") == "COMPLETED":
            print(f"✅ Already indexed in progress file. Skipping!")
            continue
            
        try:
            # Convert PDF pages to PIL Images
            print(f"🖼️ Converting PDF to images using pdf2image...")
            images = convert_from_path(pdf_path, dpi=150)
            print(f"📄 PDF has {len(images)} pages.")
            
            pages_data = []
            
            # Loop through each page
            for page_num, image in enumerate(images, 1):
                print(f"🌀 Transcribing & Embedding Page {page_num}/{len(images)}...")
                
                # A. Transcribe with Gemini Multimodal OCR
                ocr_prompt = (
                    "Please perform high-fidelity OCR on this school textbook page. "
                    "Transcribe all text, especially Odia script, perfectly with all matras and characters intact. "
                    "Maintain original line formatting and spelling structure exactly. "
                    "Do not summarize or add explanatory text."
                )
                ocr_text = perform_ocr_with_rate_limit_handling(image, ocr_prompt)
                
                # B. Generate page-level Vector Embedding (768-dim)
                embedding_vector = generate_page_embedding(ocr_text)
                
                # C. Store in page dataset
                pages_data.append({
                    "page_number": page_num,
                    "text": ocr_text,
                    "embedding": embedding_vector,
                    "reference": f"{filename.replace('.pdf', '')} - Page {page_num}"
                })
                print(f"   ✓ Page {page_num} OCR & Embedding stored successfully.")
                
            # Store in progress and write immediately to Drive
            progress[filename] = {
                "status": "COMPLETED",
                "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "pages": pages_data
            }
            
            with open(PROGRESS_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(progress, f, indent=2, ensure_ascii=False)
            print(f"💾 Progress saved to Google Drive for {filename}!")
            
        except Exception as e:
            print(f"❌ Failed to process {filename}: {e}")
            progress[filename] = {
                "status": "FAILED",
                "error": str(e),
                "processed_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            # Save progress even on failure
            with open(PROGRESS_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(progress, f, indent=2, ensure_ascii=False)
            print("💾 Saved failure status. Continuing to next file...")
            
    print("\n🎉 Textbook Digitization complete! Run Step 7 to upload progress data to Firestore.")

# ------------------------------------------------------------------------------
# STEP 7: SECURE BATCH UPLOADER TO FIRESTORE (Writes textbook_chunks)
# ------------------------------------------------------------------------------
def upload_class_progress_to_firestore():
    """
    Reads the compiled progress JSON file from Drive and uploads stanzas/pages
    to Firestore textbook_chunks in custom database 'utkal-prod' using 400-doc safe batches.
    """
    print("🚀 Initializing secure Firestore upload...")
    
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        raise FileNotFoundError(f"❌ Service account credential file not found at: {SERVICE_ACCOUNT_PATH}")
        
    # Correct format spacing issues in service account private key automatically
    with open(SERVICE_ACCOUNT_PATH, 'r') as f:
        sa_info = json.load(f)
    if "private_key" in sa_info:
        sa_info["private_key"] = sa_info["private_key"].replace('\\n', '\n')
        
    # Initialize Google Cloud Firestore Client
    db = firestore.Client.from_service_account_info(sa_info, database='utkal-prod')
    chunks_coll = db.collection('textbook_chunks')
    print("✅ Firestore client authenticated and connected to database: 'utkal-prod'.")
    
    # Load progress file
    if not os.path.exists(PROGRESS_FILE_PATH):
        raise FileNotFoundError(f"❌ No progress file found at: {PROGRESS_FILE_PATH}. Run indexing first!")
        
    with open(PROGRESS_FILE_PATH, 'r', encoding='utf-8') as f:
        progress = json.load(f)
        
    print(f"📖 Loaded progress file containing {len(progress)} file records.")
    
    # Flatten pages into single documents to upload
    documents_to_upload = []
    
    for filename, file_data in progress.items():
        if file_data.get("status") != "COMPLETED":
            continue
            
        # Parse subject from filename (e.g. Class10_Odia_Ch01 -> odia)
        subject = "general"
        parts = filename.lower().split('_')
        for p in parts:
            if p in ["odia", "math", "mathematics", "science", "evs", "history", "geography", "english", "sanskrit", "hindi"]:
                subject = p
                break
                
        for page in file_data.get("pages", []):
            documents_to_upload.append({
                "class": str(TARGET_CLASS).strip(),
                "subject": subject,
                "text": page["text"],
                "embedding": firestore.Vector(page["embedding"]),
                "reference": page["reference"],
                "createdAt": firestore.SERVER_TIMESTAMP
            })
            
    print(f"📊 Extracted {len(documents_to_upload)} total page documents to write to Firestore.")
    
    # Safe batching in chunks of 400 documents
    batch_size = 400
    total_docs = len(documents_to_upload)
    
    for i in range(0, total_docs, batch_size):
        chunk = documents_to_upload[i:i + batch_size]
        print(f"📦 Writing batch {i // batch_size + 1}... docs [{i} to {min(i + batch_size, total_docs)}]")
        
        batch = db.batch()
        for doc in chunk:
            doc_ref = chunks_coll.document()  # Random auto-ID
            batch.set(doc_ref, doc)
            
        batch.commit()
        print("   ✓ Batch committed successfully.")
        time.sleep(1.0) # Pacing between batch commits
        
    print(f"\n🎉 SUCCESS! All {total_docs} textbook pages uploaded directly to Firestore textbook_chunks in 'utkal-prod'.")

# ==============================================================================
# PIPELINE EXECUTION TRIGGERS
# ==============================================================================
if __name__ == "__main__":
    # To run indexing loop:
    run_textbook_digitization_pipeline()
    
    # To upload indexed progress to Firestore:
    # upload_class_progress_to_firestore()
