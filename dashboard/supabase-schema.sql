-- ============================================================
-- WEDDING DASHBOARD — SUPABASE SCHEMA
-- Jalankan file ini di Supabase SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- TABEL: guests
-- ============================================================
create table if not exists public.guests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  group_name    text default 'Umum',
  table_number  int,
  session       text default 'Keduanya',
  qr_token      text unique not null default gen_random_uuid()::text,
  rsvp_status   text default 'pending',
  checked_in    boolean default false,
  checked_in_at timestamptz,
  notes         text,
  created_at    timestamptz default now()
);

-- ============================================================
-- TABEL: rsvp_submissions
-- ============================================================
create table if not exists public.rsvp_submissions (
  id              uuid primary key default gen_random_uuid(),
  guest_name      text not null,
  phone           text,
  attendance      text not null,
  pax             int default 1,
  message         text,
  linked_guest_id uuid references public.guests(id) on delete set null,
  created_at      timestamptz default now()
);

-- ============================================================
-- TABEL: gifts
-- ============================================================
create table if not exists public.gifts (
  id          uuid primary key default gen_random_uuid(),
  from_name   text not null,
  type        text default 'amplop',
  amount      int default 0,
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.guests enable row level security;
alter table public.rsvp_submissions enable row level security;
alter table public.gifts enable row level security;

create policy "Auth full access guests" on public.guests for all to authenticated using (true) with check (true);
create policy "Auth full access rsvp" on public.rsvp_submissions for all to authenticated using (true) with check (true);
create policy "Auth full access gifts" on public.gifts for all to authenticated using (true) with check (true);
create policy "Anon insert rsvp" on public.rsvp_submissions for insert to anon with check (true);
create policy "Anon select guest" on public.guests for select to anon using (true);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.rsvp_submissions;
alter publication supabase_realtime add table public.guests;

-- ============================================================
-- SETELAH BUAT USER DI SUPABASE AUTH, SET ROLE:
-- update auth.users set raw_user_meta_data = '{"role":"admin"}' where email = 'admin@email.com';
-- update auth.users set raw_user_meta_data = '{"role":"checkin"}' where email = 'checkin@email.com';
-- ============================================================
