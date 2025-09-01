# Newsletter Digest Bot

AI-powered newsletter digest assistant that connects to Gmail, processes newsletters with OpenAI, and presents intelligent summaries at the individual news item level. Built for rapid, high-signal headline scanning and trend detection.

## 🚨 **Current Development Status (2025-08-30)**

### ✅ **Phase 1: Security Hardened (Complete)**
- Authentication & OAuth integration working
- Input validation and error boundaries implemented
- Secure token storage system
- Rate limiting and security controls

### ⚠️ **Phase 2: Performance Issues (URGENT)**
**🔴 Production deployment BLOCKED by critical performance bottlenecks:**

- **Gmail API timeouts**: 50+ newsletters = 30-60s processing = guaranteed failure
- **OpenAI cost explosion**: Individual API calls = $5-10 per session (should be $1-2)
- **Database query timeouts**: Missing indexes cause 5-30s response times  
- **Frontend performance**: 473-line component impacts rendering

**Next developer MUST fix these issues before production deployment.**

## Key Features
- ✅ Gmail OAuth integration  
- ✅ AI-powered content extraction and summarization
- ✅ Topic clustering, trend analysis, and consensus feed
- ✅ Newsletter source management UI
- ✅ Mobile-first, minimal UI
- ✅ Supabase/Postgres backend, OpenAI LLMs, Next.js frontend
- ⚠️ **Performance optimizations needed** (see Phase 2 priorities)

## 🚀 **Developer Handoff - Immediate Priorities**

### **Week 1 - Critical Performance Fixes**
1. **Database Indexes** (URGENT - prevents query timeouts)
   ```sql
   CREATE INDEX idx_news_items_user_date ON news_items(user_id, created_at DESC);
   CREATE INDEX idx_story_mentions_trending ON story_mentions(user_id, trending_score DESC);
   ```
   
2. **Gmail Concurrent Processing** (`api/newsletters/process.js:94-250`)
   ```javascript
   import pLimit from 'p-limit';
   const limit = pLimit(5);
   await Promise.allSettled(newsletters.map(n => limit(() => processNewsletter(n))));
   ```

3. **OpenAI Batch Processing** (`lib/openai.js`)
   - Batch embedding generation instead of individual calls
   - Smart rate limiting to control costs

4. **Component Optimization** (`components/NewsletterDigest.tsx`)
   - Split 473-line component into focused components
   - Add React.memo and virtualization

### **Testing Requirements**
- Load test with 50+ newsletters to reproduce timeout issues
- Monitor OpenAI costs during development (target: $1-2/session)
- Validate query performance with EXPLAIN ANALYZE

## Quick Start

⚠️ **Note**: For development only - DO NOT deploy to production until Phase 2 performance fixes are complete.

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/newsletter-digest-bot.git
   cd newsletter-digest-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env.local`
   - Configure Supabase, OpenAI, and Gmail API credentials
   - See [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md) for complete setup

4. **Database Setup**
   - Run migrations in `supabase/migrations/`
   - **URGENT**: Add performance indexes (see TECHNICAL_DESIGN.md)
   - Enable `pgvector` extension

5. **Development**
   ```bash
   npm run dev     # Start development server
   npm run build   # Test production build
   npm run lint    # Code quality checks
   ```

6. **Performance Testing**
   ```bash
   # Test with realistic newsletter volumes
   # Monitor processing times and API costs
   ```

## 📚 Documentation

- **[PRODUCT_DESIGN.md](./PRODUCT_DESIGN.md)** - Product vision, features, current status
- **[TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)** - Architecture, performance issues, developer handoff  
- **[CLAUDE.md](./CLAUDE.md)** - Development workflow, session logs, implementation progress

## 🏗️ Architecture

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Vercel serverless functions
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI GPT for extraction and embeddings
- **Auth**: Supabase Auth with Gmail OAuth

## 📊 Current Quality Metrics

- **Security**: 8/10 ✅ (Phase 1 hardened)  
- **Performance**: 4/10 ⚠️ (Critical issues identified)
- **Feature Completeness**: 70% (Core features implemented)
- **Production Ready**: ❌ (Blocked by performance issues)

---

**License**: MIT  
**Status**: Security-hardened, performance optimization required  
**Next Phase**: Critical performance fixes (Database indexes, concurrent processing, cost optimization)