# Newsletter Digest Bot - Product Design Document

## Executive Summary

The Newsletter Digest Bot is a personal tool designed to help users efficiently gather high-signal information from trusted voices and widely referenced industry newsletters. The goal is to deliver a concise, relevant news digest that surfaces insights from your preferred sources and highlights topics that are trending or frequently mentioned across the industry. All processing, storage, and UI is at the news item level, not the email level.

## Problem Statement

### Current Pain Points
- Too much noise: Generic headlines crowd out genuinely useful or interesting content
- Hard to track top voices: It's difficult to keep up with updates from people or sources you care about
- Weak trend detection: Hard to spot what is being widely discussed or referenced
- No easy way to filter or personalize: Most tools don't adapt to your interests or let you tune the signal

### Target User Profile
**Primary User**: Anyone who wants a more efficient way to keep up with important news and insights from trusted sources and industry newsletters, with a focus on:
- Getting updates from specific people or sources
- Seeing what topics or stories are being widely referenced
- Saving time by filtering out low-value or repetitive content

## Vision & Strategy

### Product Vision
"A personal tool to help you quickly scan, filter, and digest the most relevant news and insights from your favorite sources and the broader industry."

### Key Principles
1. **Signal over Noise**: Prioritize genuinely useful or referenced content
2. **Source Awareness**: Make it easy to follow updates from people or sources you care about
3. **Trend Detection**: Highlight what is being widely discussed or referenced
4. **Personal Relevance**: Let users tune the feed to their interests
5. **Simplicity**: Fast, clear, and easy to use

## Core Features & Requirements

### 1. Source Management
- Add/remove newsletter senders you want to follow
- Only emails from active sources (or matching newsletter heuristics) are processed
- Option to set source priority or "favorite" certain senders

### 2. Content Extraction & Summarization
- Use AI to extract and summarize individual news items from emails
- Each news item is stored with its own metadata (title, summary, content, topics, entities, etc.)
- Avoid over-segmentation and over-generalization

### 3. Trend & Consensus Detection
- Group similar news items using semantic similarity
- Highlight stories or topics that are referenced by multiple newsletters
- Show which sources mentioned each item
- Configurable grouping parameters (similarity threshold, max per query)

### 4. Personalization & Filtering
- Mark items as "more like this" or "less like this" to tune future digests
- Option to mute generic or low-value topics
- Filter by source, topic, or entity

### 5. Digest Experience
- Top section: Updates from your favorite sources
- Trending/consensus: Most referenced news items across all newsletters
- Discover: New or emerging topics/entities/tools
- All sections are populated by individual news items, not just newsletter emails

### 6. Allowed Sender Management
- Add/remove allowed senders (full email or domain)
- Input validation and duplicate prevention
- Enhanced list display (email/domain icons, source name if available)
- Backend API for managing allowed senders
- React hook for fetching, adding, and removing allowed senders

### 7. Roadmap (Phases)
- **MVP**: Gmail OAuth integration, fetch and summarize newsletters, mobile-first UI, daily/weekly digest
- **Multi-source Aggregation**: Ingest multiple newsletters, extract and split all news items, present in a single feed
- **Consensus Grouping & Ranking**: Group similar news items, assign consensus scores, rank and display at the top
- **Personalization**: Star/follow sources, feedback and muting, filter by topic/entity
- **Trending & Discover**: Highlight trending topics, show new or emerging items
- **Advanced Retrieval**: Store news items and metadata in a vector database, enable semantic and metadata-based retrieval
- **Polish & Notifications**: Push/email notifications, UI/UX improvements, dark mode, offline support
- **Future Enhancements**: Support for other content sources (RSS, Twitter, etc.), voice assistant integration, multi-user support

## User Journey & Experience

### Daily Workflow
1. **Morning Brief**: Top insights from overnight developments
2. **Quick Scan**: Curated selection of high-value content
3. **Deep Dive**: In-depth analysis of major stories or trends
4. **Research Mode**: Follow up on specific topics or technologies

### Content Hierarchy
1. **Breaking**: Immediate alerts for significant developments
2. **Featured**: Top insights from your favorite sources
3. **Trending**: Cross-source consensus on widely referenced topics
4. **Deep Cuts**: Hidden gems from specialized sources
5. **Research**: Academic papers and technical reports
6. **Ecosystem**: Industry analysis and market intelligence

## Success Metrics

### Quality Metrics
- User rating of insight value and relevance
- How quickly users act on information received
- Prediction accuracy for trend identification
- Percentage of content from trusted sources
- Uniqueness of surfaced content

### Engagement Metrics
- Time spent reading vs. skimming
- Percentage of insights that drive user action
- Daily/weekly active usage
- Organic referrals from satisfied users
- Willingness to keep using the tool

### Utility Metrics
- Time saved compared to manual newsletter reading
- Number of duplicate or low-value items filtered out
- Number of new sources/topics discovered

## Competitive Differentiation

### vs. Mainstream News
- More technical depth and context
- Surfaces what is being referenced, not just what is published
- Focused on your sources and interests

### vs. Aggregators
- AI-powered grouping and summarization
- Quality and context over popularity
- Personalized filtering

### vs. Premium Services
- Multi-source synthesis
- Real-time updates
- Tailored to individual use, not a general audience

## Technology Requirements (Product Perspective)
- **Authentication:** OAuth with Gmail for secure newsletter access
- **Frontend:** Next.js/React with mobile-first design
- **Storage:** Supabase for user preferences, news items, digests, and vectorized metadata
- **AI:** OpenAI GPT for content processing, topic/entity extraction, and summarization
- **Newsletter Filtering:** Only emails from user-approved newsletter sources (or matching newsletter heuristics) are processed. Already-processed emails are never reprocessed
- **Granularity:** All processing, storage, and UI is at the news item level, not the email level

## Risk Mitigation

### Technical Risks
- AI quality: Testing and human validation
- Scale: Gradual rollout with performance monitoring
- Data quality: Multiple validation layers and source verification

### Other Risks
- Competition: Focus on unique value and utility
- User acquisition: Build for personal utility first
- Content moderation: Automated and human review as needed
- Legal: Compliance with data protection and content rights
- Support: Proactive user support

## Conclusion

The Newsletter Digest Bot is a personal productivity tool to help you keep up with important news and insights from your favorite sources and the broader industry. The focus is on clarity, utility, and saving you time—no hype, just the information you care about, delivered efficiently.