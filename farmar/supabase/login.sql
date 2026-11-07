-- Prihlásenie farmárov heslom, ktoré vytvorí ERNTE (bez e-mailov). Prihlasovacie meno = e-mail alebo telefón.
alter table farmers add column if not exists login text unique;

create or replace function public.my_farmer_id() returns uuid
language sql stable security definer set search_path=public as $$
  select id from farmers where active and (lower(email)=lower(coalesce(auth.jwt()->>'email','')) or lower(login)=lower(coalesce(auth.jwt()->>'email',''))) limit 1;
$$;

create or replace function public.set_farmer_password(fid uuid, pw text, use_phone boolean default false) returns text
language plpgsql security definer set search_path=public, auth, extensions as $$
declare f farmers; lg text; d text; uid uuid;
begin
  if not is_staff() then raise exception 'Nemáte oprávnenie.'; end if;
  if length(coalesce(pw,''))<8 then raise exception 'Heslo musí mať aspoň 8 znakov.'; end if;
  select * into f from farmers where id=fid;
  if not found then raise exception 'Farmár neexistuje.'; end if;
  if use_phone or f.email is null then
    if f.phone is null then raise exception 'Farmár nemá e-mail ani telefón.'; end if;
    d := regexp_replace(f.phone,'\D','','g');
    if d like '00%' then d := substr(d,3); elsif d like '0%' then d := '421'||substr(d,2); end if;
    lg := d||'@tel.ernte.sk';
  else
    lg := lower(trim(f.email));
  end if;
  select id into uid from auth.users where lower(email)=lg limit 1;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
    values('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',lg,extensions.crypt(pw,extensions.gen_salt('bf')),now(),
      '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),'','','','');
    insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values(gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',lg,'email_verified',true),'email',now(),now(),now());
  else
    update auth.users set encrypted_password=extensions.crypt(pw,extensions.gen_salt('bf')),email_confirmed_at=coalesce(email_confirmed_at,now()),updated_at=now() where id=uid;
  end if;
  update farmers set login=lg, active=true where id=fid;
  return lg;
end $$;
revoke all on function public.set_farmer_password(uuid,text,boolean) from public, anon;
grant execute on function public.set_farmer_password(uuid,text,boolean) to authenticated;
