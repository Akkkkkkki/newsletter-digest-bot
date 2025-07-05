const { supabase } = require('../utils/supabase');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, limit = 20, days_back = 7, category, start_date, end_date } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    let query = supabase
      .from('newsletters')
      .select(`
        id,
        subject,
        sender_name,
        sender_email,
        received_date,
        status,
        newsletter_insights (
          summary,
          key_topics,
          sentiment,
          category,
          companies_mentioned,
          people_mentioned,
          action_items,
          links_extracted
        )
      `)
      .eq('user_id', user_id);

    if (start_date && end_date) {
      query = query.gte('received_date', new Date(start_date).toISOString())
                   .lte('received_date', new Date(end_date).toISOString());
    } else {
      query = query.gte('received_date', new Date(Date.now() - days_back * 24 * 60 * 60 * 1000).toISOString())
    }

    if (category) {
      query = query.eq('newsletter_insights.category', category);
    }

    query = query.order('received_date', { ascending: false })
                 .limit(parseInt(limit));

    const { data: newsletters, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    return res.status(200).json({
      newsletters: newsletters || [],
      count: newsletters?.length || 0
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 