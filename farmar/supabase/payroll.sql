-- ERNTE – mzdy vodičov: súradnice jázd (kraj / mimo kraja) + nastavenie
alter table rides add column if not exists lat_start numeric;
alter table rides add column if not exists lon_start numeric;
alter table rides add column if not exists lat_stop numeric;
alter table rides add column if not exists lon_stop numeric;
insert into fleet_cfg(key,value) values('pay','{"base":1031,"inReg":80,"outReg":90,"minKm":10}') on conflict(key) do nothing;
drop policy if exists fcfg_rw on fleet_cfg;
-- mzdy a skutočný obrat vidí a mení iba majiteľ
create policy fcfg_rw on fleet_cfg for all using (is_fleet() and (key not in ('pay','revenue') or is_owner())) with check (is_fleet() and (key not in ('pay','revenue') or is_owner()));
-- cmd_sync (aj so súradnicami jázd) je vo fleet.sql – tu sa už neprepisuje

-- jazdy za 60 dní načítať znova so súradnicami
delete from cmd_log where kind='backfill';
select public.cmd_sync();
