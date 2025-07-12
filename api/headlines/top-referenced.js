const { supabase } = require('../utils/supabase');
const { StoryClusteringEngine } = require('../utils/storyCluster');

const clusteringEngine = new StoryClusteringEngine();

/**
 * API endpoint for Top Referenced News - stories mentioned across multiple sources
 * GET /api/headlines/top-referenced
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      period_hours = 24,
      min_mentions = 2,
      limit = 10
    } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const startTime = Date.now();
    const periodStart = new Date(Date.now() - (period_hours * 60 * 60 * 1000)).toISOString();

    // Get top referenced stories from story_mentions table
    const { data: topStories, error: storiesError } = await supabase
      .from('story_mentions')
      .select(`
        *,
        news_items:news_item_ids (
          id, title, summary, newsletters:newsletter_id (
            sender_name, sender_email, subject, received_date
          )
        )
      `)
      .eq('user_id', user_id)
      .gte('last_mentioned_at', periodStart)
      .gte('mention_count', min_mentions)
      .order('trending_score', { ascending: false })
      .limit(limit);

    if (storiesError) {
      console.error('Error fetching top stories:', storiesError);
      return res.status(500).json({ error: 'Failed to fetch top referenced news' });
    }

    // Format response for frontend
    const headlines = topStories.map(story => ({
      id: story.id,
      cluster_id: story.story_cluster_id,
      title: story.canonical_title,
      summary: story.canonical_summary,
      mention_count: story.mention_count,
      trending_score: story.trending_score,
      velocity_score: story.velocity_score,
      sources: story.mentioning_sources || [],
      first_seen: story.first_mentioned_at,
      last_updated: story.last_mentioned_at,
      trend_analysis: story.trend_analysis,
      impact_assessment: story.impact_assessment,
      key_entities: story.key_entities || {}
    }));

    const response = {
      headlines,
      metadata: {
        total_stories: headlines.length,
        scan_time_ms: Date.now() - startTime,
        period_covered: `${period_hours} hours`,
        period_start: periodStart,
        filters: {
          min_mentions: parseInt(min_mentions),
          limit: parseInt(limit)
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Top referenced API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Background job to process new news items and update story mentions
 * This should be called after new newsletters are processed
 */
async function processNewsItemsForStories(userId, newsItems) {
  console.log(`Processing ${newsItems.length} news items for story clustering...`);
  
  for (const newsItem of newsItems) {
    try {
      // Get recent stories for this user (last 7 days)
      const { data: recentStories } = await supabase
        .from('story_mentions')
        .select('*')
        .eq('user_id', userId)
        .gte('last_mentioned_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('last_mentioned_at', { ascending: false })
        .limit(50);

      // Check if this news item matches an existing story
      const matchingStory = await clusteringEngine.findMatchingStory(newsItem, recentStories || []);
      
      if (matchingStory) {
        // Update existing story
        await updateExistingStory(matchingStory, newsItem);
      } else {
        // Create new story
        await createNewStory(userId, newsItem);
      }

    } catch (error) {
      console.error('Error processing news item for story clustering:', error);
    }
  }

  // Update trending scores for all stories
  await updateTrendingScores(userId);
}

/**
 * Update an existing story with a new mention
 */
async function updateExistingStory(existingStory, newsItem) {
  try {
    // Get source info for this news item
    const sourceInfo = {
      name: newsItem.newsletters?.sender_name || 'Unknown',
      email: newsItem.newsletters?.sender_email || '',
      credibility_score: newsItem.newsletters?.credibility_score || 0.5,
      received_date: newsItem.newsletters?.received_date
    };

    // Calculate importance score
    const importanceScore = clusteringEngine.calculateImportanceScore(newsItem, sourceInfo);

    // Update story_mentions table
    const { error: updateError } = await supabase
      .from('story_mentions')
      .update({
        mention_count: existingStory.mention_count + 1,
        mentioning_sources: [...(existingStory.mentioning_sources || []), sourceInfo],
        news_item_ids: [...(existingStory.news_item_ids || []), newsItem.id],
        importance_score: Math.max(existingStory.importance_score || 0, importanceScore),
        last_mentioned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingStory.id);

    if (updateError) {
      console.error('Error updating existing story:', updateError);
    } else {
      console.log(`Updated story: ${existingStory.canonical_title} (${existingStory.mention_count + 1} mentions)`);
    }

  } catch (error) {
    console.error('Error in updateExistingStory:', error);
  }
}

/**
 * Create a new story entry
 */
async function createNewStory(userId, newsItem) {
  try {
    // Generate cluster ID using LLM
    const clusterId = await clusteringEngine.generateClusterID(newsItem);
    
    // Get source info
    const sourceInfo = {
      name: newsItem.newsletters?.sender_name || 'Unknown',
      email: newsItem.newsletters?.sender_email || '',
      credibility_score: newsItem.newsletters?.credibility_score || 0.5,
      received_date: newsItem.newsletters?.received_date
    };

    // Calculate importance score
    const importanceScore = clusteringEngine.calculateImportanceScore(newsItem, sourceInfo);

    // Generate initial analysis
    const storyData = {
      canonical_title: newsItem.title,
      canonical_summary: newsItem.summary,
      mention_count: 1,
      mentioning_sources: [sourceInfo],
      news_item_ids: [newsItem.id]
    };

    const analysis = await clusteringEngine.generateStoryAnalysis(storyData);

    // Insert new story
    const { error: insertError } = await supabase
      .from('story_mentions')
      .insert({
        user_id: userId,
        story_cluster_id: clusterId,
        canonical_title: newsItem.title,
        canonical_summary: newsItem.summary,
        mention_count: 1,
        mentioning_sources: [sourceInfo],
        news_item_ids: [newsItem.id],
        trend_analysis: analysis.trend_analysis,
        impact_assessment: analysis.impact_assessment,
        key_entities: analysis.key_entities,
        importance_score: importanceScore,
        trending_score: importanceScore, // Initial trending score
        velocity_score: 1.0, // First mention
        first_mentioned_at: new Date().toISOString(),
        last_mentioned_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error creating new story:', insertError);
    } else {
      console.log(`Created new story: ${newsItem.title}`);
    }

  } catch (error) {
    console.error('Error in createNewStory:', error);
  }
}

/**
 * Update trending scores for all recent stories
 */
async function updateTrendingScores(userId) {
  try {
    const { data: recentStories } = await supabase
      .from('story_mentions')
      .select('*')
      .eq('user_id', userId)
      .gte('last_mentioned_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!recentStories) return;

    for (const story of recentStories) {
      // Calculate time decay (more recent = higher score)
      const hoursSinceLastMention = (Date.now() - new Date(story.last_mentioned_at).getTime()) / (1000 * 60 * 60);
      const timeDaycay = Math.max(0.1, 1.0 - (hoursSinceLastMention / (7 * 24))); // Decay over 7 days

      // Calculate recency bonus
      const recencyBonus = hoursSinceLastMention < 24 ? 1.5 : 
                          hoursSinceLastMention < 48 ? 1.2 : 1.0;

      // Calculate velocity (mentions per hour since first mention)
      const hoursSinceFirstMention = Math.max(1, (new Date(story.last_mentioned_at).getTime() - new Date(story.first_mentioned_at).getTime()) / (1000 * 60 * 60));
      const velocity = story.mention_count / hoursSinceFirstMention;

      // Calculate trending score
      const trendingScore = (story.mention_count * timeDaycay * recencyBonus + velocity * 10) * story.importance_score;

      // Update the story
      await supabase
        .from('story_mentions')
        .update({
          trending_score: Math.round(trendingScore * 100) / 100,
          velocity_score: Math.round(velocity * 100) / 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', story.id);
    }

    console.log(`Updated trending scores for ${recentStories.length} stories`);

  } catch (error) {
    console.error('Error updating trending scores:', error);
  }
}

module.exports = { processNewsItemsForStories };