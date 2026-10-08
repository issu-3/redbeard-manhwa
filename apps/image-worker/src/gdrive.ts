import { SignJWT, importPKCS8 } from 'jose';

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

// Global token cache inside the isolate
let cachedDriveToken = '';
let tokenExpiration = 0;

export async function getGoogleDriveToken(envJson: string): Promise<string> {
  if (!envJson) {
    throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT is missing');
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Return cached token if still valid (with a 5 min buffer)
  if (cachedDriveToken && tokenExpiration > now + 300) {
    return cachedDriveToken;
  }

  let credentials: ServiceAccountCredentials;
  try {
    credentials = JSON.parse(envJson);
  } catch (e) {
    throw new Error('Invalid GOOGLE_DRIVE_SERVICE_ACCOUNT JSON format');
  }

  if (!credentials.private_key || !credentials.client_email) {
    throw new Error('Missing required fields in GOOGLE_DRIVE_SERVICE_ACCOUNT');
  }

  // Parse the private key
  const privateKey = await importPKCS8(credentials.private_key, 'RS256');

  // Create JWT
  const jwt = await new SignJWT({
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: credentials.token_uri || 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  // Exchange for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google OAuth failed (${response.status}): ${text}`);
  }

  const data = await response.json() as any;
  
  cachedDriveToken = data.access_token;
  tokenExpiration = now + 3600;

  return cachedDriveToken;
}
