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

    // Fetch all completed newsletters and their insights for the user in the period
    const { data: newsletters, error } = await supabase
      .from('newsletters')
      .select(`id, received_date, newsletter_insights(*)`)
      .eq('user_id', user_id)
      .eq('status', 'completed')
      .gte('received_date', start.toISOString())
      .lte('received_date', end.toISOString());

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    const insights = (newsletters || [])
      .map(n => n.newsletter_insights)
      .filter(Boolean);

    if (insights.length === 0) {
      return res.status(200).json({
        message: 'No newsletters found for this period.',
        digest: null
      });
    }

    // Synthesize digest summary
    const digest = await synthesizeDigestSummary(insights);

    // Upsert into digest_summaries
    const { data: upserted, error: upsertError } = await supabase
      .from('digest_summaries')
      .upsert({
        user_id,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        newsletter_count: insights.length,
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