-- The role an applicant applied for, from the open roles at /Finathon/careers
-- (IDs defined in src/lib/careers/roles.ts). Null for a general application
-- from /careers, which has no role picker. Free text with a format check
-- rather than a foreign key: roles live in code, not in a table.

alter table public.career_application
  add column role_id text
    check (role_id is null or role_id ~ '^FIN-[A-Z]{3}-[0-9]{4}$');

create index career_application_role_id_idx
  on public.career_application (role_id, submitted_at desc);
