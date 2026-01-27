const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000'; // Must match Console definition

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be in .env.local');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Generate the url that will be used for authorization
const authorizationUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // Crucial for Refresh Token
  scope: ['https://www.googleapis.com/auth/drive'],
});

console.log('\nPlease visit this URL to authorize the app:');
console.log('--------------------------------------------------');
console.log(authorizationUrl);
console.log('--------------------------------------------------');

rl.question('\nEnter the code from that page here: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\nSuccessfully retrieved tokens!');
    console.log('\nAdd this REFRESH_TOKEN to your .env.local file:');
    console.log('--------------------------------------------------');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('--------------------------------------------------');
    
    if (!tokens.refresh_token) {
        console.warn('WARNING: No refresh token returned. Did you already authorize? You might need to revoke access or use prompt=consent.');
    }
    
  } catch (error) {
    console.error('Error retrieving access token:', error.message);
  } finally {
    rl.close();
  }
});
