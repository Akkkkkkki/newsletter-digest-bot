const { google } = require('googleapis');

class GmailService {
  constructor(accessToken) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET
    );
    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async fetchRecentNewsletters(maxResults = 10) {
    try {
      const query = 'newer_than:1d';
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults
      });

      const messages = response.data.messages || [];
      const newsletters = [];

      for (const message of messages.slice(0, 5)) {
        const messageData = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const parsed = this.parseMessage(messageData.data);
        if (parsed) {
          newsletters.push(parsed);
        }
      }

      return newsletters;
    } catch (error) {
      console.error('Gmail API error:', error);
      throw new Error(`Gmail API error: ${error.message}`);
    }
  }

  parseMessage(message) {
    try {
      const headers = {};
      message.payload.headers.forEach(header => {
        headers[header.name] = header.value;
      });

      const content = this.extractContent(message.payload);

      return {
        id: message.id,
        threadId: message.threadId,
        subject: headers.Subject || '',
        sender: headers.From || '',
        senderEmail: this.extractEmail(headers.From || ''),
        senderName: this.extractName(headers.From || ''),
        date: new Date(parseInt(message.internalDate)).toISOString(),
        content: content.substring(0, 5000), // Limit content length
        labels: message.labelIds || []
      };
    } catch (error) {
      console.error('Error parsing message:', error);
      return null;
    }
  }

  extractContent(payload) {
    let content = '';

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          content += this.decodeBase64(part.body.data);
        }
      }
    } else if (payload.mimeType === 'text/plain' && payload.body.data) {
      content = this.decodeBase64(payload.body.data);
    }

    return content;
  }

  decodeBase64(data) {
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  extractEmail(fromHeader) {
    const match = fromHeader.match(/<(.+?)>/);
    return match ? match[1] : fromHeader;
  }

  extractName(fromHeader) {
    const match = fromHeader.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '') : '';
  }
}

module.exports = { GmailService }; 