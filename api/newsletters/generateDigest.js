const { supabase } = require('../utils/supabase');
const { synthesizeDigestSummary } = require('../utils/openai');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, period_start, period_end } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }
    // Default to last 7 days
    const end = period_end ? new Date(period_end) : new Date();
    const start = period_start ? new Date(period_start) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all news items for the user in the period
    const { data: news_items, error } = await supabase
      .from('news_items')
      .select('*')
      .eq('user_id', user_id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (!news_items || news_items.length === 0) {
      return res.status(200).json({
        message: 'No news items found for this period.',
        digest: null
      });
    }

    // Synthesize digest summary
    const digest = await synthesizeDigestSummary(news_items);

    // Upsert into digest_summaries
    const { data: upserted, error: upsertError } = await supabase
      .from('digest_summaries')
      .upsert({
        user_id,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        newsletter_count: news_items.length,
        top_topics: digest.top_topics,
        key_insights: digest.key_insights,
        summary_content: digest.summary_content,
        sentiment_analysis: digest.sentiment_analysis,
        generated_at: new Date().toISOString()
      }, { onConflict: ['user_id', 'period_start', 'period_end'] })
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return res.status(500).json({ error: 'Failed to store digest summary' });
    }

    return res.status(200).json({
      digest: upserted
    });
  } catch (error) {
    console.error('Digest synthesis error:', error);
    return res.status(500).json({ error: 'Digest synthesis failed' });
  }
} 