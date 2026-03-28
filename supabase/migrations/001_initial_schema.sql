-- Mark Agent: Initial Schema
-- Run this in Supabase SQL Editor to set up the database

-- Users table (extends Supabase Auth)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null check (role in ('owner', 'admin')),
  preferences jsonb default '{}',
  created_at timestamptz default now()
);

-- Business context (key-value knowledge about the business)
create table if not exists business_context (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text not null,
  source text not null check (source in ('admin_input', 'agent_learned')),
  updated_at timestamptz default now()
);

-- Contacts / Leads
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  company text,
  company_domain text,
  title text,
  source text not null check (source in ('web_search', 'inbound_email', 'manual')),
  status text not null default 'lead' check (status in ('lead', 'prospect', 'customer', 'dead')),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Outreach drafts (emails Mark writes for owner approval)
create table if not exists outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  subject text not null,
  body_html text not null,
  body_text text not null,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'sent', 'failed')),
  resend_message_id text,
  approved_by uuid references users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Email threads (groups related email messages)
create table if not exists email_threads (
  id uuid primary key default gen_random_uuid(),
  thread_type text not null check (thread_type in ('daily_update', 'owner_conversation', 'prospect_outreach')),
  contact_id uuid references contacts(id),
  subject text not null,
  resend_thread_id text,
  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);

-- Individual email messages
create table if not exists email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references email_threads(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  from_email text not null,
  to_email text not null,
  subject text not null,
  body_text text,
  body_html text,
  resend_message_id text,
  headers jsonb default '{}',
  created_at timestamptz default now()
);

-- Shared Google Drive files
create table if not exists shared_files (
  id uuid primary key default gen_random_uuid(),
  google_file_id text unique not null,
  file_type text not null check (file_type in ('spreadsheet', 'document', 'presentation')),
  title text not null,
  google_url text not null,
  extracted_content text,
  metadata jsonb default '{}',
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

-- Agent run log (tracks every time Mark runs)
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null check (trigger in ('cron', 'inbound_email', 'manual')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'timed_out')),
  summary jsonb,
  llm_calls integer default 0,
  tokens_used integer default 0,
  duration_ms integer,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Indexes for common queries
create index idx_contacts_status on contacts(status);
create index idx_contacts_company_domain on contacts(company_domain);
create index idx_outreach_drafts_status on outreach_drafts(status);
create index idx_outreach_drafts_contact on outreach_drafts(contact_id);
create index idx_email_messages_thread on email_messages(thread_id);
create index idx_email_messages_from on email_messages(from_email);
create index idx_email_threads_type on email_threads(thread_type);
create index idx_agent_runs_status on agent_runs(status);
create index idx_agent_runs_started on agent_runs(started_at desc);
create index idx_business_context_key on business_context(key);

-- Row Level Security (basic setup — refine per role later)
alter table users enable row level security;
alter table business_context enable row level security;
alter table contacts enable row level security;
alter table outreach_drafts enable row level security;
alter table email_threads enable row level security;
alter table email_messages enable row level security;
alter table shared_files enable row level security;
alter table agent_runs enable row level security;

-- Allow authenticated users to read all data (small team, same business)
create policy "Authenticated users can read all data" on users for select to authenticated using (true);
create policy "Authenticated users can read all data" on business_context for select to authenticated using (true);
create policy "Authenticated users can read all data" on contacts for select to authenticated using (true);
create policy "Authenticated users can read all data" on outreach_drafts for select to authenticated using (true);
create policy "Authenticated users can read all data" on email_threads for select to authenticated using (true);
create policy "Authenticated users can read all data" on email_messages for select to authenticated using (true);
create policy "Authenticated users can read all data" on shared_files for select to authenticated using (true);
create policy "Authenticated users can read all data" on agent_runs for select to authenticated using (true);

-- Admin can write to all tables
create policy "Admins can manage all data" on users for all to authenticated using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "Admins can manage all data" on business_context for all to authenticated using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "Admins can manage all data" on contacts for all to authenticated using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "Admins can manage all data" on outreach_drafts for all to authenticated using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "Admins can manage all data" on shared_files for all to authenticated using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

-- Updated_at trigger for contacts
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();
