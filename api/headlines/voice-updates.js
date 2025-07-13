const { supabase } = require('../../lib/supabase.node');

/**
 * API endpoint for Voice Updates - latest content from prioritized sources
 * GET /api/headlines/voice-updates
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      period_hours = 24,
      min_priority = 0,
      limit = 10
    } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const startTime = Date.now();
    const periodStart = new Date(Date.now() - (period_hours * 60 * 60 * 1000)).toISOString();

    // Get voice updates from high-priority sources
    const { data: voiceUpdates, error: updatesError } = await supabase
      .from('newsletter_sources')
      .select(`
        id,
        email_address,
        name,
        voice_priority,
        credibility_score,
        last_content_at,
        content_frequency,
        expertise_keywords,
        news_items:newsletters(
          news_items!inner(
            id,
            title,
            summary,
            importance_score,
            created_at,
            newsletters:newsletter_id(
              subject,
              received_date,
              sender_name,
              sender_email
            )
          )
        )
      `)
      .eq('user_id', user_id)
      .eq('is_active', true)
      .gte('voice_priority', min_priority)
      .gte('last_content_at', periodStart)
      .order('voice_priority', { ascending: false })
      .order('last_content_at', { ascending: false })
      .limit(limit);

    if (updatesError) {
      console.error('Error fetching voice updates:', updatesError);
      return res.status(500).json({ error: 'Failed to fetch voice updates' });
    }

    // Process and format the voice updates
    const updates = [];

    for (const source of voiceUpdates || []) {
      // Get latest news items from this source in the period
      const { data: latestItems, error: itemsError } = await supabase
        .from('news_items')
        .select(`
          id,
          title,
          summary,
          importance_score,
          created_at,
          newsletters:newsletter_id(
            subject,
            received_date,
            sender_name,
            sender_email
          )
        `)
        .eq('user_id', user_id)
        .eq('source_id', source.id)
        .gte('created_at', periodStart)
        .order('created_at', { ascending: false })
        .limit(5); // Get top 5 recent items from this source

      if (itemsError || !latestItems || latestItems.length === 0) {
        continue;
      }

      // Find the most important/recent headline
      const latestHeadline = latestItems.reduce((best, current) => {
        const currentScore = (current.importance_score || 0) + 
                           (new Date(current.created_at).getTime() / 1000000000); // Add recency bonus
        const bestScore = (best.importance_score || 0) + 
                         (new Date(best.created_at).getTime() / 1000000000);
        return currentScore > bestScore ? current : best;
      });

      updates.push({
        source: {
          id: source.id,
          name: source.name || extractNameFromEmail(source.email_address),
          email: source.email_address,
          voice_priority: source.voice_priority,
          authority_score: source.credibility_score || 0.5,
          expertise_keywords: source.expertise_keywords || []
        },
        latest_headline: {
          id: latestHeadline.id,
          title: latestHeadline.title,
          summary: latestHeadline.summary,
          published_at: latestHeadline.created_at,
          importance_score: latestHeadline.importance_score || 0.5,
          newsletter_subject: latestHeadline.newsletters?.subject
        },
        activity_summary: {
          items_this_period: latestItems.length,
          last_active: latestItems[0]?.created_at,
          frequency_score: source.content_frequency || 0
        }
      });
    }

    // Sort by priority and recency
    updates.sort((a, b) => {
      // Primary sort: voice priority
      if (a.source.voice_priority !== b.source.voice_priority) {
        return b.source.voice_priority - a.source.voice_priority;
      }
      // Secondary sort: recency
      return new Date(b.latest_headline.published_at).getTime() - 
             new Date(a.latest_headline.published_at).getTime();
    });

    const response = {
      updates: updates.slice(0, limit),
      metadata: {
        tracked_voices: voiceUpdates?.length || 0,
        active_voices: updates.length,
        scan_time_ms: Date.now() - startTime,
        period_covered: `${period_hours} hours`,
        period_start: periodStart,
        filters: {
          min_priority: parseInt(min_priority),
          limit: parseInt(limit)
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Voice updates API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Extract a readable name from an email address
 */
function extractNameFromEmail(email) {
  if (!email) return 'Unknown';
  
  const beforeAt = email.split('@')[0];
  
  // Handle common patterns
  if (beforeAt.includes('noreply') || beforeAt.includes('no-reply')) {
    const domain = email.split('@')[1];
    return domain.split('.')[0];
  }
  
  // Convert underscores/dots to spaces and title case
  return beforeAt
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Update voice priority for a source
 * PUT /api/headlines/voice-priority
 */
async function updateVoicePriority(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, source_id, voice_priority } = req.body;

    if (!user_id || !source_id || voice_priority === undefined) {
      return res.status(400).json({ error: 'User ID, source ID, and voice priority required' });
    }

    if (voice_priority < 0 || voice_priority > 10) {
      return res.status(400).json({ error: 'Voice priority must be between 0 and 10' });
    }

    const { error } = await supabase
      .from('newsletter_sources')
      .update({ 
        voice_priority: parseInt(voice_priority),
        updated_at: new Date().toISOString()
      })
      .eq('id', source_id)
      .eq('user_id', user_id);

    if (error) {
      console.error('Error updating voice priority:', error);
      return res.status(500).json({ error: 'Failed to update voice priority' });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Voice priority update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Analyze and update expertise keywords for sources using LLM
 * This should be run periodically as a background job
 */
async function updateSourceExpertise(userId, sourceId = null) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    // Get sources to analyze
    let query = supabase
      .from('newsletter_sources')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
      
    if (sourceId) {
      query = query.eq('id', sourceId);
    }

    const { data: sources } = await query;

    if (!sources) return;

    for (const source of sources) {
      // Get recent news items from this source
      const { data: recentItems } = await supabase
        .from('news_items')
        .select('title, summary, topics, companies_mentioned, people_mentioned')
        .eq('user_id', userId)
        .eq('source_id', source.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false })
        .limit(20);

      if (!recentItems || recentItems.length === 0) continue;

      // Use LLM to analyze expertise
      const prompt = `
Analyze the content from this newsletter source and identify their key expertise areas.

Source: ${source.name || source.email_address}

Recent Content:
${recentItems.map((item, i) => `
${i + 1}. ${item.title}
   Summary: ${item.summary}
   Topics: ${(item.topics || []).join(', ')}
   Companies: ${(item.companies_mentioned || []).join(', ')}
`).join('')}

Based on this content, identify the top 5 expertise keywords that best describe what this source specializes in.

Return as a JSON array of strings (lowercase, single words or short phrases):
["ai", "machine learning", "startups", "venture capital", "cryptocurrency"]

Focus on:
- Technology areas (ai, blockchain, web3, etc.)
- Industry sectors (fintech, healthtech, etc.) 
- Business areas (funding, acquisitions, etc.)
- Role expertise (cto, founder, researcher, etc.)
`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 100
        });

        const content = response.choices[0].message.content.trim();
        const keywords = JSON.parse(content);

        if (Array.isArray(keywords)) {
          // Calculate content frequency (items per week)
          const daysSpan = Math.max(1, (Date.now() - new Date(recentItems[recentItems.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24));
          const frequency = (recentItems.length / daysSpan) * 7;

          // Update source with expertise
          await supabase
            .from('newsletter_sources')
            .update({
              expertise_keywords: keywords.slice(0, 5),
              content_frequency: Math.round(frequency * 10) / 10,
              updated_at: new Date().toISOString()
            })
            .eq('id', source.id);

          console.log(`Updated expertise for ${source.email_address}:`, keywords);
        }

      } catch (llmError) {
        console.error('Error analyzing source expertise:', llmError);
      }
    }

  } catch (error) {
    console.error('Error updating source expertise:', error);
  }
}