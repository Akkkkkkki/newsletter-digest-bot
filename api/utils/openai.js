const OpenAI = require('openai');
const { OPENAI_DEFAULTS } = require('../../lib/config');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility: Strip Markdown code block (with or without language tag) from LLM output
function stripMarkdownCodeBlock(content) {
  let trimmed = content.trim();
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }
  return trimmed;
}

async function extractNewsletterInsights(content, senderInfo) {
  const prompt = `
Analyze this newsletter content and extract the following information as JSON:

Newsletter from: ${senderInfo}
Content: ${content.substring(0, 4000)}

Extract:
1. summary (2-3 sentences)
2. key_topics (array of main topics/themes)
3. sentiment (positive/neutral/negative)
4. category (tech/finance/marketing/health/business/politics/science/entertainment/sports/other)
5. companies_mentioned (array of company names)
6. people_mentioned (array of person names)
7. action_items (array of actionable recommendations)
8. links_extracted (array of URLs mentioned)

Return ONLY valid JSON in this exact format:
{
  "summary": "...",
  "key_topics": ["topic1", "topic2"],
  "sentiment": "positive/neutral/negative",
  "category": "tech/finance/marketing/health/business/politics/science/entertainment/sports/other",
  "companies_mentioned": ["company1", "company2"],
  "people_mentioned": ["person1", "person2"],
  "action_items": ["action1", "action2"],
  "links_extracted": ["http://...", "https://..."]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_DEFAULTS.model,
      messages: [{ role: "user", content: prompt }],
      temperature: OPENAI_DEFAULTS.temperature,
      max_tokens: OPENAI_DEFAULTS.maxTokens
    });

    let content = stripMarkdownCodeBlock(response.choices[0].message.content);
    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      summary: "Error processing newsletter content",
      key_topics: [],
      sentiment: "neutral",
      category: "other",
      companies_mentioned: [],
      people_mentioned: [],
      action_items: [],
      links_extracted: []
    };
  }
}

/**
 * Generate an embedding vector for the given text using OpenAI's embedding API.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} - The embedding vector.
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000) // OpenAI limit
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    return null;
  }
}

/**
 * Synthesize a digest summary from an array of newsletter insights using OpenAI.
 * @param {Array} insights - Array of newsletter insight objects.
 * @returns {Promise<Object>} - Synthesized digest summary.
 */
async function synthesizeDigestSummary(insights) {
  // Prepare the input for the LLM
  const summaries = insights.map((i, idx) => `Item ${idx + 1}:\nSummary: ${i.summary}\nTopics: ${i.key_topics?.join(', ') || ''}\nCategory: ${i.category || ''}\nSentiment: ${i.sentiment || ''}\nCompanies: ${i.companies_mentioned?.join(', ') || ''}\nPeople: ${i.people_mentioned?.join(', ') || ''}\nAction Items: ${i.action_items?.join(', ') || ''}\nLinks: ${i.links_extracted?.join(', ') || ''}`).join('\n---\n');

  const prompt = `You are an expert news digest assistant. Given the following newsletter items, synthesize a concise, high-signal digest for the user.\n\nInstructions:\n- Surface consensus topics and trends (items mentioned in multiple newsletters).\n- Highlight the most important, referenced, and interesting content.\n- Group similar items and avoid repetition.\n- Output a JSON object with:\n  summary_content: a 3-5 sentence digest summary,\n  top_topics: array of the most important topics,\n  key_insights: array of the most referenced or interesting insights,\n  sentiment_analysis: object with counts of positive, neutral, and negative items.\n\nNewsletter Items:\n${summaries}\n\nReturn ONLY valid JSON in this format:\n{\n  "summary_content": "...",\n  "top_topics": ["topic1", "topic2"],\n  "key_insights": ["insight1", "insight2"],\n  "sentiment_analysis": {"positive": 0, "neutral": 0, "negative": 0}\n}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_DEFAULTS.model,
      messages: [{ role: "user", content: prompt }],
      temperature: OPENAI_DEFAULTS.temperature,
      max_tokens: OPENAI_DEFAULTS.maxTokens
    });

    let content = stripMarkdownCodeBlock(response.choices[0].message.content);
    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI digest synthesis error:', error);
    return {
      summary_content: "Error synthesizing digest.",
      top_topics: [],
      key_insights: [],
      sentiment_analysis: { positive: 0, neutral: 0, negative: 0 }
    };
  }
}

/**
 * Extracts all individual news items from a newsletter email using OpenAI.
 * Returns an array of news item objects, each with metadata for storage in the news_items table.
 * @param {string} content - The raw newsletter content.
 * @param {string} senderInfo - The sender's name and email.
 * @returns {Promise<Array>} - Array of news item objects.
 */
async function extractNewsItemsFromNewsletter(content, senderInfo) {
  const prompt = `
You are an expert at parsing newsletters. Given the following newsletter content, extract ALL individual news items (articles, tools, reports, etc.) and return a JSON array. For each news item, extract:
- title (required)
- summary (2-3 sentences, required)
- content (full text of the news item, if available)
- url (if present)
- topics (array of main topics/themes)
- people_mentioned (array)
- products_mentioned (array)
- companies_mentioned (array)
- events_mentioned (array or JSON)
- sentiment (positive/neutral/negative)
- importance_score (0-1, estimate how important/relevant this item is)
- confidence_score (0-1, how confident are you in the extraction)

Newsletter from: ${senderInfo}
Content: ${content.substring(0, 6000)}

Extraction instructions:
- Group together sections ONLY if they are about the same event, announcement, or story. Do NOT merge items that are about different companies, products, or people, even if the topics are similar (e.g., "OpenAI released X" and "Anthropic released Y" should be separate items).
- Pay close attention to formatting cues such as headings, bullet points, dividers, or section breaks. Use these as indicators for where one news item ends and another begins.
- If in doubt, prefer to keep items separate unless it is clear they are about the same specific news.
- Prefer fewer, more comprehensive news items over many fragmented ones, but do not over-generalize or merge unrelated news.

Return ONLY valid JSON in this format:
[
  {
    "title": "...",
    "summary": "...",
    "content": "...",
    "url": "...",
    "topics": ["topic1", "topic2"],
    "people_mentioned": ["person1", "person2"],
    "products_mentioned": ["product1", "product2"],
    "companies_mentioned": ["company1", "company2"],
    "events_mentioned": [],
    "sentiment": "positive/neutral/negative",
    "importance_score": 0.8,
    "confidence_score": 0.9
  }
]
`;
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_DEFAULTS.model,
      messages: [{ role: "user", content: prompt }],
      temperature: OPENAI_DEFAULTS.temperature,
      max_tokens: Math.max(OPENAI_DEFAULTS.maxTokens, 1500)
    });

    let content = stripMarkdownCodeBlock(response.choices[0].message.content);
    let items = JSON.parse(content);
    // Add extraction_model to each item
    if (Array.isArray(items)) {
      items = items.map(item => ({ ...item, extraction_model: OPENAI_DEFAULTS.model }));
    }
    return items;
  } catch (error) {
    console.error('OpenAI news item extraction error:', error);
    return [];
  }
}

module.exports = { extractNewsletterInsights, generateEmbedding, synthesizeDigestSummary, extractNewsItemsFromNewsletter }; 