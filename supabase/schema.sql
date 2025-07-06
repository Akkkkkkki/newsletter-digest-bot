create table public.users (
  id uuid not null,
  email text not null,
  full_name text null,
  gmail_refresh_token text null,
  gmail_connected boolean null default false,
  preferences jsonb null default '{"categories": [], "digest_frequency": "daily"}'::jsonb,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger handle_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION handle_updated_at ();

create table public.newsletters (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  source_id uuid null,
  gmail_message_id text not null,
  thread_id text null,
  subject text not null,
  sender_email text not null,
  sender_name text null,
  received_date timestamp with time zone not null,
  raw_content text null,
  cleaned_content text null,
  html_content text null,
  labels text[] null,
  attachments jsonb null default '[]'::jsonb,
  status text null default 'pending'::text,
  processed_at timestamp with time zone null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint newsletters_pkey primary key (id),
  constraint newsletters_gmail_message_id_key unique (gmail_message_id),
  constraint newsletters_source_id_fkey foreign KEY (source_id) references newsletter_sources (id) on delete set null,
  constraint newsletters_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint newsletters_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'processing'::text,
          'completed'::text,
          'failed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_newsletters_user_date on public.newsletters using btree (user_id, received_date desc) TABLESPACE pg_default;

create table public.news_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  newsletter_id uuid null,
  user_id uuid null,
  source_id uuid null,
  title text not null,
  summary text null,
  content text null,
  url text null,
  position integer null,
  embedding public.vector null,
  topics text[] null default '{}'::text[],
  people_mentioned text[] null default '{}'::text[],
  products_mentioned text[] null default '{}'::text[],
  companies_mentioned text[] null default '{}'::text[],
  events_mentioned jsonb null default '[]'::jsonb,
  sentiment text null,
  importance_score numeric(3, 2) null default 0.5,
  extraction_model text null default 'gpt-3.5-turbo'::text,
  confidence_score numeric(3, 2) null default 0.8,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint news_items_pkey primary key (id),
  constraint news_items_newsletter_id_fkey foreign KEY (newsletter_id) references newsletters (id) on delete CASCADE,
  constraint news_items_source_id_fkey foreign KEY (source_id) references newsletter_sources (id) on delete set null,
  constraint news_items_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint news_items_importance_score_check check (
    (
      (importance_score >= (0)::numeric)
      and (importance_score <= (1)::numeric)
    )
  ),
  constraint news_items_confidence_score_check check (
    (
      (confidence_score >= (0)::numeric)
      and (confidence_score <= (1)::numeric)
    )
  ),
  constraint news_items_sentiment_check check (
    (
      sentiment = any (
        array[
          'positive'::text,
          'neutral'::text,
          'negative'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_news_items_user on public.news_items using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_news_items_newsletter on public.news_items using btree (newsletter_id) TABLESPACE pg_default;

create index IF not exists idx_news_items_embedding on public.news_items using ivfflat (embedding vector_cosine_ops) TABLESPACE pg_default;

create trigger handle_news_items_updated_at BEFORE
update on news_items for EACH row
execute FUNCTION handle_news_items_updated_at ();

create table public.newsletter_sources (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  email_address text not null,
  name text null,
  credibility_score numeric(3, 2) null default 0.5,
  category text null,
  description text null,
  is_active boolean null default true,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint newsletter_sources_pkey primary key (id),
  constraint newsletter_sources_user_id_email_address_key unique (user_id, email_address),
  constraint newsletter_sources_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint newsletter_sources_credibility_score_check check (
    (
      (credibility_score >= (0)::numeric)
      and (credibility_score <= (1)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_sources_user_active on public.newsletter_sources using btree (user_id, is_active) TABLESPACE pg_default;

create trigger handle_newsletter_sources_updated_at BEFORE
update on newsletter_sources for EACH row
execute FUNCTION handle_updated_at ();

