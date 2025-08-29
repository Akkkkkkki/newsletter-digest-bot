export interface Newsletter {
  id: string
  subject: string
  sender_name: string
  sender_email: string
  received_date: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  newsletter_insights?: NewsletterInsights
}

export interface NewsletterInsights {
  summary: string
  key_topics: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  category: string
  companies_mentioned: string[]
  people_mentioned: string[]
  action_items: string[]
  links_extracted: string[]
}

export interface User {
  id: string
  email: string
  full_name?: string
  gmail_connected: boolean
}

export interface DigestSummary {
  id: string
  user_id: string
  period_start: string
  period_end: string
  newsletter_count: number
  top_topics: string[]
  key_insights: string[]
  summary_content: string
  sentiment_analysis: {
    positive: number
    neutral: number
    negative: number
    [key: string]: number
  }
  generated_at: string
  viewed_at?: string | null
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url?: string;
  position?: number;
  topics: string[];
  people_mentioned: string[];
  products_mentioned: string[];
  companies_mentioned: string[];
  events_mentioned: any[];
  sentiment: 'positive' | 'neutral' | 'negative';
  importance_score: number;
  extraction_model: string;
  confidence_score: number;
  created_at: string;
  updated_at: string;
  newsletter_id: string;
  user_id: string;
  source_id?: string | null;
  newsletters?: {
    subject: string;
    sender_name: string;
    sender_email: string;
    received_date: string;
  };
} 