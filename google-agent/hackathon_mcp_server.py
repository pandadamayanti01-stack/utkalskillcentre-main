# filepath: google-agent/hackathon_mcp_server.py
from mcp.server.fastmcp import FastMCP
import firebase_admin
from firebase_admin import credentials, firestore
import re
import os

# 1. Initialize Firebase Admin SDK
# (Examines the environment to dynamically load the active credentials)
try:
    possible_creds = ["utkal-admin-sdk.json", "utkalskillcentre-4ed1afa2f6a3.json", "firebase-applet-config.json"]
    cred_file = None
    for file_name in possible_creds:
        if os.path.exists(file_name):
            cred_file = file_name
            break
            
    if cred_file:
        cred = credentials.Certificate(cred_file)
        firebase_admin.initialize_app(cred)
        print(f"Firebase Admin initialized successfully using credential file: {cred_file}")
    else:
        firebase_admin.initialize_app()
        print("Firebase Admin initialized using default environment credentials.")
except Exception as e:
    print("Firebase Admin initialization warning:", e)

# Connect to the custom Firestore database id 'utkal-prod'
db_id = os.environ.get("FIRESTORE_DATABASE_ID", "utkal-prod")
db = firestore.client(database=db_id)
print(f"Connected to Firestore database: {db_id}")

# 2. Start the Google-compliant FastMCP Server
mcp = FastMCP("UtkalSkillCentre_Agent")

@mcp.tool
def get_curriculum_chapter_context(subject: str, grade: int, chapter_id: str) -> str:
    """
    Queries the official Firestore database to retrieve highly structured, 
    curriculum-mapped study materials for Odisha BSE board students.
    """
    try:
        # 1. First attempt: Query directly by chapter document ID in 'chapters' collection
        doc_ref = db.collection("chapters").document(chapter_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            chapter_content = data.get("notes", "") or data.get("content", "")
            if chapter_content:
                cleaned_content = re.sub(r'[\$\#\*]', '', chapter_content)
                return cleaned_content.strip()

        # 2. Fallback: Query by class and subject, then search for matching chapter title/id
        class_name = f"class{grade}"
        query = db.collection("chapters").where("class", "==", class_name).where("subject", "==", subject)
        docs = query.get()
        
        for d in docs:
            d_data = d.to_dict()
            d_title = d_data.get("title", "").lower()
            d_title_en = d_data.get("title_en", "").lower()
            d_title_or = d_data.get("title_or", "").lower()
            
            # Match if d.id equals chapter_id, or if chapter_id is a substring of any titles
            if (d.id == chapter_id or 
                chapter_id.lower() in d_title or 
                chapter_id.lower() in d_title_en or 
                chapter_id.lower() in d_title_or):
                
                chapter_content = d_data.get("notes", "") or d_data.get("content", "")
                if chapter_content:
                    cleaned_content = re.sub(r'[\$\#\*]', '', chapter_content)
                    return cleaned_content.strip()

        return f"ସିଲାବସ ବିଷୟବସ୍ତୁ ମିଳିଲା ନାହିଁ। (Syllabus context not found for Chapter: {chapter_id}, Class: {grade}, Subject: {subject})"
    except Exception as e:
        return f"Error retrieving curriculum context: {str(e)}"

@mcp.tool
def award_launch_celebration_points(user_id: str) -> str:
    """
    Awards +500 XP to the logged-in student to celebrate the official Play Store TWA launch.
    """
    try:
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            if user_data.get("claimedLaunchReward"):
                return "୫୦୦ XP ଶୁଭାରମ୍ଭ ଉପହାର ଆଗରୁ ଦାବି ହୋଇସାରିଛି! (Already Claimed)"
            
            user_ref.update({
                "points": firestore.Increment(500),
                "claimedLaunchReward": True
            })
            return "ସଫଳତାପୂର୍ବକ +୫୦୦ XP ଯୋଡ଼ାଗଲା! (Success! +500 XP Added to Student Account)"
        return "User not found."
    except Exception as e:
        return f"Failed to reward points: {str(e)}"

if __name__ == "__main__":
    # Run the server to expose tools to Google's Agent ADK
    mcp.run()
