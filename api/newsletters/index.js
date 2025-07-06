const { supabase } = require('../utils/supabase');
const { NEWSLETTER_DEFAULTS } = require('../../lib/config');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, limit = NEWSLETTER_DEFAULTS.limit, days_back = NEWSLETTER_DEFAULTS.daysBack, category, start_date, end_date } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    let query = supabase
      .from('news_items')
      .select(`
        id,
        title,
        summary,
        content,
        url,
        position,
        topics,
        people_mentioned,
        products_mentioned,
        companies_mentioned,
        events_mentioned,
        sentiment,
        importance_score,
        extraction_model,
        confidence_score,
        created_at,
        updated_at,
        newsletter_id,
        user_id,
        source_id,
        newsletters:newsletter_id (
          subject,
          sender_name,
          sender_email,
          received_date
        )
      `)
      .eq('user_id', user_id);

    if (start_date && end_date) {
      query = query.gte('created_at', new Date(start_date).toISOString())
                   .lte('created_at', new Date(end_date).toISOString());
    } else {
      query = query.gte('created_at', new Date(Date.now() - days_back * 24 * 60 * 60 * 1000).toISOString())
    }

    if (category) {
      query = query.contains('topics', [category]);
    }

    query = query.order('created_at', { ascending: false })
                 .limit(parseInt(limit));

    const { data: news_items, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    return res.status(200).json({
      news_items: news_items || [],
      count: news_items?.length || 0
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 