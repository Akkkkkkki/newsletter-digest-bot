-- Sample newsletter sources for testing
INSERT INTO newsletter_sources (user_id, email_address, name, credibility_score, category, description) VALUES
  ('00000000-0000-0000-0000-000000000000', 'newsletter@techcrunch.com', 'TechCrunch', 0.9, 'tech', 'Leading technology news and startup coverage'),
  ('00000000-0000-0000-0000-000000000000', 'daily@axios.com', 'Axios', 0.85, 'business', 'Smart brevity on the day''s news'),
  ('00000000-0000-0000-0000-000000000000', 'newsletter@theverge.com', 'The Verge', 0.8, 'tech', 'Technology, science, art, and culture');

-- World-class AI newsletter sources
INSERT INTO newsletter_sources (user_id, email_address, name, credibility_score, category, description) VALUES
  ('00000000-0000-0000-0000-000000000000', 'importai@substack.com', 'Import AI', 0.95, 'engineering/research', 'Jack Clark's deep-dive newsletter on AI research, geopolitics, policy, and societal impact'),
  ('00000000-0000-0000-0000-000000000000', 'batch@deeplearning.ai', 'The Batch', 0.95, 'engineering/research', 'Weekly summaries of key ML/AI breakthroughs with practical commentary'),
  ('00000000-0000-0000-0000-000000000000', 'newsletter@tldr.tech', 'TLDR AI', 0.92, 'engineering/tools', 'Concise daily/weekly briefing on tools, research, and engineering developments'),
  ('00000000-0000-0000-0000-000000000000', 'bensbites@substack.com', 'Ben's Bites', 0.92, 'product/tools', 'Curated AI product updates, tool reviews, practical use cases and integrations'),
  ('00000000-0000-0000-0000-000000000000', 'superhumanai@substack.com', 'Superhuman AI', 0.90, 'productivity/tools', 'Short practical guides and overviews for AI productivity tools'),
  ('00000000-0000-0000-0000-000000000000', 'mindstream@substack.com', 'Mindstream', 0.90, 'tools/industry', '5-minute daily briefing on AI tools, productivity hacks, and industry news'),
  ('00000000-0000-0000-0000-000000000000', 'aiweekly@aiweekly.co', 'AI Weekly', 0.90, 'general', 'Reliable weekly roundup of major AI/ML updates'),
  ('00000000-0000-0000-0000-000000000000', 'therundown@therundown.ai', 'The Rundown AI', 0.90, 'general', '5-minute daily newsletter explaining key AI news and what it means'),
  ('00000000-0000-0000-0000-000000000000', 'pro-rata@axios.com', 'Axios Pro Rata: AI eats VC', 0.88, 'investment/finance', 'High-level analysis of AI startup funding trends and VC allocation'),
  ('00000000-0000-0000-0000-000000000000', 'fintech@a16z.com', 'a16z Fintech', 0.88, 'finance', 'Covers AI's impact on finance, including expert CFO roundtables and pricing/forecasting models'),
  ('00000000-0000-0000-0000-000000000000', 'newsletter@cbinsights.com', 'CB Insights Newsletters', 0.88, 'investment/market', 'In-depth intelligence on AI-adjacent investment trends and startup activities'),
  ('00000000-0000-0000-0000-000000000000', 'tips@theinformation.com', 'The Information', 0.90, 'industry/strategy', 'Premium journalism on tech sector strategy and AI-driven changes in business'),
  ('00000000-0000-0000-0000-000000000000', 'azeem@exponentialview.co', 'Exponential View', 0.90, 'industry/strategy', 'Broad analysis on how AI is reshaping business, geopolitics, and society'); 