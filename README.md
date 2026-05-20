# Utkal Skill Centre - Digital Library & AI Platform

Welcome to the **Utkal Skill Centre** Digital Library! This platform provides an immersive, bilingual (English & Odia) e-learning experience specifically designed for students.

## ✨ Key Features
- **Bilingual Interface:** Seamlessly toggle between English and Odia.
- **Digital Library:** Interactive 3D glassmorphism UI to browse subjects and chapters for Classes 1 to 10.
- **AI Study Guide (Gundulu):** An integrated AI assistant that generates chapter summaries, important formulas, and MCQs.
- **Kindle-Style Reader:** Swipe-to-read horizontal pagination for AI study notes.
- **Daily MCQ Automation:** Automatically generate and test students using Google Drive integrated textbooks.

---

## ⚙️ Daily MCQ Automation Setup

The Drive-based daily MCQ generator needs server-side credentials in addition to the normal frontend Firebase config.

### Local files

1. Copy [firebase-applet-config.example.json](firebase-applet-config.example.json) to `firebase-applet-config.json`
2. Create `.env.local` with your local server values

Example `.env.local`:

```env
FIREBASE_PROJECT_ID=utkalskillcentre
FIREBASE_STORAGE_BUCKET=utkalskillcentre-admin.firebasestorage.com
TEXTBOOK_STORAGE_BUCKET=utkalskillcentre-admin
FIRESTORE_DATABASE_ID=ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9

VITE_FIREBASE_PROJECT_ID=utkalskillcentre
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_ID=ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9
VITE_FIREBASE_STORAGE_BUCKET=utkalskillcentre-admin.firebasestorage.com
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_MEASUREMENT_ID=

VITE_GEMINI_API_KEY=
GEMINI_API_KEY=

# Use one of these service-account options for Firebase Admin + Storage + Drive access
FIREBASE_SERVICE_ACCOUNT_PATH=./utkalskillcentre-ac892fb91655.json
# FIREBASE_SERVICE_ACCOUNT_JSON={...}
# GOOGLE_APPLICATION_CREDENTIALS=D:\BigsanGroup_UtkalSkillcentre\utkalskillcentre-main-clone\daily-mcq-automation.json

# Optional if you want separate Drive credentials instead of the shared service account
# GOOGLE_DRIVE_CLIENT_EMAIL=
# GOOGLE_DRIVE_PRIVATE_KEY=
```

### Service account requirements

The clean production and local-dev path is to use one dedicated service account for both Firestore Admin access and Google Drive textbook access.

Required IAM roles on project `utkalskillcentre`:

1. `roles/datastore.user`
2. `roles/storage.objectAdmin`

For Google Drive access, share the textbook files or containing folder with the service-account email as `Viewer`.

### Verifying the setup

When credentials are correct, the dev server should start without Firebase Admin credential errors and the following route should return JSON instead of 404 or credential failures:

```powershell
curl.exe -i -X POST http://127.0.0.1:3000/api/admin/daily-mcqs/run-auto -H "Content-Type: application/json" -d "{}"
```

### Common failures

1. `Firebase Admin is not initialized`
Cause: missing `FIREBASE_PROJECT_ID` or missing `firebase-applet-config.json`

2. `Could not load the default credentials`
Cause: no service-account credentials available to the server

3. `No Google Drive textbook source found`
Cause: textbook exists in Firestore but has no `driveFileId` or `driveUrl` for the matching class and subject
