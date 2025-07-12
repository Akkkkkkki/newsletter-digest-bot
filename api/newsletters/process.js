const { supabase } = require('../utils/supabase');
const { GmailService } = require('../utils/gmail');
const { extractNewsletterInsights, generateEmbedding, extractNewsItemsFromNewsletter } = require('../utils/openai');
const { NEWSLETTER_DEFAULTS } = require('../../lib/config');
const { NEWSLETTER_DEFAULTS: CONFIG_DEFAULTS } = require('../../lib/config');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { access_token, refresh_token, user_id } = req.body;

    if (!access_token || !user_id) {
      return res.status(400).json({ error: 'Access token and user ID required' });
    }

    // Initialize Gmail service with refresh token if provided
    const gmailService = new GmailService(access_token, refresh_token);

    // Fetch user's allowed newsletter sources (only user-specified)
    const { data: sources, error: sourcesError } = await supabase
      .from('newsletter_sources')
      .select('email_address')
      .eq('user_id', user_id)
      .eq('is_active', true);
    if (sourcesError) {
      return res.status(500).json({ error: 'Failed to fetch newsletter sources' });
    }
    const allowedSenders = (sources || []).map(s => s.email_address.toLowerCase());
    // No default domains: only user-specified
    const allowedDomains = [];
    // Fetch already-processed Gmail message IDs for this user
    const { data: processed, error: processedError } = await supabase
      .from('newsletters')
      .select('gmail_message_id')
      .eq('user_id', user_id);
    if (processedError) {
      return res.status(500).json({ error: 'Failed to fetch processed message IDs' });
    }
    const processedMessageIds = (processed || []).map(n => n.gmail_message_id);
    // Fetch recent newsletters with filtering (only user-specified senders/domains)
    const newsletters = await gmailService.fetchRecentNewsletters({
      maxResults: CONFIG_DEFAULTS.limit,
      allowedSenders,
      allowedDomains,
      processedMessageIds
    });

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
        const senderInfo = `${newsletter.senderName} <${newsletter.senderEmail}>`;
        const newsItems = await extractNewsItemsFromNewsletter(newsletter.content, senderInfo);

        // Insert each news item into news_items table
        for (let i = 0; i < newsItems.length; i++) {
          const item = newsItems[i];
          // Generate embedding for the news item (use summary or content)
          const embedding = await generateEmbedding(item.summary || item.content || item.title);
          await supabase
            .from('news_items')
            .insert({
              newsletter_id: insertedNewsletter.id,
              user_id: user_id,
              source_id: null, // Optionally resolve source_id if needed
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
      }
    }

    return res.status(200).json({
      processed_count: processedNewsletters.length,
      newsletters: processedNewsletters
    });

  } catch (error) {
    console.error('Processing error:', error);
    return res.status(500).json({ error: 'Processing failed' });
  }
} 