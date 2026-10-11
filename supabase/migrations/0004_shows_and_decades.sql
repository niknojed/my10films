-- Share links for shows, and "By decade" lists for films.
--
-- lists.media_type: 'movie' or 'tv'. TMDB numbers films and shows separately, so a saved list needs
-- it to look its titles up again. Existing lists are films.
-- lists.decade: start year of a "decade" list, such as 1980. Films only, 1950 to 2020.
--
-- Run BEFORE deploying the code that reads media_type and decade. create_list and most_picked gain
-- parameters with defaults, so the code already deployed keeps working while this runs ahead of it.

alter table public.lists
  add column if not exists media_type text not null default 'movie',
  add column if not exists decade smallint;

-- Replace whatever check constraints already cover list_type, whatever Postgres named them, so
-- 'decade' becomes a valid type. The genre rule from 0003 is kept.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.lists'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%list_type%'
      and conname <> 'lists_genre_matches_type'
  loop
    execute format('alter table public.lists drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.lists
  drop constraint if exists lists_list_type_valid,
  drop constraint if exists lists_media_type_valid,
  drop constraint if exists lists_decade_valid,
  drop constraint if exists lists_decade_matches_type,
  drop constraint if exists lists_shows_made_or_alltime,
  add constraint lists_list_type_valid check (list_type in ('made', 'alltime', 'genre', 'decade')),
  add constraint lists_media_type_valid check (media_type in ('movie', 'tv')),
  add constraint lists_decade_valid check (decade is null or (decade between 1950 and 2020 and decade % 10 = 0)),
  add constraint lists_decade_matches_type check ((list_type = 'decade') = (decade is not null)),
  -- Shows have no genres or decades.
  add constraint lists_shows_made_or_alltime check (media_type = 'movie' or list_type in ('made', 'alltime'));

-- The parameter list changes, so the old function has to go first. Leaving it would create an
-- ambiguous overload for calls that omit the new parameters.
drop function if exists public.create_list(text, text, text, text, text, text, text, jsonb, integer, text, text);
-- And this migration's own version, so running it twice is safe.
drop function if exists public.create_list(text, text, text, text, text, text, text, jsonb, integer, text, text, text, smallint);

create function public.create_list(
  p_slug text,
  p_name text,
  p_quote text,
  p_layout text,
  p_theme text,
  p_content_hash text,
  p_creator_hash text,
  p_films jsonb,
  p_hourly_cap integer default 10,
  p_list_type text default 'made',
  p_genre text default null,
  p_media_type text default 'movie',
  p_decade smallint default null
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

  insert into lists (slug, name, quote, layout, theme, list_type, genre, decade, media_type, content_hash, creator_hash)
  values (
    p_slug, p_name, p_quote, p_layout, p_theme,
    coalesce(p_list_type, 'made'),
    case when p_list_type = 'genre' then p_genre end,
    case when p_list_type = 'decade' then p_decade end,
    coalesce(p_media_type, 'movie'),
    p_content_hash, p_creator_hash
  )
  returning id into v_id;

  insert into list_films (list_id, position, tmdb_id)
  select v_id, t.ord::smallint, (t.f ->> 'id')::integer
  from jsonb_array_elements(p_films) with ordinality as t (f, ord);

  return p_slug;
end;
$$;

-- Most picked counts films and shows separately: a film and a show can share a TMDB id.
drop function if exists public.most_picked(integer);
drop function if exists public.most_picked(integer, text);

create function public.most_picked(lim integer default 20, p_media text default 'movie')
returns table (tmdb_id integer, picks bigint)
language sql
stable
security definer
set search_path = public
as $$
  select lf.tmdb_id, count(distinct l.creator_hash) as picks
  from list_films lf
  join lists l on l.id = lf.list_id
  where l.media_type = coalesce(p_media, 'movie')
  group by lf.tmdb_id
  order by picks desc, lf.tmdb_id
  limit greatest(1, least(lim, 50));
$$;

revoke all on function public.create_list(text, text, text, text, text, text, text, jsonb, integer, text, text, text, smallint) from public, anon, authenticated;
revoke all on function public.most_picked(integer, text) from public, anon, authenticated;
grant execute on function public.create_list(text, text, text, text, text, text, text, jsonb, integer, text, text, text, smallint) to service_role;
grant execute on function public.most_picked(integer, text) to service_role;
