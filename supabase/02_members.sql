-- First create the two confirmed users in Supabase Authentication > Users.
-- Replace the two email placeholders below. Run only in Supabase SQL Editor.
-- Keep the edited copy private: do not commit personal addresses/passwords.
do $$
declare yuta uuid;yuko uuid;
begin
 select id into yuta from auth.users where lower(email)=lower('YUTA_EMAIL_HERE');
 select id into yuko from auth.users where lower(email)=lower('YUKO_EMAIL_HERE');
 if yuta is null or yuko is null then raise exception 'Create both Auth users first and replace both email placeholders.';end if;
 if yuta=yuko then raise exception 'Use two different accounts.';end if;
 insert into public.ft_members(user_id,display_name) values(yuta,'ゆうた'),(yuko,'ゆうこ')
 on conflict(user_id) do update set display_name=excluded.display_name;
end $$;
-- Removing a row blocks new database/storage requests. Already issued photo links may work for up to 5 minutes.
-- delete from public.ft_members where user_id = 'UUID_TO_REMOVE';
