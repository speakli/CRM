-- CRM Speakli — Schéma Supabase
-- À exécuter dans l'éditeur SQL de Supabase (Settings > SQL Editor)

create table if not exists crm_companies (
  id text primary key,
  row_data jsonb not null default '{}',
  created_at text default '',
  updated_at text default ''
);

create table if not exists crm_contacts (
  id text primary key,
  row_data jsonb not null default '{}',
  created_at text default '',
  updated_at text default ''
);

create table if not exists crm_calls (
  id text primary key,
  row_data jsonb not null default '{}',
  created_at text default '',
  updated_at text default ''
);

-- Table de configuration : headers TSV, vues, listes, audit, docs
create table if not exists crm_meta (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Index pour accélérer les requêtes
create index if not exists crm_companies_updated_at on crm_companies(updated_at);
create index if not exists crm_contacts_updated_at on crm_contacts(updated_at);
create index if not exists crm_calls_updated_at on crm_calls(updated_at);

-- RLS : désactivé pour l'instant (accès via service key uniquement)
alter table crm_companies disable row level security;
alter table crm_contacts disable row level security;
alter table crm_calls disable row level security;
alter table crm_meta disable row level security;
