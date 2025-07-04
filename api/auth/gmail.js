const { google } = require('googleapis');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.NODE_ENV === 'production' 
        ? 'https://your-app.vercel.app/auth/callback'
        : 'http://localhost:3000/auth/callback'
    );

    const { tokens } = await oauth2Client.getToken(code);

    return res.status(200).json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expiry_date
    });

  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
} 