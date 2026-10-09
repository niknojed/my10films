-- List types: "made" (the ten films that made you), "alltime" (all-time top ten) and "genre"
-- (top ten in one genre). Existing lists become "made".
--
-- Run BEFORE deploying the code that sends list types. create_list gains two parameters with
-- defaults, so the code already deployed keeps saving while this runs ahead of it.

alter table public.lists
  add column if not exists list_type text not null default 'made'
    check (list_type in ('made', 'alltime', 'genre')),
  add column if not exists genre text
    check (genre is null or char_length(genre) between 1 and 40);

alter table public.lists
  drop constraint if exists lists_genre_matches_type,
  add constraint lists_genre_matches_type check ((list_type = 'genre') = (genre is not null));

-- The parameter list changes, so the old function has to go first. Leaving it would create an
-- ambiguous overload for calls that omit the new parameters.
drop function if exists public.create_list(text, text, text, text, text, text, text, jsonb, integer);

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
  p_genre text default null
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

  insert into lists (slug, name, quote, layout, theme, list_type, genre, content_hash, creator_hash)
  values (p_slug, p_name, p_quote, p_layout, p_theme, coalesce(p_list_type, 'made'),
          case when p_list_type = 'genre' then p_genre end, p_content_hash, p_creator_hash)
  returning id into v_id;

  insert into list_films (list_id, position, tmdb_id)
  select v_id, t.ord::smallint, (t.f ->> 'id')::integer
  from jsonb_array_elements(p_films) with ordinality as t (f, ord);

  return p_slug;
end;
$$;

revoke all on function public.create_list(text, text, text, text, text, text, text, jsonb, integer, text, text) from public, anon, authenticated;
grant execute on function public.create_list(text, text, text, text, text, text, text, jsonb, integer, text, text) to service_role;
