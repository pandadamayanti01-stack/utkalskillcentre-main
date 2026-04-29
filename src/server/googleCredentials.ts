import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

// GLOBAL FIX: Windows environment variables sometimes include stray quotes.
// This cleans them up for any library (like Firestore) that reads process.env directly.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS.replace(/"/g, '').trim();
}
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH.replace(/"/g, '').trim();
}

type ServiceAccountLike = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function normalizeServiceAccount(input: ServiceAccountLike | null) {
  if (!input?.client_email || !input?.private_key) {
    return null;
  }

  return {
    project_id: input.project_id,
    client_email: input.client_email,
    private_key: String(input.private_key).replace(/\\n/g, '\n'),
  };
}

function readJsonFile(filePath: string) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
}

export function getServiceAccountCredentials() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    try {
      return normalizeServiceAccount(JSON.parse(inlineJson));
    } catch (error) {
      throw new Error(`Failed to parse service-account JSON from env: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let serviceAccountPath = (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || '').replace(/"/g, '').trim();
  
  if (serviceAccountPath) {
    // If it's a relative path starting with ./ or ../, resolve it
    if (serviceAccountPath.startsWith('.') || !path.isAbsolute(serviceAccountPath)) {
      serviceAccountPath = path.resolve(process.cwd(), serviceAccountPath);
    }
    
    const filePayload = readJsonFile(serviceAccountPath);
    if (!filePayload) {
      console.warn(`Service-account file not found at ${serviceAccountPath}. Trying root fallback...`);
      // Final fallback: try to find any .json file in the root that looks like a service account
      const rootFiles = fs.readdirSync(process.cwd());
      const jsonFile = rootFiles.find(f => f.endsWith('.json') && f.includes('utkalskillcentre'));
      if (jsonFile) {
        const fallbackPath = path.join(process.cwd(), jsonFile);
        console.log(`Found fallback service account at: ${fallbackPath}`);
        return normalizeServiceAccount(readJsonFile(fallbackPath));
      }
      return null;
    }
    return normalizeServiceAccount(filePayload);
  }

  return null;
}

export function createGoogleAuth(scopes: string[]) {
  const serviceAccount = getServiceAccountCredentials();
  if (serviceAccount) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
      scopes,
    });
  }

  return new google.auth.GoogleAuth({ scopes });
}