const { supabase } = require('../utils/supabase');
const { GmailService } = require('../utils/gmail');
const { extractNewsletterInsights } = require('../utils/openai');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { access_token, user_id } = req.body;

    if (!access_token || !user_id) {
      return res.status(400).json({ error: 'Access token and user ID required' });
    }

    // Initialize Gmail service
    const gmailService = new GmailService(access_token);

    // Fetch recent newsletters
    const newsletters = await gmailService.fetchRecentNewsletters(10);

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

        // Extract insights using OpenAI
        const senderInfo = `${newsletter.senderName} <${newsletter.senderEmail}>`;
        const insights = await extractNewsletterInsights(newsletter.content, senderInfo);

        // Insert insights
        const { error: insightsError } = await supabase
          .from('newsletter_insights')
          .insert({
            newsletter_id: insertedNewsletter.id,
            summary: insights.summary,
            key_topics: insights.key_topics,
            sentiment: insights.sentiment,
            category: insights.category,
            companies_mentioned: insights.companies_mentioned,
            people_mentioned: insights.people_mentioned,
            action_items: insights.action_items,
            links_extracted: insights.links_extracted,
            extraction_model: 'gpt-3.5-turbo'
          });

        if (insightsError) {
          console.error('Error inserting insights:', insightsError);
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
          insights: insights
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