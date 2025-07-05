const { supabase } = require('../utils/supabase');
const { GmailService } = require('../utils/gmail');
const { extractNewsletterInsights, generateEmbedding } = require('../utils/openai');

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

    // Fetch user's allowed newsletter sources
    const { data: sources, error: sourcesError } = await supabase
      .from('newsletter_sources')
      .select('email_address')
      .eq('user_id', user_id)
      .eq('is_active', true);
    if (sourcesError) {
      return res.status(500).json({ error: 'Failed to fetch newsletter sources' });
    }
    const allowedSenders = (sources || []).map(s => s.email_address.toLowerCase());
    // Optionally, allow some default domains (e.g., substack.com)
    const allowedDomains = ['substack.com', 'deeplearning.ai'];
    // Fetch already-processed Gmail message IDs for this user
    const { data: processed, error: processedError } = await supabase
      .from('newsletters')
      .select('gmail_message_id')
      .eq('user_id', user_id);
    if (processedError) {
      return res.status(500).json({ error: 'Failed to fetch processed message IDs' });
    }
    const processedMessageIds = (processed || []).map(n => n.gmail_message_id);
    // Fetch recent newsletters with filtering
    const newsletters = await gmailService.fetchRecentNewsletters({
      maxResults: 10,
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

        // Extract insights using OpenAI
        const senderInfo = `${newsletter.senderName} <${newsletter.senderEmail}>`;
        const insights = await extractNewsletterInsights(newsletter.content, senderInfo);

        // Insert insights
        const { data: insertedInsight, error: insightsError } = await supabase
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
          })
          .select()
          .single();

        if (insightsError) {
          console.error('Error inserting insights:', insightsError);
        } else if (insertedInsight) {
          // Generate embedding for the summary
          const embedding = await generateEmbedding(insights.summary);
          if (embedding) {
            // Store embedding in newsletter_insights
            await supabase
              .from('newsletter_insights')
              .update({ embedding })
              .eq('id', insertedInsight.id);

            // Similarity grouping logic
            // 1. Find existing groups for this user with cosine similarity > 0.85
            const { data: groups } = await supabase
              .rpc('match_similarity_groups', {
                user_id: user_id,
                embedding: embedding,
                threshold: 0.85
              });

            let groupId = null;
            if (groups && groups.length > 0) {
              // Use the most similar group
              groupId = groups[0].id;
              // Add to group membership
              await supabase
                .from('newsletter_group_membership')
                .insert({
                  group_id: groupId,
                  newsletter_insight_id: insertedInsight.id,
                  similarity_score: groups[0].similarity
                });
              // Optionally: update group embedding (average of all member embeddings)
              // (Not implemented here for brevity)
            } else {
              // Create new group
              const { data: newGroup } = await supabase
                .from('newsletter_similarity_groups')
                .insert({
                  user_id: user_id,
                  group_embedding: embedding,
                  representative_summary: insights.summary
                })
                .select()
                .single();
              if (newGroup) {
                groupId = newGroup.id;
                await supabase
                  .from('newsletter_group_membership')
                  .insert({
                    group_id: groupId,
                    newsletter_insight_id: insertedInsight.id,
                    similarity_score: 1.0
                  });
              }
            }
          }
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