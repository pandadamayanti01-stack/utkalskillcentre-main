<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2a24dfcb-5874-4b37-8e37-434f425283b9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Daily MCQ Automation Setup

The Drive-based daily MCQ generator needs server-side credentials in addition to the normal frontend Firebase config.

### Local files

1. Copy [firebase-applet-config.example.json](firebase-applet-config.example.json) to `firebase-applet-config.json`
2. Create `.env.local` with your local server values

Example `.env.local`:

```env
FIREBASE_PROJECT_ID=utkalskillcentre
FIREBASE_STORAGE_BUCKET=utkalskillcentre.firebasestorage.app
FIRESTORE_DATABASE_ID=ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9

VITE_FIREBASE_PROJECT_ID=utkalskillcentre
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_ID=gundulu2
VITE_FIREBASE_STORAGE_BUCKET=utkalskillcentre.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_MEASUREMENT_ID=

VITE_GEMINI_API_KEY=
GEMINI_API_KEY=

# Use one of these service-account options for Firebase Admin + Drive access
FIREBASE_SERVICE_ACCOUNT_PATH=D:\BigsanGroup_UtkalSkillcentre\utkalskillcentre-main-clone\daily-mcq-automation.json
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
