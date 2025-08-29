const { google } = require('googleapis');
const { NEWSLETTER_DEFAULTS } = require('./config');

class GmailService {
  constructor(accessToken, refreshToken) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET
    );
    this.oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.refreshToken = refreshToken;
  }

  /**
   * Fetch recent newsletter emails, filtered by allowed senders/domains and heuristics.
   * @param {Object} options
   *   - maxResults: number of emails to fetch
   *   - allowedSenders: array of allowed sender email addresses (lowercase)
   *   - allowedDomains: array of allowed sender domains (e.g. 'substack.com')
   *   - processedMessageIds: array of Gmail message IDs already processed
   */
  async fetchRecentNewsletters(options = {}) {
    const {
      maxResults = NEWSLETTER_DEFAULTS.limit,
      allowedSenders = [],
      allowedDomains = NEWSLETTER_DEFAULTS.allowedDomains,
      processedMessageIds = [],
    } = options;
    try {
      // Gmail query: has:list-unsubscribe OR from:allowedSenders OR domain
      let queryParts = [
        'has:list-unsubscribe',
      ];
      if (allowedSenders.length > 0) {
        queryParts.push(
          allowedSenders.map(addr => `from:${addr}`).join(' OR ')
        );
      }
      if (allowedDomains.length > 0) {
        queryParts.push(
          allowedDomains.map(domain => `from:@${domain}`).join(' OR ')
        );
      }
      const query = queryParts.join(' OR ');
      let response;
      try {
        response = await this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: maxResults * 2 // fetch extra for filtering
        });
      } catch (error) {
        if (error.code === 401 && this.refreshToken) {
          await this.oauth2Client.getAccessToken();
          response = await this.gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: maxResults * 2
          });
        } else {
          throw error;
        }
      }
      const messages = response.data.messages || [];
      const newsletters = [];
      for (const message of messages) {
        if (processedMessageIds.includes(message.id)) continue; // skip already processed
        const messageData = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        const parsed = this.parseMessage(messageData.data);
        if (!parsed) continue;
        // Heuristic: sender in allowed list or domain, or has List-Unsubscribe header
        const senderEmail = parsed.senderEmail.toLowerCase();
        const senderDomain = senderEmail.split('@')[1] || '';
        const headers = messageData.data.payload.headers || [];
        const hasListUnsub = headers.some(h => h.name.toLowerCase() === 'list-unsubscribe');
        const isAllowedSender = allowedSenders.includes(senderEmail);
        const isAllowedDomain = allowedDomains.some(domain => senderDomain.endsWith(domain));
        if (isAllowedSender || isAllowedDomain || hasListUnsub) {
          newsletters.push(parsed);
        }
        if (newsletters.length >= maxResults) break;
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