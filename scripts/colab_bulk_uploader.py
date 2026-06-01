# ==============================================================================
# 🚀 GUNDULU AI - REST-BASED FIRESTORE VECTOR SYNC TOOL FOR COMPLETED CLASSES 🚀
# ==============================================================================
# Run this script directly in Google Colab to upload textbook vectors for classes
# 1, 2, 3, 4, 5, 6, 7, and 10 to your Firestore 'textbook_chunks' collection.
# This script uses the OAuth2 REST client to bypass protobuf conflicts in Colab.
# ==============================================================================

import os
import json
import time
import secrets
import string
import re
import requests
from datetime import datetime, timezone
from google.oauth2 import service_account
import google.auth.transport.requests

# Mount Drive check
DRIVE_ROOT = '/content/drive/MyDrive'

# Completed classes we want to sync
COMPLETED_CLASSES = ['1', '2', '3', '4', '5', '6', '7', '10']

def generate_document_id():
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(20))

def sanitize_text(text):
    if not text:
        return ""
    # Collapse multiple spaces and tabs
    text = re.sub(r'[ \t]+', ' ', str(text))
    # Collapse multiple newlines
    text = re.sub(r'\n+', '\n', text)
    return text.strip()

def sync_completed_classes_to_firestore():
    print("🚀 Starting bulk sync of completed classes to Firestore via REST API...")
    
    # Search for the service account key in standard locations
    possible_paths = [
        "/content/utkal-admin-sdk.json",
        "/content/drive/MyDrive/utkal-admin-sdk.json",
        "./utkal-admin-sdk.json",
        "../utkal-admin-sdk.json"
    ]
    key_path = None
    for p in possible_paths:
        if os.path.exists(p):
            key_path = p
            break
            
    if not key_path:
        raise FileNotFoundError(f"❌ Service account credential file 'utkal-admin-sdk.json' not found in search paths: {possible_paths}")
        
    print(f"🔑 Detected key file at: {key_path}")
    
    # Read and format the service account key
    with open(key_path, 'r') as f:
        sa_info = json.load(f)
    if "private_key" in sa_info:
        # 🛡️ BULLETPROOF KEY SANITIZATION: Clean up carriage returns, double-escaped newlines, 
        # leading/trailing whitespaces, tabs, and empty lines that cause cryptography ValueError
        raw_pk = sa_info["private_key"]
        raw_pk = raw_pk.replace('\\n', '\n')  # Replace literal \n sequence with real newline
        cleaned_lines = [line.strip() for line in raw_pk.split('\n') if line.strip()]
        sa_info["private_key"] = '\n'.join(cleaned_lines)
        
        # Calculate and print SHA-256 hash for diagnostic validation
        import hashlib
        import cryptography
        h = hashlib.sha256(sa_info["private_key"].encode('utf-8')).hexdigest()
        print(f"📊 Cryptography Version: {cryptography.__version__}")
        print(f"📊 Cleaned Key SHA-256 Hash: {h}")
        print(f"📊 Cleaned Key Length: {len(sa_info['private_key'])}")
        
        # Verify key headers safely (for diagnostic logging)
        lines = sa_info["private_key"].splitlines()
        print(f"🔑 Key Header: {lines[0] if lines else 'NONE'}")
        print(f"🔑 Key Footer: {lines[-1] if lines else 'NONE'}")
        
    project_id = sa_info.get("project_id", "utkalskillcentre")
    database_id = "utkal-prod"
    collection_id = "textbook_chunks"
    
    # Authenticate with Google REST API via OAuth2
    print("🔑 Authenticating with Firestore via OAuth2 REST client...")
    credentials = service_account.Credentials.from_service_account_info(
        sa_info,
        scopes=["https://www.googleapis.com/auth/datastore"]
    )
    req = google.auth.transport.requests.Request()
    credentials.refresh(req)
    access_token = credentials.token
    print("✅ Successfully authenticated. Access token obtained.")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    commit_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/{database_id}/documents:commit"
    
    for target_class in COMPLETED_CLASSES:
        progress_file = os.path.join(DRIVE_ROOT, f'textbook_vectors_class_{target_class}_progress.json')
        
        print(f"--------------------------------------------------------------------------")
        print(f"📚 Processing CLASS {target_class} progress data...")
        print(f"--------------------------------------------------------------------------")
        
        if not os.path.exists(progress_file):
            print(f"⚠️ Skipped: Progress file not found at {progress_file}")
            continue
            
        with open(progress_file, 'r', encoding='utf-8') as f:
            progress = json.load(f)
            
        print(f"📖 Loaded {len(progress)} processed file records from Drive.")
        
        # Flatten pages/chunks into documents
        documents_to_upload = []
        
        # Check if the progress data is in list format (sequential pipeline) or dict format (recursive pipeline)
        if isinstance(progress, list):
            # Format from list database
            for entry in progress:
                documents_to_upload.append({
                    "class": str(entry.get("class", target_class)).strip(),
                    "subject": str(entry.get("subject", "odia")).strip(),
                    "text": sanitize_text(entry.get("text", "")),
                    "embedding": entry.get("embedding", []),
                    "reference": entry.get("reference", ""),
                })
        elif isinstance(progress, dict):
            # Format from dictionary database
            for filename, file_data in progress.items():
                if file_data.get("status") != "COMPLETED":
                    continue
                    
                subject = "odia"
                parts = filename.lower().split('_')
                for p in parts:
                    if p in ["odia", "math", "mathematics", "science", "evs", "history", "geography", "english", "sanskrit", "hindi", "paribesa", "pallavi", "kala"]:
                        if p == "pallavi":
                            subject = "english"
                        elif p == "paribesa":
                            subject = "paribesa_patha"
                        else:
                            subject = p
                        break
                        
                for page in file_data.get("pages", []):
                    documents_to_upload.append({
                        "class": str(target_class).strip(),
                        "subject": subject,
                        "text": sanitize_text(page.get("text", "")),
                        "embedding": page.get("embedding", []),
                        "reference": page.get("reference", ""),
                    })
        
        total_docs = len(documents_to_upload)
        if total_docs == 0:
            print(f"⚠️ No pages/chunks found to upload for Class {target_class}.")
            continue
            
        print(f"📊 Found {total_docs} textbook page chunks. Uploading in safe batches of 100...")
        
        # Batch upload to Firestore
        batch_size = 100
        for i in range(0, total_docs, batch_size):
            chunk = documents_to_upload[i:i + batch_size]
            print(f"   📦 Uploading batch {i // batch_size + 1}... docs [{i} to {min(i + batch_size, total_docs)}]")
            
            # Map batch to Firestore REST writes
            writes = []
            for doc in chunk:
                doc_id = generate_document_id()
                doc_name = f"projects/{project_id}/databases/{database_id}/documents/{collection_id}/{doc_id}"
                
                created_at_str = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
                
                fields = {
                    "class": {"stringValue": doc["class"]},
                    "subject": {"stringValue": doc["subject"]},
                    "text": {"stringValue": doc["text"]},
                    "embedding": {
                        "arrayValue": {
                            "values": [{"doubleValue": float(val)} for val in doc["embedding"]]
                        }
                    },
                    "reference": {"stringValue": doc["reference"]},
                    "createdAt": {"timestampValue": created_at_str}
                }
                
                writes.append({
                    "update": {
                        "name": doc_name,
                        "fields": fields
                    }
                })
            
            # Post to Firestore REST commit endpoint
            payload = {"writes": writes}
            try:
                res = requests.post(commit_url, headers=headers, json=payload)
                if res.status_code != 200:
                    print(f"      ❌ Failed to upload batch: Status {res.status_code} - {res.text}")
                    # Stop upload to avoid partial upload issues
                    raise RuntimeError(f"REST API error: {res.text}")
            except Exception as e:
                print(f"      ❌ Network/HTTP Exception during batch upload: {e}")
                raise e
                
            time.sleep(0.5)  # Quick delay to prevent Firestore throughput limits
            
        print(f"✅ Success: Indexed stanzas for Class {target_class} synced to Firestore!\n")
        
    print("🎉 Bulk sync completed successfully! All classes are fully synced.")

if __name__ == "__main__":
    sync_completed_classes_to_firestore()
