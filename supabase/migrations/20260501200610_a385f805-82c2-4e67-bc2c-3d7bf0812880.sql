create table if not exists public.persona_usage (
  persona_id text primary key,
  count bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.persona_usage enable row level security;

create policy "Anyone can read persona usage"
  on public.persona_usage for select
  using (true);

create or replace function public.increment_persona_usage(p_persona_id text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  insert into public.persona_usage as pu (persona_id, count, updated_at)
  values (p_persona_id, 1, now())
  on conflict (persona_id)
  do update set count = pu.count + 1, updated_at = now()
  returning count into new_count;
  return new_count;
end;
$$;

grant execute on function public.increment_persona_usage(text) to anon, authenticated;

alter publication supabase_realtime add table public.persona_usage;