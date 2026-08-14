create extension if not exists "pgcrypto";

create table if not exists planner_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  item_type text not null check (item_type in ('campaign','ticket','important-date')),
  start_date date not null,
  end_date date,
  channel text not null,
  segment text not null,
  workflow_status text not null default 'Brief Required',
  brief_owner text default 'Jenna',
  asset_creator text default 'Kieren',
  approver text default 'Jenna',
  approval_status text not null default 'Awaiting approval',
  publisher text default 'Kieren',
  description text not null default '',
  priority text not null default 'Normal',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists planner_assets (
  id uuid primary key default gen_random_uuid(),
  planner_item_id uuid not null references planner_items(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by text,
  revision_number integer not null default 1,
  asset_stage text not null default 'Working',
  created_at timestamptz not null default now()
);

create table if not exists planner_comments (
  id uuid primary key default gen_random_uuid(),
  planner_item_id uuid not null references planner_items(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);
