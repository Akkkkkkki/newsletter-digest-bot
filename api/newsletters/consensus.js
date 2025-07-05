const { supabase } = require('../../utils/supabase');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { user_id, period_start, period_end, min_mentions = 2 } = req.query;
  if (!user_id) return res.status(400).json({ error: 'User ID required' });
  if (!period_start || !period_end) return res.status(400).json({ error: 'Period start and end required' });

  // 1. Find all groups for this user in the period
  const { data: groups, error } = await supabase
    .from('newsletter_similarity_groups')
    .select(`
      id,
      representative_summary,
      created_at,
      newsletter_group_membership (
        similarity_score,
        newsletter_insights (
          summary,
          newsletter_id,
          newsletter (
            subject,
            sender_name,
            sender_email,
            received_date
          )
        )
      )
    `)
    .eq('user_id', user_id)
    .gte('created_at', period_start)
    .lte('created_at', period_end);

  if (error) return res.status(500).json({ error: error.message });

  // 2. Filter and sort by number of unique newsletters
  const consensus = (groups || [])
    .map(group => {
      const mentions = (group.newsletter_group_membership || [])
        .filter(m => m.newsletter_insights && m.newsletter_insights.newsletter)
        .map(m => ({
          summary: m.newsletter_insights.summary,
          subject: m.newsletter_insights.newsletter.subject,
          sender_name: m.newsletter_insights.newsletter.sender_name,
          sender_email: m.newsletter_insights.newsletter.sender_email,
          received_date: m.newsletter_insights.newsletter.received_date,
          similarity_score: m.similarity_score
        }));
      return {
        group_id: group.id,
        summary: group.representative_summary,
        mentions,
        mention_count: mentions.length
      };
    })
    .filter(g => g.mention_count >= min_mentions)
    .sort((a, b) => b.mention_count - a.mention_count);

  return res.status(200).json({ consensus });
} 