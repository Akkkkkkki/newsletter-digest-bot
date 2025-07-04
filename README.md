# Newsletter Digest Bot

AI-powered newsletter digest assistant that connects to Gmail, processes newsletters with OpenAI, and presents intelligent summaries.

## 🚀 Features

- 🔐 Gmail OAuth integration
- 🤖 AI-powered content extraction and summarization  
- 📊 Topic clustering and trend analysis
- 🎯 Smart source management with credibility scoring
- 📱 Responsive web interface
- 🚀 Serverless deployment on Vercel

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
2. Go to SQL Editor and run the migration in `supabase/migrations/20231204000001_initial_schema.sql`
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

## 💰 Cost Estimates

- **Vercel:** Free tier sufficient for MVP
- **Supabase:** Free tier includes 500MB database
- **OpenAI:** ~$0.10-0.20 per day for typical usage
- **Total:** <$10/month for personal use

## 📝 License

MIT License - see LICENSE file for details.