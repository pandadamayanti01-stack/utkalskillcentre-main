import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

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
    projectId: input.project_id,
    clientEmail: input.client_email,
    privateKey: String(input.private_key).replace(/\\n/g, '\n'),
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

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    const filePayload = readJsonFile(serviceAccountPath);
    if (!filePayload) {
      throw new Error(`Service-account file not found at ${serviceAccountPath}`);
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
        client_email: serviceAccount.clientEmail,
        private_key: serviceAccount.privateKey,
      },
      scopes,
    });
  }

  return new google.auth.GoogleAuth({ scopes });
}