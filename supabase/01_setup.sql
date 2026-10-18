-- ふたりの旅地図 / Supabase setup. Run in the SQL Editor of your own project.
-- This adds ft_* tables and policies only. No email/password/key belongs in this file.
begin;
create table if not exists public.ft_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(btrim(display_name)) between 1 and 40)
);
create or replace function public.ft_is_member() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.ft_members where user_id=auth.uid()); $$;
create or replace function public.ft_valid_field(p_field text,p_value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare d text;v boolean;w boolean;
begin
 if p_field='travel' then
  if jsonb_typeof(p_value) is distinct from 'object' or jsonb_typeof(p_value->'date') is distinct from 'string' or jsonb_typeof(p_value->'visited') is distinct from 'boolean' or jsonb_typeof(p_value->'wish') is distinct from 'boolean' then return false;end if;
  d:=p_value->>'date';v:=(p_value->>'visited')::boolean;w:=(p_value->>'wish')::boolean;
  if d<>'' and (d!~'^\d{4}-\d{2}-\d{2}$' or to_char(d::date,'YYYY-MM-DD')<>d) then return false;end if;
  return (d='' or v) and not(v and w);
 elsif p_field='note' then return jsonb_typeof(p_value)='string' and length(p_value#>>'{}')<=2000;
 elsif p_field in ('spots-0','spots-1','foods-0','foods-1','drinks-0','drinks-1') then return jsonb_typeof(p_value)='boolean';
 else return false;end if;
exception when others then return false;
end $$;
create table if not exists public.ft_fields (
 prefecture smallint not null check(prefecture between 1 and 47),
 field text not null,
 value jsonb not null,
 revision bigint not null default 1 check(revision>0),
 updated_by uuid not null default auth.uid() references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(prefecture,field),check(public.ft_valid_field(field,value))
);
create table if not exists public.ft_wishes (
 id uuid primary key,
 prefecture smallint not null check(prefecture between 1 and 47),
 owner_id uuid not null default auth.uid() references public.ft_members(user_id),
 kind text not null check(kind in('spot','food')),
 title text not null check(length(btrim(title)) between 1 and 100),
 memo text not null default '' check(length(memo)<=500),
 url text not null default '' check(length(url)<=1000 and (url='' or url~'^https?://[^[:space:]]+$')),
 completed boolean not null default false,
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.ft_shots (
 id uuid primary key,
 prefecture smallint not null check(prefecture between 1 and 47),
 owner_id uuid not null default auth.uid() references public.ft_members(user_id),
 object_path text not null unique check(split_part(object_path,'/',1)=owner_id::text),
 content_type text not null check(content_type in('image/jpeg','image/png','image/webp')),
 caption text not null default '' check(length(caption)<=200),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 unique(prefecture,owner_id)
);
create or replace function public.ft_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
 new.revision:=old.revision+1;new.updated_at:=clock_timestamp();
 if tg_table_name='ft_fields' then new.updated_by:=auth.uid();end if;
 return new;
end $$;
drop trigger if exists ft_fields_touch on public.ft_fields;
create trigger ft_fields_touch before update on public.ft_fields for each row execute function public.ft_touch();
drop trigger if exists ft_wishes_touch on public.ft_wishes;
create trigger ft_wishes_touch before update on public.ft_wishes for each row execute function public.ft_touch();
drop trigger if exists ft_shots_touch on public.ft_shots;
create trigger ft_shots_touch before update on public.ft_shots for each row execute function public.ft_touch();
alter table public.ft_members enable row level security;
alter table public.ft_fields enable row level security;
alter table public.ft_wishes enable row level security;
alter table public.ft_shots enable row level security;
revoke all on public.ft_members,public.ft_fields,public.ft_wishes,public.ft_shots from anon,authenticated;
grant select on public.ft_members,public.ft_fields,public.ft_wishes,public.ft_shots to authenticated;
grant update(display_name) on public.ft_members to authenticated;
grant insert(prefecture,field,value),update(value) on public.ft_fields to authenticated;
grant insert(id,prefecture,kind,title,memo,url),update(kind,title,memo,url,completed),delete on public.ft_wishes to authenticated;
grant insert(id,prefecture,object_path,content_type,caption),update(id,object_path,content_type,caption),delete on public.ft_shots to authenticated;
revoke all on function public.ft_is_member() from public,anon;
grant execute on function public.ft_is_member() to authenticated;
revoke all on function public.ft_valid_field(text,jsonb) from public,anon;
grant execute on function public.ft_valid_field(text,jsonb) to authenticated;
revoke all on function public.ft_touch() from public,anon;
drop policy if exists ft_members_read on public.ft_members;
create policy ft_members_read on public.ft_members for select to authenticated using(public.ft_is_member());
drop policy if exists ft_members_own_name on public.ft_members;
create policy ft_members_own_name on public.ft_members for update to authenticated using(user_id=auth.uid() and public.ft_is_member()) with check(user_id=auth.uid());
drop policy if exists ft_fields_read on public.ft_fields;
create policy ft_fields_read on public.ft_fields for select to authenticated using(public.ft_is_member());
drop policy if exists ft_fields_insert on public.ft_fields;
create policy ft_fields_insert on public.ft_fields for insert to authenticated with check(public.ft_is_member());
drop policy if exists ft_fields_update on public.ft_fields;
create policy ft_fields_update on public.ft_fields for update to authenticated using(public.ft_is_member()) with check(public.ft_is_member());
drop policy if exists ft_wishes_read on public.ft_wishes;
create policy ft_wishes_read on public.ft_wishes for select to authenticated using(public.ft_is_member());
drop policy if exists ft_wishes_insert on public.ft_wishes;
create policy ft_wishes_insert on public.ft_wishes for insert to authenticated with check(public.ft_is_member() and owner_id=auth.uid());
drop policy if exists ft_wishes_update on public.ft_wishes;
create policy ft_wishes_update on public.ft_wishes for update to authenticated using(public.ft_is_member() and owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists ft_wishes_delete on public.ft_wishes;
create policy ft_wishes_delete on public.ft_wishes for delete to authenticated using(public.ft_is_member() and owner_id=auth.uid());
drop policy if exists ft_shots_read on public.ft_shots;
create policy ft_shots_read on public.ft_shots for select to authenticated using(public.ft_is_member());
drop policy if exists ft_shots_insert on public.ft_shots;
create policy ft_shots_insert on public.ft_shots for insert to authenticated with check(public.ft_is_member() and owner_id=auth.uid());
drop policy if exists ft_shots_update on public.ft_shots;
create policy ft_shots_update on public.ft_shots for update to authenticated using(public.ft_is_member() and owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists ft_shots_delete on public.ft_shots;
create policy ft_shots_delete on public.ft_shots for delete to authenticated using(public.ft_is_member() and owner_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('futari-bestshots','futari-bestshots',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists ft_storage_read on storage.objects;
create policy ft_storage_read on storage.objects for select to authenticated using(bucket_id='futari-bestshots' and public.ft_is_member());
drop policy if exists ft_storage_insert on storage.objects;
create policy ft_storage_insert on storage.objects for insert to authenticated with check(bucket_id='futari-bestshots' and public.ft_is_member() and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists ft_storage_delete on storage.objects;
create policy ft_storage_delete on storage.objects for delete to authenticated using(bucket_id='futari-bestshots' and public.ft_is_member() and (storage.foldername(name))[1]=auth.uid()::text);
commit;
