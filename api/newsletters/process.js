if (process.env.NODE_ENV !== 'production' && require.main === module) {
  require('dotenv').config({ path: '.env.local' });
}
const { supabase } = require('../../lib/supabase.node');
const { GmailService } = require('../../lib/gmail');
const { extractNewsletterInsights, generateEmbedding, extractNewsItemsFromNewsletter } = require('../../lib/openai');
const { processNewsItemsForStories } = require('../headlines/top-referenced');
const { NEWSLETTER_DEFAULTS } = require('../../lib/config');
const { NEWSLETTER_DEFAULTS: CONFIG_DEFAULTS } = require('../../lib/config');
const { validation } = require('../../lib/validation');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { access_token, refresh_token, user_id } = req.body;

    // Basic input validation
    const missing = validation.validateRequired(req.body, ['access_token', 'user_id']);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}`, type: 'validation' });
    }

    // Validate user_id format
    if (!validation.isValidUuid(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID format', type: 'validation' });
    }

    // Validate access_token format
    if (!validation.isValidAccessToken(access_token)) {
      return res.status(400).json({ error: 'Invalid access token format', type: 'validation' });
    }

    // Initialize Gmail service with refresh token if provided
    let gmailService;
    try {
      gmailService = new GmailService(access_token, refresh_token);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to initialize Gmail service', type: 'gmail', details: err.message });
    }

    // Fetch user's allowed newsletter sources (only user-specified)
    let sources, sourcesError;
    try {
      const result = await supabase
        .from('newsletter_sources')
        .select('email_address')
        .eq('user_id', user_id)
        .eq('is_active', true);
      sources = result.data;
      sourcesError = result.error;
    } catch (err) {
      return res.status(500).json({ error: 'Database error fetching newsletter sources', type: 'database', details: err.message });
    }
    if (sourcesError) {
      return res.status(500).json({ error: 'Failed to fetch newsletter sources', type: 'database', details: sourcesError.message });
    }
    const allowedSenders = (sources || []).map(s => s.email_address.toLowerCase());
    // No default domains: only user-specified
    const allowedDomains = [];
    // Fetch already-processed Gmail message IDs for this user
    let processed, processedError;
    try {
      const result = await supabase
        .from('newsletters')
        .select('gmail_message_id')
        .eq('user_id', user_id);
      processed = result.data;
      processedError = result.error;
    } catch (err) {
      return res.status(500).json({ error: 'Database error fetching processed message IDs', type: 'database', details: err.message });
    }
    if (processedError) {
      return res.status(500).json({ error: 'Failed to fetch processed message IDs', type: 'database', details: processedError.message });
    }
    const processedMessageIds = (processed || []).map(n => n.gmail_message_id);
    // Fetch recent newsletters with filtering (only user-specified senders/domains)
    let newsletters;
    try {
      newsletters = await gmailService.fetchRecentNewsletters({
        maxResults: CONFIG_DEFAULTS.limit,
        allowedSenders,
        allowedDomains,
        processedMessageIds
      });
    } catch (err) {
      return res.status(500).json({ error: 'Gmail API error', type: 'gmail', details: err.message });
    }

    const processedNewsletters = [];

    for (const newsletter of newsletters) {
      try {
        // Check if newsletter already exists
        const { data: existingNewsletter } = await supabase
          .from('newsletters')
          .select('id')
          .eq('user_id', user_id)
          .eq('gmail_message_id', newsletter.id)
          .single();

        if (existingNewsletter) {
          continue; // Skip if already processed
        }

        // Insert newsletter record
        const { data: insertedNewsletter, error: insertError } = await supabase
          .from('newsletters')
          .insert({
            user_id: user_id,
            gmail_message_id: newsletter.id,
            thread_id: newsletter.threadId,
            subject: newsletter.subject,
            sender_email: newsletter.senderEmail,
            sender_name: newsletter.senderName,
            received_date: newsletter.date,
            raw_content: newsletter.content,
            labels: newsletter.labels,
            status: 'processing'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting newsletter:', insertError);
          continue;
        }

        // Extract all news items from the newsletter
        let newsItems;
        try {
          newsItems = await extractNewsItemsFromNewsletter(newsletter.content, `${newsletter.senderName} <${newsletter.senderEmail}>`, user_id);
        } catch (err) {
          await supabase.from('processing_logs').insert({
            user_id: user_id,
            step: 'extract_news_items',
            status: 'failed',
            error_message: err.message
          });
          return res.status(500).json({ error: 'OpenAI extraction error', type: 'openai', details: err.message });
        }

        // Find matching source_id from newsletter_sources
        const { data: sourceMatch } = await supabase
          .from('newsletter_sources')
          .select('id')
          .eq('user_id', user_id)
          .eq('email_address', newsletter.senderEmail)
          .single();

        const sourceId = sourceMatch?.id || null;

        // Insert each news item into news_items table
        const insertedNewsItems = [];
        for (let i = 0; i < newsItems.length; i++) {
          const item = newsItems[i];
          // Generate embedding for the news item (use summary or content)
          let embedding;
          try {
            embedding = await generateEmbedding(item.summary || item.content || item.title, user_id);
          } catch (err) {
            await supabase.from('processing_logs').insert({
              user_id: user_id,
              step: 'generate_embedding',
              status: 'failed',
              error_message: err.message
            });
            return res.status(500).json({ error: 'OpenAI embedding error', type: 'openai', details: err.message });
          }
          const { data: insertedItem, error: itemError } = await supabase
            .from('news_items')
            .insert({
              newsletter_id: insertedNewsletter.id,
              user_id: user_id,
              source_id: sourceId,
              title: item.title,
              summary: item.summary,
              content: item.content,
              url: item.url,
              position: i,
              embedding: embedding,
              topics: item.topics || [],
              people_mentioned: item.people_mentioned || [],
              products_mentioned: item.products_mentioned || [],
              companies_mentioned: item.companies_mentioned || [],
              events_mentioned: item.events_mentioned || [],
              sentiment: item.sentiment,
              importance_score: item.importance_score || 0.5,
              extraction_model: item.extraction_model || 'gpt-3.5-turbo',
              confidence_score: item.confidence_score || 0.8
            })
            .select()
            .single();

          if (!itemError && insertedItem) {
            // Add newsletter info for story clustering
            insertedItem.newsletters = {
              sender_name: newsletter.senderName,
              sender_email: newsletter.senderEmail,
              subject: newsletter.subject,
              received_date: newsletter.date,
              credibility_score: sourceMatch?.credibility_score || 0.5
            };
            insertedNewsItems.push(insertedItem);
          }
        }

        // Process news items for story clustering (async - don't wait)
        if (insertedNewsItems.length > 0) {
          processNewsItemsForStories(user_id, insertedNewsItems).catch(error => {
            console.error('Story clustering error:', error);
            supabase.from('processing_logs').insert({
              user_id: user_id,
              step: 'story_clustering',
              status: 'failed',
              error_message: error.message
            });
          });
        }

        // Update newsletter status
        await supabase
          .from('newsletters')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', insertedNewsletter.id);

        processedNewsletters.push({
          ...insertedNewsletter,
          news_items_count: newsItems.length
        });

      } catch (error) {
        console.error('Error processing newsletter:', error);
        // Log error
        await supabase
          .from('processing_logs')
          .insert({
            user_id: user_id,
            step: 'process_newsletter',
            status: 'failed',
            error_message: error.message
          });
        return res.status(500).json({ error: 'Newsletter processing error', type: 'processing', details: error.message });
      }
    }

    return res.status(200).json({
      processed_count: processedNewsletters.length,
      newsletters: processedNewsletters
    });

  } catch (error) {
    console.error('Processing error:', error);
    return res.status(500).json({ error: 'Unknown processing error', type: 'unknown', details: error.message });
  }
} 

if (require.main === module) {
  // Simple test: POST with missing fields
  const req1 = { method: 'POST', body: {} };
  const res1 = { status: code => ({ json: obj => console.log('Test1:', code, obj) }) };
  module.exports(req1, res1);

  // Simple test: wrong method
  const req2 = { method: 'GET', body: {} };
  const res2 = { status: code => ({ json: obj => console.log('Test2:', code, obj) }) };
  module.exports(req2, res2);
} 