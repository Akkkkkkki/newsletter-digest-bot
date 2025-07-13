const { supabase } = require('../../lib/supabase.node');
const { CONSENSUS_DEFAULTS } = require('../../lib/config');

// Simple relevance scoring function
function calculateRelevanceScore(group) {
  // Weighted sum: mention count (0.5), avg importance (0.3), avg confidence (0.2)
  const mentionScore = group.mention_count || 0;
  const avgImportance = group.avg_importance || 0;
  const avgConfidence = group.avg_confidence || 0;
  return (
    0.5 * mentionScore +
    0.3 * avgImportance +
    0.2 * avgConfidence
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const {
    user_id,
    period_start,
    period_end,
    min_mentions = CONSENSUS_DEFAULTS.minMentions,
    similarity_threshold,
    max_per_query
  } = req.query;
  if (!user_id) return res.status(400).json({ error: 'User ID required' });
  if (!period_start || !period_end) return res.status(400).json({ error: 'Period start and end required' });

  // Use config defaults if not provided
  const simThreshold = similarity_threshold !== undefined ? parseFloat(similarity_threshold) : CONSENSUS_DEFAULTS.similarityThreshold;
  const maxPerQuery = max_per_query !== undefined ? parseInt(max_per_query) : CONSENSUS_DEFAULTS.maxPerQuery;

  // Fetch all news items for the user in the period (with embeddings)
  const { data: news_items, error } = await supabase
    .from('news_items')
    .select(`
      id, title, summary, content, url, position, embedding, topics, people_mentioned, products_mentioned, companies_mentioned, events_mentioned, sentiment, importance_score, extraction_model, confidence_score, created_at, updated_at, newsletter_id, user_id, source_id, newsletters:newsletter_id (
        subject, sender_name, sender_email, received_date
      )
    `)
    .eq('user_id', user_id)
    .gte('created_at', period_start)
    .lte('created_at', period_end)
    .not('embedding', 'is', null);

  if (error) return res.status(500).json({ error: error.message });
  if (!news_items || news_items.length === 0) return res.status(200).json({ consensus: [] });

  // Grouping logic: for each item, find similar items using vector search, then cluster
  const processed = new Set();
  const groups = [];

  for (const item of news_items) {
    if (processed.has(item.id) || !item.embedding) continue;
    // Use item's embedding to find similar items
    const { data: similar, error: simError } = await supabase.rpc('match_news_items', {
      query_embedding: item.embedding,
      user_id,
      period_start,
      period_end,
      match_threshold: simThreshold,
      match_count: maxPerQuery
    });
    if (simError) continue;
    // Filter out already processed
    const groupItems = (similar || []).filter(i => !processed.has(i.id));
    if (groupItems.length === 0) continue;
    // Mark all as processed
    groupItems.forEach(i => processed.add(i.id));
    // Compose group object
    const avgImportance = groupItems.reduce((sum, i) => sum + (i.importance_score || 0), 0) / groupItems.length;
    const avgConfidence = groupItems.reduce((sum, i) => sum + (i.confidence_score || 0), 0) / groupItems.length;
    const group = {
      group_id: `group_${groups.length}`,
      title: groupItems[0].title,
      summary: groupItems[0].summary,
      mentions: groupItems.map(i => ({
        news_item_id: i.id,
        newsletter_id: i.newsletter_id,
        sender_name: i.newsletters?.sender_name,
        sender_email: i.newsletters?.sender_email,
        received_date: i.newsletters?.received_date,
        subject: i.newsletters?.subject,
        individual_summary: i.summary,
        importance_score: i.importance_score,
        confidence_score: i.confidence_score
      })),
      mention_count: groupItems.length,
      avg_importance: avgImportance,
      avg_confidence: avgConfidence,
      topics: [...new Set(groupItems.flatMap(i => i.topics || []))],
      companies: [...new Set(groupItems.flatMap(i => i.companies_mentioned || []))],
      people: [...new Set(groupItems.flatMap(i => i.people_mentioned || []))],
    };
    group.relevance_score = calculateRelevanceScore(group);
    groups.push(group);
  }

  // Filter and sort groups
  const consensus = groups
    .filter(g => g.mention_count >= min_mentions)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  // Persist consensus groups and their members to the database (non-blocking)
  (async () => {
    for (const group of consensus) {
      // Insert group row
      const { data: groupRow, error: groupError } = await supabase
        .from('news_item_groups')
        .insert([
          {
            user_id,
            period_start,
            period_end,
            summary: group.summary,
            relevance_score: group.relevance_score,
          },
        ])
        .select('id')
        .single();
      if (groupError) {
        console.error('Failed to insert news_item_group:', groupError);
        continue;
      }
      const group_id = groupRow.id;
      // Insert group members
      const members = group.mentions.map(m => ({
        group_id,
        news_item_id: m.news_item_id,
      }));
      if (members.length > 0) {
        const { error: membersError } = await supabase
          .from('news_item_group_members')
          .insert(members);
        if (membersError) {
          console.error('Failed to insert news_item_group_members:', membersError);
        }
      }
    }
  })();

  return res.status(200).json({
    consensus,
    metadata: {
      total_items: news_items.length,
      groups_found: consensus.length,
      similarity_threshold: simThreshold,
      max_per_query: maxPerQuery
    }
  });
} 