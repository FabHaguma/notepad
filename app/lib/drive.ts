import { google } from 'googleapis';

export const getDriveClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // STRICT MODE: Prefer OAuth to avoid Service Account 0GB Quota issues
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // Fallback check: If we are here, OAuth is missing.
  // Check if Service Account is present to give a specific warning.
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  if (clientEmail) {
    console.warn("WARNING: Using Service Account. This will likely fail with 'Quota Exceeded' unless using a Shared Drive.");
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      return google.drive({ version: 'v3', auth });
  }

  throw new Error('MISSING CREDENTIALS: You must add GOOGLE_REFRESH_TOKEN to .env.local to fix the Storage Quota error.');
};
