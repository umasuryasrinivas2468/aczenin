-- Job applications submitted at aczen.in/careers.
--
-- Like finathon_registration, this table holds personal data (name, email,
-- phone) that cannot be hashed away, so the protection is access control:
-- RLS forced with zero policies and all privileges revoked from anon and
-- authenticated. Reachable only through the service-role key, server-side.

create table public.career_application (
  id bigint generated always as identity primary key,
  submitted_at timestamptz not null default now(),

  full_name text not null
    check (char_length(btrim(full_name)) between 2 and 80),
  email text not null
    check (char_length(email) between 5 and 254),
  -- Stored as submitted (digits, optional leading +). Bounds, not a format,
  -- because applicants may be outside India.
  phone text not null
    check (char_length(phone) between 7 and 20),
  skills text not null
    check (char_length(btrim(skills)) between 2 and 1000),
  projects text not null
    check (char_length(btrim(projects)) between 10 and 4000),
  -- A link (Drive, Dropbox, personal site), not an upload: no bucket to secure.
  resume_url text not null
    check (char_length(resume_url) between 10 and 500 and resume_url ~* '^https?://'),

  -- Daily-rotating sha256(ip + salt + date). Present only for the per-source
  -- rate limit in the API route.
  ip_hash text
);

create index career_application_submitted_at_idx
  on public.career_application (submitted_at desc);

create index career_application_ip_hash_idx
  on public.career_application (ip_hash, submitted_at desc);

alter table public.career_application enable row level security;
alter table public.career_application force row level security;
revoke all on public.career_application from anon, authenticated;
