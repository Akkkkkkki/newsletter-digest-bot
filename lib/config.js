// lib/config.js

// Newsletter fetching/display defaults
const NEWSLETTER_DEFAULTS = {
  limit: 20,
  daysBack: 7,
  minLimit: 1,
  maxLimit: 100,
  allowedDomains: ['a16z.com', 'deeplearning.ai'],
  dateFormat: 'YYYY-MM-DD',
};

// Consensus feed defaults
const CONSENSUS_DEFAULTS = {
  minMentions: 2,
  similarityThreshold: 0.85, // Default similarity threshold for grouping
  maxPerQuery: 20,           // Max similar items to fetch per query embedding
};

// OpenAI API defaults (non-secret)
const OPENAI_DEFAULTS = {
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 2000,
};

// User preference defaults (should match DB defaults)
const USER_PREFERENCE_DEFAULTS = {
  digestFrequency: 'daily',
  categories: [],
};

module.exports = {
  NEWSLETTER_DEFAULTS,
  CONSENSUS_DEFAULTS,
  OPENAI_DEFAULTS,
  USER_PREFERENCE_DEFAULTS,
}; 