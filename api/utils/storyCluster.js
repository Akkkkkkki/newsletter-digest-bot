const { extractNewsletterInsights, generateEmbedding } = require('./openai');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * LLM-based story clustering system for identifying duplicate/similar stories
 * across different newsletter sources
 */
class StoryClusteringEngine {
  
  /**
   * Generate a unique cluster ID for a story using LLM analysis
   * @param {Object} newsItem - The news item to cluster
   * @returns {Promise<string>} - Unique cluster ID
   */
  async generateClusterID(newsItem) {
    const prompt = `
You are an expert at identifying the core essence of news stories. 

Analyze this news item and generate a stable, unique identifier that would be the same for any news item about the same story/event, regardless of how it's written.

News Item:
Title: ${newsItem.title}
Summary: ${newsItem.summary}
Companies: ${(newsItem.companies_mentioned || []).join(', ')}
People: ${(newsItem.people_mentioned || []).join(', ')}
Topics: ${(newsItem.topics || []).join(', ')}

Instructions:
1. Identify the CORE EVENT/STORY (e.g., "OpenAI releases GPT-5", "Apple acquires AI startup", "New AI regulation proposed")
2. Normalize key entities (use canonical names: "OpenAI" not "Open AI", "Anthropic" not "Anthropic AI")
3. Generate a short, stable identifier using format: "entity_action_object" (e.g., "openai_release_gpt5", "apple_acquire_aistartup")
4. Use lowercase, underscores, no special characters
5. If it's about multiple companies/people, use the most important one
6. Focus on the ACTION/EVENT, not opinions or analysis

Return ONLY the cluster ID, nothing else.

Examples:
- "OpenAI announces GPT-4 Turbo" → "openai_announce_gpt4turbo"  
- "Google's new AI model beats GPT-4" → "google_release_aimodel"
- "Microsoft invests $10B in OpenAI" → "microsoft_invest_openai"
- "New EU AI regulation passed" → "eu_pass_airegulation"
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 50
      });

      const clusterId = response.choices[0].message.content.trim().toLowerCase();
      
      // Validate cluster ID format
      if (!/^[a-z0-9_]+$/.test(clusterId)) {
        console.warn('Invalid cluster ID generated, using fallback:', clusterId);
        return this.generateFallbackClusterID(newsItem);
      }
      
      return clusterId;
    } catch (error) {
      console.error('Error generating cluster ID:', error);
      return this.generateFallbackClusterID(newsItem);
    }
  }

  /**
   * Fallback cluster ID generation using simple text processing
   */
  generateFallbackClusterID(newsItem) {
    const title = newsItem.title.toLowerCase();
    const companies = (newsItem.companies_mentioned || []).join('_').toLowerCase();
    const topics = (newsItem.topics || []).slice(0, 2).join('_').toLowerCase();
    
    const normalized = `${companies}_${topics}_${title.substring(0, 20)}`
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    return normalized.substring(0, 50);
  }

  /**
   * Check if a news item matches existing stories using LLM
   * @param {Object} newsItem - New news item to check
   * @param {Array} recentStories - Array of recent story mentions from DB
   * @returns {Promise<Object|null>} - Matching story object or null
   */
  async findMatchingStory(newsItem, recentStories) {
    if (!recentStories || recentStories.length === 0) {
      return null;
    }

    // First try quick cluster ID matching
    const newClusterID = await this.generateClusterID(newsItem);
    const exactMatch = recentStories.find(story => story.story_cluster_id === newClusterID);
    
    if (exactMatch) {
      return exactMatch;
    }

    // If no exact match, use LLM to check semantic similarity
    const candidateStories = recentStories.slice(0, 10); // Limit for performance
    
    const prompt = `
You are an expert at identifying when news items are about the same story or event.

NEW ITEM:
Title: ${newsItem.title}
Summary: ${newsItem.summary}
Companies: ${(newsItem.companies_mentioned || []).join(', ')}
People: ${(newsItem.people_mentioned || []).join(', ')}

EXISTING STORIES:
${candidateStories.map((story, i) => `
${i + 1}. ID: ${story.story_cluster_id}
   Title: ${story.canonical_title}
   Summary: ${story.canonical_summary}
   Mentions: ${story.mention_count}
`).join('')}

Task: Determine if the NEW ITEM is about the same core story/event as any EXISTING STORY.

Criteria for "same story":
- Same product release/announcement (even with different details)
- Same acquisition/partnership (even with different financial details) 
- Same regulatory action/policy
- Same research breakthrough/paper
- Same executive change/hiring

NOT the same story:
- Different companies doing similar things
- Different products in same category
- Different people with same role
- Related but separate events

Respond with:
- If match found: "MATCH: [story_number]" (e.g., "MATCH: 3")
- If no match: "NO_MATCH"

Response:`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 20
      });

      const result = response.choices[0].message.content.trim();
      
      if (result.startsWith('MATCH:')) {
        const storyNumber = parseInt(result.split(':')[1].trim());
        if (storyNumber > 0 && storyNumber <= candidateStories.length) {
          return candidateStories[storyNumber - 1];
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding matching story:', error);
      return null;
    }
  }

  /**
   * Generate enhanced story analysis using LLM
   * @param {Object} storyMention - Story mention object with news items
   * @returns {Promise<Object>} - Enhanced analysis
   */
  async generateStoryAnalysis(storyMention) {
    const newsItems = storyMention.news_item_ids || [];
    const sources = storyMention.mentioning_sources || [];
    
    const prompt = `
You are an expert analyst providing insights on trending tech news stories.

STORY: ${storyMention.canonical_title}
SUMMARY: ${storyMention.canonical_summary}
MENTIONS: ${storyMention.mention_count} sources
SOURCES: ${sources.map(s => s.name || s.email).join(', ')}

Provide a brief analysis in this JSON format:
{
  "trend_analysis": "Brief analysis of why this story is trending (1-2 sentences)",
  "impact_assessment": "Assessment of potential impact/significance (1-2 sentences)", 
  "key_entities": {
    "companies": ["list of key companies"],
    "people": ["list of key people"],
    "technologies": ["list of key technologies/products"]
  }
}

Focus on:
- Why this story matters to tech professionals
- Potential industry impact
- Key players and technologies involved
- Future implications

Keep it concise and professional.
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300
      });

      const content = response.choices[0].message.content.trim();
      const cleanContent = content.replace(/```json\n?|```\n?/g, '');
      
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('Error generating story analysis:', error);
      return {
        trend_analysis: "This story is gaining attention across multiple sources.",
        impact_assessment: "Monitoring for potential industry impact.",
        key_entities: { companies: [], people: [], technologies: [] }
      };
    }
  }

  /**
   * Calculate story importance using multiple signals
   * @param {Object} newsItem - News item object
   * @param {Object} sourceInfo - Source information
   * @returns {number} - Importance score (0-1)
   */
  calculateImportanceScore(newsItem, sourceInfo) {
    let score = newsItem.importance_score || 0.5;
    
    // Boost score based on source authority
    if (sourceInfo && sourceInfo.credibility_score) {
      score = (score + sourceInfo.credibility_score) / 2;
    }
    
    // Boost score for certain keywords that indicate importance
    const importantKeywords = [
      'breakthrough', 'announce', 'launch', 'release', 'acquire', 
      'funding', 'ipo', 'regulation', 'partnership', 'merger'
    ];
    
    const title = (newsItem.title || '').toLowerCase();
    const summary = (newsItem.summary || '').toLowerCase();
    const content = title + ' ' + summary;
    
    const keywordMatches = importantKeywords.filter(keyword => 
      content.includes(keyword)
    ).length;
    
    if (keywordMatches > 0) {
      score = Math.min(1.0, score + (keywordMatches * 0.1));
    }
    
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate a canonical title and summary for a story cluster
   * @param {Array} newsItems - Array of news items about the same story
   * @returns {Promise<Object>} - Canonical title and summary
   */
  async generateCanonicalContent(newsItems) {
    if (newsItems.length === 1) {
      return {
        title: newsItems[0].title,
        summary: newsItems[0].summary
      };
    }

    const prompt = `
You are an expert editor creating canonical headlines for trending stories.

Multiple sources have covered the same story. Create a single, authoritative headline and summary that captures the core news.

SOURCES:
${newsItems.map((item, i) => `
${i + 1}. ${item.title}
   ${item.summary}
   Source: ${item.source_name || 'Unknown'}
`).join('')}

Create:
1. CANONICAL_TITLE: Clear, factual headline (max 80 characters)
2. CANONICAL_SUMMARY: Comprehensive summary incorporating key details from all sources (2-3 sentences)

Format as JSON:
{
  "title": "Canonical title here",
  "summary": "Canonical summary here"
}

Guidelines:
- Use the most specific and accurate information
- Include key details (numbers, dates, names) when available
- Avoid speculation or opinion
- Use active voice and clear language
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 200
      });

      const content = response.choices[0].message.content.trim();
      const cleanContent = content.replace(/```json\n?|```\n?/g, '');
      
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('Error generating canonical content:', error);
      // Fallback to first item
      return {
        title: newsItems[0].title,
        summary: newsItems[0].summary
      };
    }
  }
}

module.exports = { StoryClusteringEngine };