const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    });

    return JSON.parse(response.choices[0].message.content);
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

module.exports = { extractNewsletterInsights }; 