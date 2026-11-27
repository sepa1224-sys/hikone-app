-- OpenStreetMap からの一括取り込み用
--   opening_hours: OSM の書式（例 "Mo-Fr 11:00-14:00"）をそのまま文字で保存
--   source / source_id: どこから来たデータか（再取り込み時の重複防止）
alter table public.shops alter column opening_hours type text using opening_hours::text;
alter table public.shops add column source text not null default 'manual' check (source in ('manual', 'osm'));
alter table public.shops add column source_id text;
alter table public.shops add column website text;
alter table public.shops add constraint shops_source_id_key unique (source, source_id);
grant update (website) on public.shops to authenticated;
