-- Store only TMDB ids for saved lists. TMDB's API terms (section 1.C) forbid caching their data for
-- longer than six months, so titles, years and poster paths are fetched from TMDB when a list is shown.
--
-- Run after the code that reads ids only is deployed. create_list keeps its signature and still accepts
-- the full film objects the save route sends, so the save route works before and after this runs.

alter table public.list_films
  drop column if exists title,
  drop column if exists year,
  drop column if exists poster_path;

create or replace function public.create_list(
  p_slug text,
  p_name text,
  p_quote text,
  p_layout text,
  p_theme text,
  p_content_hash text,
  p_creator_hash text,
  p_films jsonb,
  p_hourly_cap integer default 10
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
  v_recent integer;
begin
  select slug into v_slug from lists where content_hash = p_content_hash;
  if found then
    return v_slug;
  end if;

  if jsonb_typeof(p_films) <> 'array' or jsonb_array_length(p_films) <> 10 then
    raise exception 'bad_films';
  end if;

  select count(*) into v_recent
  from lists
  where creator_hash = p_creator_hash and created_at > now() - interval '1 hour';
  if v_recent >= p_hourly_cap then
    raise exception 'rate_limited';
  end if;

  insert into lists (slug, name, quote, layout, theme, content_hash, creator_hash)
  values (p_slug, p_name, p_quote, p_layout, p_theme, p_content_hash, p_creator_hash)
  returning id into v_id;

  insert into list_films (list_id, position, tmdb_id)
  select v_id, t.ord::smallint, (t.f ->> 'id')::integer
  from jsonb_array_elements(p_films) with ordinality as t (f, ord);

  return p_slug;
end;
$$;

-- The return type changes, so the old function has to go first.
drop function if exists public.most_picked(integer);

-- A film's count is the number of distinct people who listed it, so one person saving many
-- lists moves a film by one at most.
create function public.most_picked(lim integer default 20)
returns table (tmdb_id integer, picks bigint)
language sql
stable
security definer
set search_path = public
as $$
  select lf.tmdb_id, count(distinct l.creator_hash) as picks
  from list_films lf
  join lists l on l.id = lf.list_id
  group by lf.tmdb_id
  order by picks desc, lf.tmdb_id
  limit greatest(1, least(lim, 50));
$$;

revoke all on function public.create_list(text, text, text, text, text, text, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.most_picked(integer) from public, anon, authenticated;
grant execute on function public.create_list(text, text, text, text, text, text, text, jsonb, integer) to service_role;
grant execute on function public.most_picked(integer) to service_role;
