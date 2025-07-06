const { supabase } = require('../../utils/supabase');
const { CONSENSUS_DEFAULTS } = require('../../lib/config');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { user_id, period_start, period_end, min_mentions = CONSENSUS_DEFAULTS.minMentions } = req.query;
  if (!user_id) return res.status(400).json({ error: 'User ID required' });
  if (!period_start || !period_end) return res.status(400).json({ error: 'Period start and end required' });

  // Fetch all news items for the user in the period
  const { data: news_items, error } = await supabase
    .from('news_items')
    .select(`
      id, title, summary, newsletter_id, created_at, newsletters:newsletter_id (
        subject, sender_name, sender_email, received_date
      )
    `)
    .eq('user_id', user_id)
    .gte('created_at', period_start)
    .lte('created_at', period_end);

  if (error) return res.status(500).json({ error: error.message });

  // Group by identical title (proxy for similarity)
  const groups = {};
  for (const item of news_items || []) {
    const key = item.title.trim().toLowerCase();
    if (!groups[key]) {
      groups[key] = {
        title: item.title,
        summary: item.summary,
        mentions: [],
      };
    }
    groups[key].mentions.push({
      newsletter_id: item.newsletter_id,
      sender_name: item.newsletters?.sender_name,
      sender_email: item.newsletters?.sender_email,
      received_date: item.newsletters?.received_date,
      subject: item.newsletters?.subject,
    });
  }

  // Convert to array and filter by min_mentions
  const consensus = Object.values(groups)
    .map(group => ({
      title: group.title,
      summary: group.summary,
      mentions: group.mentions,
      mention_count: group.mentions.length
    }))
    .filter(g => g.mention_count >= min_mentions)
    .sort((a, b) => b.mention_count - a.mention_count);

  return res.status(200).json({ consensus });
} 