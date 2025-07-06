# Newsletter Digest Bot

**⚡️ This product operates at the individual news item level: Each newsletter email is parsed, all news items (articles, tools, reports, etc.) are extracted and stored as separate records. All analysis, grouping, and trending logic is performed on these news items, not on the emails themselves.**

## 🚧 Development Progress

- [x] Gmail OAuth integration and newsletter fetching
- [x] AI-powered content extraction and summarization (OpenAI)
- [x] Topic/entity extraction and similarity grouping (LLM embeddings)
- [x] Digest synthesis: Users can now generate and view AI-powered digest summaries for any custom date range (default: last 7 days) in the UI
- [x] Custom period picker for digest summaries in the UI
- [x] **Consensus/trending news feed:** Groups similar news items (not just emails) across newsletters, ranks by number of mentions, and shows which newsletters mentioned each item
- [x] **Newsletter sources management UI:** Users can add, remove, and manage which senders are considered newsletters
- [x] **Backend: Only processes newsletter emails (by sender/heuristics), never reprocesses already-processed emails**
- [ ] Favorites, personalization, and feedback (coming soon)
- [ ] Trending/consensus detection and discover section (coming soon)

AI-powered newsletter digest assistant that connects to Gmail, processes newsletters with OpenAI, and presents intelligent summaries **at the individual news item level**. Each email may contain multiple news items, and each is extracted, stored, and analyzed separately.

## 🚀 Features

- 🔐 Gmail OAuth integration
- 🤖 AI-powered content extraction and summarization  
- 📊 Topic clustering and trend analysis
- 🎯 Smart source management with credibility scoring
- 📰 **Consensus/trending news feed**: See the most-mentioned news items (not just emails) across all your newsletters, with a card showing which newsletters mentioned each item and their comments
- 🗂️ **Newsletter sources management UI**: Add/remove newsletter senders you want to follow
- 📱 Responsive web interface
- 🚀 Serverless deployment on Vercel

## 🧭 Product Requirements Document (PRD)

### Purpose
Deliver a personalized, high-signal AI news digest that surfaces:
- News and insights from your favorite people and trusted sources
- Genuinely trending topics, tools, and events (not just generic "AI/LLM" headlines)
- Only the most relevant, referenced, and interesting content—on your phone, in minutes
- **At the level of individual news items, not just whole newsletters** (each email is split into its constituent news items, which are then stored and analyzed)

### Target User
- **Primary:** Users who want a curated, signal-over-noise AI digest, with a focus on trusted voices, trending items, and personal interests.

### Key Features

#### 1. Source & Author Prioritization
- Highlight news from favorite authors/voices (e.g., Andrej Karpathy, a16z, Yann LeCun, etc.)
- Let user "star" or "follow" people/organizations—these are surfaced at the top or in a special section

#### 2. Smart Popularity & Trend Detection
- **Consensus ranking:** Items referenced in many newsletters are ranked higher and shown at the top of the feed
- Trending detection: Show "what's blowing up" (e.g., a new tool, paper, or event with a spike in mentions)
- **All consensus and trending logic operates at the news item level, not the email level** (news items are deduplicated and grouped by similarity, regardless of which email they came from)

#### 3. Fine-Grained Topic/Entity Extraction
- Extract not just broad topics, but specific people, companies, tools, and events
- Avoid surfacing generic "AI/LLM" news unless it's truly significant or trending
- **Each news item is extracted and stored individually, with its own metadata** (title, summary, content, topics, entities, etc.)

#### 4. Personalized Filtering & Feedback
- User can mark items as "more like this" or "less like this" to tune future digests
- Option to mute generic or low-value topics

#### 5. Digest Experience
- Top Section: "From your favorites" (authors/sources you follow)
- Trending Now: Most referenced news items across all newsletters (**implemented as consensus feed**)
- Discover: New or emerging topics/entities/tools
- **All sections are populated by individual news items, not just newsletter emails** (the UI and backend logic work at the news item level)

#### 6. Mobile-First, Minimal UI
- Fast, readable, touch-friendly, with easy navigation and feedback
- **UI displays a feed of news items, each with source, summary, and metadata**

### Non-Goals
- No multi-user support (for now).
- No support for sources other than your Gmail newsletter subscriptions.
- No advanced analytics or sharing features.
- No desktop-optimized interface.

### Technical Requirements
- **Authentication:** OAuth with Gmail for secure newsletter access.
- **Backend:** Node.js API for fetching, processing, and summarizing emails.
- **LLM-Powered Processing & RAG:**
  - Use LLMs (e.g., OpenAI GPT) for:
    - Extracting and splitting **all individual news items** from raw newsletter content
    - Generating embeddings for similarity comparison **at the news item level**
    - Extracting metadata (topics, entities, sentiment, source, date, etc.) for each news item
    - Grouping news items by similarity (deduplication by similarity, using a threshold on embedding similarity; not traditional clustering)
    - Synthesizing a single summary per group
  - Implement a Retrieval-Augmented Generation (RAG) system:
    - Store **each news item and its metadata** in a vector database (e.g., Supabase, Pinecone)
    - Enable semantic and metadata-based retrieval for synthesis, ranking, and user queries
  - Minimize custom algorithm development by leveraging LLM and RAG capabilities for similarity grouping, summarization, and retrieval.
- **Frontend:** Next.js/React with mobile-first design.
- **Storage:** Supabase for user preferences, **news items**, digests, and vectorized metadata.
- **Deployment:** Vercel or similar, with HTTPS.
- **Source:** Only Gmail newsletters from your email subscriptions are ingested and processed. No other sources are supported at this time.
- **Newsletter Filtering:** Only emails from user-approved newsletter sources (or matching newsletter heuristics) are processed. Already-processed emails are never reprocessed.
- **Granularity:** **All processing, storage, and UI is at the news item level, not the email level.**

### Success Criteria
- You see news from your favorite people/sources every day
- Trending/consensus items are surfaced and easy to spot
- Digest is concise, relevant, and never feels generic or repetitive
- You can tune the feed with minimal effort
- **You see a feed of individual news items, not just a list of newsletters**

---

## 🗺 Roadmap

1. **MVP: Personal AI Digest (Single-source Summarization)**
   - Gmail OAuth integration
   - Fetch and summarize AI newsletters
   - Mobile-first UI (Android focus)
   - Daily/weekly digest delivery

2. **Multi-source Aggregation & Entity Extraction**
   - Ingest multiple newsletters per theme
   - Use LLM to extract and split **all news items** (not just summarize the email), authors, sources, and entities
   - Present all items in a single feed

3. **Consensus Similarity Grouping & Ranking**
   - Use LLM embeddings to group highly similar news items (above a threshold)
   - Assign consensus scores based on number of sources mentioning each item
   - Rank and display synthesized news at the top (**implemented as consensus feed**)
   - **Consensus is calculated at the news item level, not the email level**

4. **Personalization & Favorites**
   - Allow user to star/follow authors and sources
   - Surface favorite content in a dedicated section
   - Enable feedback and muting of topics/entities

5. **Trending & Discoverability**
   - Detect and highlight trending topics, tools, and events
   - Show new or emerging items in a "Discover" section

6. **RAG System & Advanced Retrieval**
   - Store **news items** and metadata in a vector database
   - Implement Retrieval-Augmented Generation (RAG) for semantic and metadata-based retrieval
   - Use metadata to enhance similarity grouping, ranking, and personalized feed

7. **Polish & Notifications**
   - Push/email notifications for new digests
   - UI/UX improvements, dark mode, offline support

8. **Future Enhancements**
   - Expand to other content sources (RSS, Twitter, etc.)
   - Voice assistant integration
   - Multi-user support

---

### Example Digest & Consensus Flow

1. **Fetch** → 2. **Extract (LLM)** → 3. **Split into news items (LLM)** → 4. **Extract Metadata (LLM)** → 5. **Similarity Grouping (LLM/Embeddings + Threshold) at news item level** → 6. **Score & Trend Detection** → 7. **Summarize (LLM, now implemented with custom period picker)** → 8. **Store & Retrieve (RAG, at news item level)** → 9. **Personalize & Rank** → 10. **Display (news item feed)**

---

## 📋 Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/newsletter-digest-bot.git
cd newsletter-digest-bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration in `supabase/migrations/20250706_new_news_item_schema.sql` (this creates the news_items table and related indexes/policies)
3. Get your project URL and anon key from Settings > API
4. Enable Google OAuth in Authentication > Providers

### 4. Set up OpenAI
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to environment variables

### 5. Set up Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project and enable Gmail API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-app.vercel.app/auth/callback` (production)

### 6. Configure environment variables
Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Gmail OAuth
NEXT_PUBLIC_GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
```

### 7. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 8. Deploy to Vercel
```bash
npm i -g vercel
vercel --prod
```

Remember to:
- Add all environment variables to Vercel Dashboard
- Update Gmail OAuth redirect URIs with your Vercel domain
- Update Supabase authentication settings with your Vercel domain

## 🛠 Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Vercel serverless functions
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-3.5 for content processing
- **Email**: Gmail API for newsletter fetching
- **Authentication**: Supabase Auth with Gmail OAuth
- **Consensus Feed**: Groups and ranks **news items** (not just emails) by number of unique newsletter mentions, using LLM embeddings and vector search
- **Newsletter Source Management**: Users can add/remove newsletter senders, only emails from these senders (or matching newsletter heuristics) are processed
- **Granularity**: **All processing, storage, and UI is at the news item level, not the email level.**

## 🆕 How to Use the Consensus Feed and Sources Management

### Consensus/Trending News Feed
- The consensus feed shows the most-mentioned **news items** (not just emails) across all your newsletters for a given period.
- Each card displays the synthesized summary, which newsletters mentioned it, and their comments.
- To use: render `<ConsensusFeed periodStart={...} periodEnd={...} />` in your main page.

### Newsletter Sources Management UI
- Users can add, remove, and manage which senders are considered newsletters.
- To use: render `<NewsletterSourcesManager />` in your settings or main page.
- Only emails from active sources (or matching newsletter heuristics) are processed.

## 💰 Cost Estimates

- **Vercel:** Free tier sufficient for MVP
- **Supabase:** Free tier includes 500MB database
- **OpenAI:** ~$0.10-0.20 per day for typical usage
- **Total:** <$10/month for personal use

## 📝 License

MIT License - see LICENSE file for details.

## ✉️ Allowed Sender Management (NEW)

You can now control which sender email addresses or domains are allowed for newsletter processing, directly from the UI.

- **All user configuration (allowed senders, filters, and actions) is now in a sticky side panel, always visible while scrolling the news feed.**

### Features
- **Add/Remove Allowed Senders:**
  - Add a full email (e.g. `editor@newsletter.com`) or a domain (e.g. `substack.com`).
  - Remove senders with a single click.
- **Input Validation:**
  - Only valid email addresses or domains are accepted.
  - Prevents duplicates.
  - Inline error messages and input highlighting for invalid input.
- **Enhanced List Display:**
  - Email icon for full email addresses, globe icon for domains.
  - Displays the source name (if available) next to the address/domain.
- **Backend API:**
  - New endpoint: `/api/newsletters/sources` (GET, POST, DELETE)
  - Supports listing, adding, and removing allowed senders for the authenticated user.
- **React Hook:**
  - `useNewsletterSources(userId)` for fetching, adding, and removing allowed senders.

### Example UI
```
+---------------------------------------------+
| Allowed Senders                            |
| Only newsletters from these senders will... |
|                                             |
| [📧] editor@newsletter.com   (Remove)        |
| [🌐] substack.com            (Remove)        |
|                                             |
| + Add new sender: [______________] [Add]    |
|   [Error: Please enter a valid ...]         |
+---------------------------------------------+
```

### API Usage
- **GET** `/api/newsletters/sources?user_id=...` — List allowed senders
- **POST** `/api/newsletters/sources` — Add sender `{ user_id, email_address }`
- **DELETE** `/api/newsletters/sources` — Remove sender `{ user_id, email_address }`

See the UI in the "Allowed Senders" section at the top of the main digest page.

## 📝 Recent Changes

### News Item Extraction Improvements (July 2025)
- The news item extraction algorithm (see `api/utils/openai.js`) has been refined for higher accuracy:
  - **Reduces over-segmentation:** Now groups together only sections that are about the same event, announcement, or story, rather than splitting similar content into multiple items.
  - **Avoids over-generalization:** Items about different companies, products, or people (even if similar in theme) are kept as separate news items.
  - **Leverages formatting cues:** The extraction prompt now instructs the AI to use headings, bullet points, dividers, and section breaks as signals for where one news item ends and another begins.
  - **Balances grouping and splitting:** If in doubt, the model is told to keep items separate unless it is clear they are about the same specific news.
- These changes improve the quality and relevance of extracted news items, especially for newsletters with multiple sections on similar topics.