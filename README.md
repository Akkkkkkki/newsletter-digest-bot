# Newsletter Digest Bot

AI-powered newsletter digest assistant that connects to Gmail, processes newsletters with OpenAI, and presents intelligent summaries at the individual news item level. Built for rapid, high-signal headline scanning and trend detection.

## Key Features
- Gmail OAuth integration
- AI-powered content extraction and summarization
- Topic clustering, trend analysis, and consensus feed
- Newsletter source management UI
- Mobile-first, minimal UI
- Supabase/Postgres backend, OpenAI LLMs, Next.js frontend

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/newsletter-digest-bot.git
   cd newsletter-digest-bot
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables** (see `.env.example`)
4. **Set up Supabase**
   - Create a project, run migrations in `supabase/schema.sql`
   - Enable `pgvector` extension and create the `match_news_items` function
   - Add your API keys
5. **Set up OpenAI and Gmail API credentials**
6. **Run locally**
   ```bash
   npm run dev
   ```
7. **Deploy to Vercel** (optional)

## More Information
- **Product vision, features, and roadmap:** [PRODUCT_DESIGN.md](./PRODUCT_DESIGN.md)
- **Technical architecture, schema, and implementation:** [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)

MIT License.