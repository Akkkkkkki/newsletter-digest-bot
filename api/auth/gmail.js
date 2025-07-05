const { google } = require('googleapis');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Defensive: Check for required env vars
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://newsletter-digest-bot.vercel.app/auth/callback'
    : 'http://localhost:3000/auth/callback';

  if (!clientId || !clientSecret) {
    console.error('[GMAIL OAUTH] Missing env vars:', {
      GMAIL_CLIENT_ID: !!clientId,
      GMAIL_CLIENT_SECRET: !!clientSecret
    });
    return res.status(500).json({
      error: 'Missing required environment variables',
      details: {
        GMAIL_CLIENT_ID: !!clientId,
        GMAIL_CLIENT_SECRET: !!clientSecret
      },
      hint: 'Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your Vercel project environment variables.'
    });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    let tokens;
    try {
      const result = await oauth2Client.getToken(code);
      tokens = result.tokens;
    } catch (tokenError) {
      console.error('OAuth token exchange error:', tokenError?.response?.data || tokenError);
      return res.status(500).json({
        error: 'OAuth token exchange failed',
        details: tokenError?.response?.data || tokenError.message || tokenError,
        hint: 'Check that your GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and redirect URI match exactly between your code, Vercel environment, and Google Cloud Console.'
      });
    }

    return res.status(200).json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expiry_date
    });

  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(500).json({ error: 'Authentication failed', details: error.message || error });
  }
}

module.exports = handler; 