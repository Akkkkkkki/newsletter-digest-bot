const { generateEmbedding } = require('../../lib/openai');
const cosineSimilarity = (a, b) => {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (normA * normB);
};

class StoryClusteringEngine {
  // Find a matching story using title, entity, and semantic similarity
  async findMatchingStory(newsItem, recentStories) {
    if (!recentStories || recentStories.length === 0) return null;
    // 1. Title similarity (exact or partial)
    const titleLower = newsItem.title.toLowerCase();
    for (const story of recentStories) {
      if (story.canonical_title && story.canonical_title.toLowerCase() === titleLower) {
        return story;
      }
      if (story.canonical_title && titleLower.includes(story.canonical_title.toLowerCase())) {
        return story;
      }
    }
    // 2. Entity overlap (companies, people, products)
    for (const story of recentStories) {
      const overlap = (arr1, arr2) => arr1 && arr2 && arr1.some(v => arr2.includes(v));
      if (
        overlap(newsItem.companies_mentioned, story.key_entities?.companies) ||
        overlap(newsItem.people_mentioned, story.key_entities?.people) ||
        overlap(newsItem.products_mentioned, story.key_entities?.products)
      ) {
        return story;
      }
    }
    // 3. Semantic similarity using embeddings
    try {
      const newsEmbedding = await generateEmbedding(newsItem.title + ' ' + (newsItem.summary || ''));
      let bestScore = 0.0;
      let bestStory = null;
      for (const story of recentStories) {
        if (!story.embedding) continue;
        const sim = cosineSimilarity(newsEmbedding, story.embedding);
        if (sim > 0.85 && sim > bestScore) {
          bestScore = sim;
          bestStory = story;
        }
      }
      if (bestStory) return bestStory;
    } catch (e) {
      // Fallback: ignore semantic if embedding fails
    }
    // No match found
    return null;
  }

  // Generate a semantic cluster ID using LLM (stub: use title for now)
  async generateClusterID(newsItem) {
    // TODO: Use LLM for more robust cluster IDs
    return newsItem.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 40);
  }

  calculateImportanceScore(newsItem, sourceInfo) {
    // Calculate importance score (stub)
    return 1.0;
  }

  async generateStoryAnalysis(storyData) {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const prompt = `Analyze this news story cluster:

Title: ${storyData.canonical_title}
Summary: ${storyData.canonical_summary}
Mentions: ${storyData.mention_count}
Sources: ${storyData.mentioning_sources.map(s => s.name).join(', ')}

Provide brief analysis in JSON format:
{
  "trend_analysis": "One sentence about the trend direction",
  "impact_assessment": "One sentence about potential impact", 
  "key_entities": {
    "companies": ["company1", "company2"],
    "people": ["person1"],
    "products": ["product1"]
  }
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error generating story analysis:', error);
      return {
        trend_analysis: 'Analysis unavailable',
        impact_assessment: 'Impact assessment unavailable',
        key_entities: { companies: [], people: [], products: [] }
      };
    }
  }
}

module.exports = { StoryClusteringEngine }; 