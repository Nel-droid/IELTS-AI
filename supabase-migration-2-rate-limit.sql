-- Per-user rate limiting for the Groq proxy edge functions.
-- No RLS policies are added on purpose: RLS is enabled with zero policies,
-- which denies ALL access to anon/authenticated roles by default. Only the
-- service_role key (used exclusively server-side by the edge functions,
-- never shipped to the client) can read or write this table, since
-- service_role bypasses RLS entirely by Supabase's design.

create table if not exists api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count int not null default 0,
  primary key (user_id, window_start)
);

alter table api_usage enable row level security;

create index if not exists api_usage_window_idx on api_usage(window_start);

-- Atomic increment-and-read, so concurrent requests in the same window can't
-- race each other into undercounting.
create or replace function increment_api_usage(p_user_id uuid, p_window_start timestamptz)
returns int
language plpgsql
as $$
declare
  new_count int;
begin
  insert into api_usage (user_id, window_start, request_count)
  values (p_user_id, p_window_start, 1)
  on conflict (user_id, window_start)
  do update set request_count = api_usage.request_count + 1
  returning request_count into new_count;
  return new_count;
end;
$$;
