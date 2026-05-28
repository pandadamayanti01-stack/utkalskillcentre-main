# filepath: google-agent/hackathon_mcp_server.py
from mcp.server.fastmcp import FastMCP
import firebase_admin
from firebase_admin import credentials, firestore
import re

# 1. Initialize Firebase Admin SDK
# (Loads your Firebase config dynamically for judge demo context)
try:
    cred = credentials.Certificate("firebase-applet-config.json")
    firebase_admin.initialize_app(cred)
except Exception as e:
    # Fallback to default initialization if already initialized
    try:
        firebase_admin.initialize_app()
    except Exception as inner:
        print("Firebase Admin already initialized or missing config:", inner)

db = firestore.client()

# 2. Start the Google-compliant FastMCP Server
mcp = FastMCP("UtkalSkillCentre_Agent")

@mcp.tool
def get_curriculum_chapter_context(subject: str, grade: int, chapter_id: str) -> str:
    """
    Queries the official Firestore database to retrieve highly structured, 
    curriculum-mapped study materials for Odisha BSE board students.
    """
    try:
        # Fetch the textbook/chapter document from Firestore
        doc_ref = db.collection("textbooks").document(f"class_{grade}_{subject}")
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            chapter_content = data.get(chapter_id, "ବିଷୟବସ୍ତୁ ଉପଲବ୍ଧ ନାହିଁ।")
            
            # --- TRACK 2 OPTIMIZATION: Clean-up messy characters for copy-pasting ---
            cleaned_content = re.sub(r'[\$\#\*]', '', chapter_content)
            return cleaned_content.strip()
        else:
            return "ସିଲାବସ ବିଷୟବସ୍ତୁ ମିଳିଲା ନାହିଁ। (Syllabus content not found.)"
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
