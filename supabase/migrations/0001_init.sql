-- My 10 Films: shared lists and pick counts.
-- All access goes through the service role from the Next.js server. RLS is on with no policies,
-- so the anon and authenticated roles can read and write nothing.

create extension if not exists pgcrypto;

create table public.lists (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]{8,12}$'),
  name          text not null default '' check (char_length(name) <= 22),
  quote         text not null default '' check (char_length(quote) <= 80),
  layout        text not null check (layout in ('top', 'equal')),
  theme         text not null check (theme in ('velvet', 'silver', 'slate')),
  content_hash  text not null unique,
  creator_hash  text not null,
  created_at    timestamptz not null default now()
);

create table public.list_films (
  list_id      uuid not null references public.lists (id) on delete cascade,
  position     smallint not null check (position between 1 and 10),
  tmdb_id      integer not null check (tmdb_id > 0),
  title        text not null check (char_length(title) between 1 and 200),
  year         text not null default '' check (year ~ '^(\d{4})?$'),
  poster_path  text check (poster_path is null or poster_path ~ '^/[A-Za-z0-9_-]+\.(jpg|jpeg|png)$'),
  primary key (list_id, position),
  unique (list_id, tmdb_id)
);

create index list_films_tmdb_id_idx on public.list_films (tmdb_id);
create index lists_creator_recent_idx on public.lists (creator_hash, created_at desc);

alter table public.lists enable row level security;
alter table public.list_films enable row level security;

-- Saves a list and its ten films in one transaction.
-- Returns the existing slug when the same person saves an identical list again.
-- Raises 'rate_limited' when one person passes the hourly cap.
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

  insert into list_films (list_id, position, tmdb_id, title, year, poster_path)
  select v_id,
         t.ord::smallint,
         (t.f ->> 'id')::integer,
         left(t.f ->> 'title', 200),
         coalesce(t.f ->> 'year', ''),
         nullif(t.f ->> 'poster', '')
  from jsonb_array_elements(p_films) with ordinality as t (f, ord);

  return p_slug;
end;
$$;

-- A film's count is the number of distinct people who listed it, so one person saving many
-- lists moves a film by one at most.
create or replace function public.most_picked(lim integer default 20)
returns table (tmdb_id integer, title text, year text, poster_path text, picks bigint)
language sql
stable
security definer
set search_path = public
as $$
  select lf.tmdb_id,
         (array_agg(lf.title order by l.created_at desc))[1],
         (array_agg(lf.year order by l.created_at desc))[1],
         (array_agg(lf.poster_path order by l.created_at desc))[1],
         count(distinct l.creator_hash) as picks
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
