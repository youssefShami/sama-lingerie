-- =========================================================
-- Sama Lingerie — Supabase (Postgres) schema
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run: everything is "if not exists" / "create or replace".
-- =========================================================

create table if not exists categories (
  id        text primary key,
  en        text not null,
  ar        text not null,
  position  int  not null default 0
);

create table if not exists colors (
  key  text primary key,
  en   text not null,
  ar   text not null,
  hex  text not null
);

create table if not exists products (
  id        text primary key,
  cat       text not null references categories(id) on update cascade,
  en        text not null,
  ar        text not null,
  price     numeric(10,2) not null check (price >= 0),
  old       numeric(10,2),
  img       text not null,
  thumb     text,
  imgs      jsonb not null default '[]'::jsonb,
  sizes     jsonb not null default '[]'::jsonb,
  colors    jsonb not null default '[]'::jsonb,
  tag       text,
  den       text not null default '',
  dar       text not null default '',
  stock     boolean not null default true,
  hidden    boolean not null default false,
  position  int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_cat_idx on products(cat);

create table if not exists deals (
  id        text primary key,
  en        text not null,
  ar        text not null,
  sub_en    text not null default '',
  sub_ar    text not null default '',
  cat       text not null default 'all',
  position  int not null default 0
);

-- about text, password hash, misc
create table if not exists settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id           bigint generated always as identity primary key,
  ref          text unique not null,
  created_at   timestamptz not null default now(),
  status       text not null default 'new' check (status in ('new','confirmed','delivered','cancelled')),
  name         text not null,
  phone        text not null,
  address      text not null,
  notes        text,
  lang         text not null default 'en',
  items        jsonb not null,
  total        numeric(10,2) not null,
  captcha_seed text unique,
  ip           text,
  ua           text,
  confirmed_at timestamptz,
  updated_at   timestamptz not null default now()
);
create index if not exists orders_created_idx on orders(created_at desc);
create index if not exists orders_status_idx on orders(status);

-- Row Level Security: the public anon key can do nothing; the API uses the service role key.
alter table categories enable row level security;
alter table colors     enable row level security;
alter table products   enable row level security;
alter table deals      enable row level security;
alter table settings   enable row level security;
alter table orders     enable row level security;

-- ---------- Catalogue as one JSON document (what the site and dashboard exchange) ----------
create or replace function get_catalog()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'cats',     coalesce((select jsonb_agg(jsonb_build_object('id',id,'en',en,'ar',ar) order by position, id) from categories), '[]'::jsonb),
    'colors',   coalesce((select jsonb_object_agg(key, jsonb_build_object('en',en,'ar',ar,'hex',hex)) from colors), '{}'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                    'id',id,'cat',cat,'en',en,'ar',ar,'price',price,'old',old,'img',img,'thumb',thumb,'imgs',imgs,
                    'sizes',sizes,'colors',colors,'tag',tag,'den',den,'dar',dar,'stock',stock,'hidden',hidden))
                    order by position, created_at) from products), '[]'::jsonb),
    'deals',    coalesce((select jsonb_agg(jsonb_build_object('id',id,'en',en,'ar',ar,'sub_en',sub_en,'sub_ar',sub_ar,'cat',cat) order by position, id) from deals), '[]'::jsonb),
    'about',    coalesce((select value from settings where key = 'about'), '{}'::jsonb),
    'updatedAt',(select to_char(max(updated_at) at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from settings where key = 'catalog-meta')
  );
$$;

-- Replace the whole catalogue atomically (one transaction) from the dashboard's JSON.
create or replace function replace_catalog(c jsonb)
returns void
language plpgsql
as $$
begin
  -- categories
  delete from categories where id not in (select (x->>'id') from jsonb_array_elements(c->'cats') x);
  insert into categories (id, en, ar, position)
    select x->>'id', x->>'en', x->>'ar', ord - 1
    from jsonb_array_elements(c->'cats') with ordinality as t(x, ord)
  on conflict (id) do update set en = excluded.en, ar = excluded.ar, position = excluded.position;

  -- colours
  delete from colors where key not in (select k from jsonb_object_keys(c->'colors') k);
  insert into colors (key, en, ar, hex)
    select k, v->>'en', v->>'ar', v->>'hex' from jsonb_each(c->'colors') as t(k, v)
  on conflict (key) do update set en = excluded.en, ar = excluded.ar, hex = excluded.hex;

  -- products
  delete from products where id not in (select (x->>'id') from jsonb_array_elements(c->'products') x);
  insert into products (id, cat, en, ar, price, old, img, thumb, imgs, sizes, colors, tag, den, dar, stock, hidden, position, updated_at)
    select x->>'id', x->>'cat', x->>'en', x->>'ar',
           (x->>'price')::numeric, nullif(x->>'old','')::numeric, x->>'img', x->>'thumb',
           coalesce(x->'imgs','[]'::jsonb), coalesce(x->'sizes','[]'::jsonb), coalesce(x->'colors','[]'::jsonb),
           nullif(x->>'tag',''), coalesce(x->>'den',''), coalesce(x->>'dar',''),
           coalesce((x->>'stock')::boolean, true), coalesce((x->>'hidden')::boolean, false), ord - 1, now()
    from jsonb_array_elements(c->'products') with ordinality as t(x, ord)
  on conflict (id) do update set
    cat = excluded.cat, en = excluded.en, ar = excluded.ar, price = excluded.price, old = excluded.old,
    img = excluded.img, thumb = excluded.thumb, imgs = excluded.imgs, sizes = excluded.sizes, colors = excluded.colors,
    tag = excluded.tag, den = excluded.den, dar = excluded.dar, stock = excluded.stock, hidden = excluded.hidden,
    position = excluded.position, updated_at = now();

  -- deals
  delete from deals where id not in (select (x->>'id') from jsonb_array_elements(c->'deals') x);
  insert into deals (id, en, ar, sub_en, sub_ar, cat, position)
    select x->>'id', x->>'en', x->>'ar', coalesce(x->>'sub_en',''), coalesce(x->>'sub_ar',''), coalesce(x->>'cat','all'), ord - 1
    from jsonb_array_elements(c->'deals') with ordinality as t(x, ord)
  on conflict (id) do update set en = excluded.en, ar = excluded.ar, sub_en = excluded.sub_en, sub_ar = excluded.sub_ar, cat = excluded.cat, position = excluded.position;

  -- about + meta
  insert into settings (key, value, updated_at) values ('about', coalesce(c->'about','{}'::jsonb), now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into settings (key, value, updated_at) values ('catalog-meta', jsonb_build_object('savedAt', now()), now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

-- ---------- Storage bucket for photos (public read, writes only through the API) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/webp','image/jpeg','image/png','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/webp','image/jpeg','image/png','image/avif'];
