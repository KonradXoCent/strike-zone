-- Zone Football clubs. No client-supplied balances, card ratings or pack prices.
insert into public.zh_games(id,title,description_pl,description_en,tags,free,published,price_zc,package_config) values
('zone-football','Zone Football','Piłka 5 na 5 oraz Ultimate Team 11 na 11. Własny klub, paczki, ligi i puchary.','5v5 football and 11v11 Ultimate Team. Your club, player packs, leagues and cups.',array['Sport','Football','Multiplayer','Bots'],false,true,50,'{"protocol":1,"bundle":"zone-football","version":"0.2.0"}')
on conflict(id) do update set price_zc=50,free=false,published=true,description_pl=excluded.description_pl,description_en=excluded.description_en,package_config=excluded.package_config;
create schema if not exists zone_football_private;
revoke all on schema zone_football_private from public,anon;
grant usage on schema zone_football_private to authenticated;
create table if not exists zone_football_private.players(id text primary key,data jsonb not null);
create table if not exists zone_football_private.clubs(user_id uuid primary key references auth.users(id) on delete cascade,name text not null default 'Zone United',formation text not null default '4-3-3',cards jsonb not null default '[]',squad jsonb not null default '[]',progress jsonb not null default '{}',revision bigint not null default 1);
create table if not exists zone_football_private.packs(user_id uuid not null references auth.users(id) on delete cascade,nonce uuid not null,pack text not null,cards jsonb not null,created_at timestamptz not null default now(),primary key(user_id,nonce));
create table if not exists zone_football_private.rooms(id uuid primary key default gen_random_uuid(),code text unique not null,topic uuid not null default gen_random_uuid(),host_id uuid not null references auth.users(id) on delete cascade,guest_id uuid references auth.users(id) on delete set null,expires_at timestamptz not null default now()+interval '2 hours');
create index if not exists football_rooms_host on zone_football_private.rooms(host_id);
create index if not exists football_rooms_guest on zone_football_private.rooms(guest_id);
create index if not exists football_rooms_expiry on zone_football_private.rooms(expires_at);
alter table zone_football_private.players enable row level security;
alter table zone_football_private.clubs enable row level security;
alter table zone_football_private.packs enable row level security;
alter table zone_football_private.rooms enable row level security;
revoke all on all tables in schema zone_football_private from public,anon,authenticated;
insert into zone_football_private.players(id,data) values
('zf-001','{"id":"zf-001","name":"Milan Veldan","position":"GK","tier":"bronze","rating":60,"pace":53,"shoot":54,"pass":57,"defend":48,"keeper":60,"portrait":0}'::jsonb),
('zf-002','{"id":"zf-002","name":"Adrian Morello","position":"LB","tier":"bronze","rating":67,"pace":63,"shoot":61,"pass":64,"defend":74,"keeper":22,"portrait":1}'::jsonb),
('zf-003','{"id":"zf-003","name":"Niko Rovik","position":"CB","tier":"bronze","rating":64,"pace":63,"shoot":58,"pass":61,"defend":71,"keeper":22,"portrait":2}'::jsonb),
('zf-004','{"id":"zf-004","name":"Leon Santoski","position":"RB","tier":"bronze","rating":61,"pace":63,"shoot":55,"pass":58,"defend":68,"keeper":22,"portrait":3}'::jsonb),
('zf-005','{"id":"zf-005","name":"Oskar Kordel","position":"CM","tier":"bronze","rating":68,"pace":73,"shoot":62,"pass":74,"defend":56,"keeper":22,"portrait":4}'::jsonb),
('zf-006','{"id":"zf-006","name":"Ruben Navaro","position":"CAM","tier":"bronze","rating":65,"pace":58,"shoot":59,"pass":71,"defend":53,"keeper":22,"portrait":5}'::jsonb),
('zf-007','{"id":"zf-007","name":"Ivo Silven","position":"LW","tier":"bronze","rating":62,"pace":58,"shoot":56,"pass":59,"defend":50,"keeper":22,"portrait":6}'::jsonb),
('zf-008','{"id":"zf-008","name":"Dario Torvik","position":"ST","tier":"bronze","rating":69,"pace":68,"shoot":76,"pass":66,"defend":57,"keeper":22,"portrait":7}'::jsonb),
('zf-009','{"id":"zf-009","name":"Elias Valenti","position":"RW","tier":"bronze","rating":66,"pace":68,"shoot":60,"pass":63,"defend":54,"keeper":22,"portrait":8}'::jsonb),
('zf-010','{"id":"zf-010","name":"Teo Zarecki","position":"GK","tier":"bronze","rating":63,"pace":68,"shoot":57,"pass":60,"defend":51,"keeper":63,"portrait":9}'::jsonb),
('zf-011','{"id":"zf-011","name":"Aron Lindaro","position":"LB","tier":"bronze","rating":60,"pace":53,"shoot":54,"pass":57,"defend":67,"keeper":22,"portrait":10}'::jsonb),
('zf-012','{"id":"zf-012","name":"Bruno Bergan","position":"CB","tier":"bronze","rating":67,"pace":63,"shoot":61,"pass":64,"defend":74,"keeper":22,"portrait":11}'::jsonb),
('zf-013','{"id":"zf-013","name":"Luca Castelo","position":"RB","tier":"bronze","rating":64,"pace":63,"shoot":58,"pass":61,"defend":71,"keeper":22,"portrait":12}'::jsonb),
('zf-014','{"id":"zf-014","name":"Emil Norlund","position":"CM","tier":"bronze","rating":61,"pace":63,"shoot":55,"pass":67,"defend":49,"keeper":22,"portrait":13}'::jsonb),
('zf-015','{"id":"zf-015","name":"Noel Ferano","position":"CAM","tier":"bronze","rating":68,"pace":73,"shoot":62,"pass":74,"defend":56,"keeper":22,"portrait":14}'::jsonb),
('zf-016','{"id":"zf-016","name":"Kamil Wolenski","position":"LW","tier":"bronze","rating":65,"pace":58,"shoot":59,"pass":62,"defend":53,"keeper":22,"portrait":15}'::jsonb),
('zf-017','{"id":"zf-017","name":"Marek Demaro","position":"ST","tier":"bronze","rating":62,"pace":58,"shoot":69,"pass":59,"defend":50,"keeper":22,"portrait":16}'::jsonb),
('zf-018','{"id":"zf-018","name":"Soren Ostvik","position":"RW","tier":"bronze","rating":69,"pace":68,"shoot":63,"pass":66,"defend":57,"keeper":22,"portrait":17}'::jsonb),
('zf-019','{"id":"zf-019","name":"Enzo Lazaro","position":"GK","tier":"bronze","rating":66,"pace":68,"shoot":60,"pass":63,"defend":54,"keeper":66,"portrait":18}'::jsonb),
('zf-020','{"id":"zf-020","name":"Tomas Karven","position":"LB","tier":"bronze","rating":63,"pace":68,"shoot":57,"pass":60,"defend":70,"keeper":22,"portrait":19}'::jsonb),
('zf-021','{"id":"zf-021","name":"Alex Solano","position":"CB","tier":"bronze","rating":60,"pace":53,"shoot":54,"pass":57,"defend":67,"keeper":22,"portrait":20}'::jsonb),
('zf-022','{"id":"zf-022","name":"Hugo Bravik","position":"RB","tier":"bronze","rating":67,"pace":63,"shoot":61,"pass":64,"defend":74,"keeper":22,"portrait":21}'::jsonb),
('zf-023','{"id":"zf-023","name":"Rio Caldor","position":"CM","tier":"bronze","rating":64,"pace":63,"shoot":58,"pass":70,"defend":52,"keeper":22,"portrait":22}'::jsonb),
('zf-024','{"id":"zf-024","name":"Jan Melnik","position":"CAM","tier":"bronze","rating":61,"pace":63,"shoot":55,"pass":67,"defend":49,"keeper":22,"portrait":23}'::jsonb),
('zf-025','{"id":"zf-025","name":"Erik Astori","position":"LW","tier":"bronze","rating":68,"pace":73,"shoot":62,"pass":65,"defend":56,"keeper":22,"portrait":24}'::jsonb),
('zf-026','{"id":"zf-026","name":"Felix Renvald","position":"ST","tier":"bronze","rating":65,"pace":58,"shoot":72,"pass":62,"defend":53,"keeper":22,"portrait":25}'::jsonb),
('zf-027','{"id":"zf-027","name":"Alan Sorell","position":"RW","tier":"bronze","rating":62,"pace":58,"shoot":56,"pass":59,"defend":50,"keeper":22,"portrait":26}'::jsonb),
('zf-028','{"id":"zf-028","name":"Igor Vossan","position":"GK","tier":"bronze","rating":69,"pace":68,"shoot":63,"pass":66,"defend":57,"keeper":69,"portrait":27}'::jsonb),
('zf-029','{"id":"zf-029","name":"Lian Arden","position":"LB","tier":"bronze","rating":66,"pace":68,"shoot":60,"pass":63,"defend":73,"keeper":22,"portrait":28}'::jsonb),
('zf-030','{"id":"zf-030","name":"Victor Kovaro","position":"CB","tier":"bronze","rating":63,"pace":68,"shoot":57,"pass":60,"defend":70,"keeper":22,"portrait":29}'::jsonb),
('zf-031','{"id":"zf-031","name":"Milan Torvik","position":"RB","tier":"bronze","rating":60,"pace":53,"shoot":54,"pass":57,"defend":67,"keeper":22,"portrait":0}'::jsonb),
('zf-032','{"id":"zf-032","name":"Adrian Valenti","position":"CM","tier":"bronze","rating":67,"pace":63,"shoot":61,"pass":73,"defend":55,"keeper":22,"portrait":1}'::jsonb),
('zf-033','{"id":"zf-033","name":"Niko Zarecki","position":"CAM","tier":"bronze","rating":64,"pace":63,"shoot":58,"pass":70,"defend":52,"keeper":22,"portrait":2}'::jsonb),
('zf-034','{"id":"zf-034","name":"Leon Lindaro","position":"LW","tier":"bronze","rating":61,"pace":63,"shoot":55,"pass":58,"defend":49,"keeper":22,"portrait":3}'::jsonb),
('zf-035','{"id":"zf-035","name":"Oskar Bergan","position":"ST","tier":"bronze","rating":68,"pace":73,"shoot":75,"pass":65,"defend":56,"keeper":22,"portrait":4}'::jsonb),
('zf-036','{"id":"zf-036","name":"Ruben Castelo","position":"RW","tier":"bronze","rating":65,"pace":58,"shoot":59,"pass":62,"defend":53,"keeper":22,"portrait":5}'::jsonb),
('zf-037','{"id":"zf-037","name":"Ivo Norlund","position":"GK","tier":"bronze","rating":62,"pace":58,"shoot":56,"pass":59,"defend":50,"keeper":62,"portrait":6}'::jsonb),
('zf-038','{"id":"zf-038","name":"Dario Ferano","position":"LB","tier":"bronze","rating":69,"pace":68,"shoot":63,"pass":66,"defend":76,"keeper":22,"portrait":7}'::jsonb),
('zf-039','{"id":"zf-039","name":"Elias Wolenski","position":"CB","tier":"bronze","rating":66,"pace":68,"shoot":60,"pass":63,"defend":73,"keeper":22,"portrait":8}'::jsonb),
('zf-040','{"id":"zf-040","name":"Teo Demaro","position":"RB","tier":"bronze","rating":63,"pace":68,"shoot":57,"pass":60,"defend":70,"keeper":22,"portrait":9}'::jsonb),
('zf-041','{"id":"zf-041","name":"Aron Ostvik","position":"CM","tier":"bronze","rating":60,"pace":53,"shoot":54,"pass":66,"defend":48,"keeper":22,"portrait":10}'::jsonb),
('zf-042','{"id":"zf-042","name":"Bruno Lazaro","position":"CAM","tier":"bronze","rating":67,"pace":63,"shoot":61,"pass":73,"defend":55,"keeper":22,"portrait":11}'::jsonb),
('zf-043','{"id":"zf-043","name":"Luca Karven","position":"LW","tier":"bronze","rating":64,"pace":63,"shoot":58,"pass":61,"defend":52,"keeper":22,"portrait":12}'::jsonb),
('zf-044','{"id":"zf-044","name":"Emil Solano","position":"ST","tier":"bronze","rating":61,"pace":63,"shoot":68,"pass":58,"defend":49,"keeper":22,"portrait":13}'::jsonb),
('zf-045','{"id":"zf-045","name":"Noel Bravik","position":"RW","tier":"bronze","rating":68,"pace":73,"shoot":62,"pass":65,"defend":56,"keeper":22,"portrait":14}'::jsonb),
('zf-046','{"id":"zf-046","name":"Kamil Caldor","position":"GK","tier":"silver","rating":75,"pace":68,"shoot":69,"pass":72,"defend":63,"keeper":75,"portrait":15}'::jsonb),
('zf-047','{"id":"zf-047","name":"Marek Melnik","position":"LB","tier":"silver","rating":72,"pace":68,"shoot":66,"pass":69,"defend":79,"keeper":22,"portrait":16}'::jsonb),
('zf-048','{"id":"zf-048","name":"Soren Astori","position":"CB","tier":"silver","rating":79,"pace":78,"shoot":73,"pass":76,"defend":86,"keeper":22,"portrait":17}'::jsonb),
('zf-049','{"id":"zf-049","name":"Enzo Renvald","position":"RB","tier":"silver","rating":76,"pace":78,"shoot":70,"pass":73,"defend":83,"keeper":22,"portrait":18}'::jsonb),
('zf-050','{"id":"zf-050","name":"Tomas Sorell","position":"CM","tier":"silver","rating":73,"pace":78,"shoot":67,"pass":79,"defend":61,"keeper":22,"portrait":19}'::jsonb),
('zf-051','{"id":"zf-051","name":"Alex Vossan","position":"CAM","tier":"silver","rating":70,"pace":63,"shoot":64,"pass":76,"defend":58,"keeper":22,"portrait":20}'::jsonb),
('zf-052','{"id":"zf-052","name":"Hugo Arden","position":"LW","tier":"silver","rating":77,"pace":73,"shoot":71,"pass":74,"defend":65,"keeper":22,"portrait":21}'::jsonb),
('zf-053','{"id":"zf-053","name":"Rio Kovaro","position":"ST","tier":"silver","rating":74,"pace":73,"shoot":81,"pass":71,"defend":62,"keeper":22,"portrait":22}'::jsonb),
('zf-054','{"id":"zf-054","name":"Jan Veldan","position":"RW","tier":"silver","rating":71,"pace":73,"shoot":65,"pass":68,"defend":59,"keeper":22,"portrait":23}'::jsonb),
('zf-055','{"id":"zf-055","name":"Erik Morello","position":"GK","tier":"silver","rating":78,"pace":83,"shoot":72,"pass":75,"defend":66,"keeper":78,"portrait":24}'::jsonb),
('zf-056','{"id":"zf-056","name":"Felix Rovik","position":"LB","tier":"silver","rating":75,"pace":68,"shoot":69,"pass":72,"defend":82,"keeper":22,"portrait":25}'::jsonb),
('zf-057','{"id":"zf-057","name":"Alan Santoski","position":"CB","tier":"silver","rating":72,"pace":68,"shoot":66,"pass":69,"defend":79,"keeper":22,"portrait":26}'::jsonb),
('zf-058','{"id":"zf-058","name":"Igor Kordel","position":"RB","tier":"silver","rating":79,"pace":78,"shoot":73,"pass":76,"defend":86,"keeper":22,"portrait":27}'::jsonb),
('zf-059','{"id":"zf-059","name":"Lian Navaro","position":"CM","tier":"silver","rating":76,"pace":78,"shoot":70,"pass":82,"defend":64,"keeper":22,"portrait":28}'::jsonb),
('zf-060','{"id":"zf-060","name":"Victor Silven","position":"CAM","tier":"silver","rating":73,"pace":78,"shoot":67,"pass":79,"defend":61,"keeper":22,"portrait":29}'::jsonb),
('zf-061','{"id":"zf-061","name":"Milan Ferano","position":"LW","tier":"silver","rating":70,"pace":63,"shoot":64,"pass":67,"defend":58,"keeper":22,"portrait":0}'::jsonb),
('zf-062','{"id":"zf-062","name":"Adrian Wolenski","position":"ST","tier":"silver","rating":77,"pace":73,"shoot":84,"pass":74,"defend":65,"keeper":22,"portrait":1}'::jsonb),
('zf-063','{"id":"zf-063","name":"Niko Demaro","position":"RW","tier":"silver","rating":74,"pace":73,"shoot":68,"pass":71,"defend":62,"keeper":22,"portrait":2}'::jsonb),
('zf-064','{"id":"zf-064","name":"Leon Ostvik","position":"GK","tier":"silver","rating":71,"pace":73,"shoot":65,"pass":68,"defend":59,"keeper":71,"portrait":3}'::jsonb),
('zf-065','{"id":"zf-065","name":"Oskar Lazaro","position":"LB","tier":"silver","rating":78,"pace":83,"shoot":72,"pass":75,"defend":85,"keeper":22,"portrait":4}'::jsonb),
('zf-066','{"id":"zf-066","name":"Ruben Karven","position":"CB","tier":"silver","rating":75,"pace":68,"shoot":69,"pass":72,"defend":82,"keeper":22,"portrait":5}'::jsonb),
('zf-067','{"id":"zf-067","name":"Ivo Solano","position":"RB","tier":"silver","rating":72,"pace":68,"shoot":66,"pass":69,"defend":79,"keeper":22,"portrait":6}'::jsonb),
('zf-068','{"id":"zf-068","name":"Dario Bravik","position":"CM","tier":"silver","rating":79,"pace":78,"shoot":73,"pass":85,"defend":67,"keeper":22,"portrait":7}'::jsonb),
('zf-069','{"id":"zf-069","name":"Elias Caldor","position":"CAM","tier":"silver","rating":76,"pace":78,"shoot":70,"pass":82,"defend":64,"keeper":22,"portrait":8}'::jsonb),
('zf-070','{"id":"zf-070","name":"Teo Melnik","position":"LW","tier":"silver","rating":73,"pace":78,"shoot":67,"pass":70,"defend":61,"keeper":22,"portrait":9}'::jsonb),
('zf-071','{"id":"zf-071","name":"Aron Astori","position":"ST","tier":"silver","rating":70,"pace":63,"shoot":77,"pass":67,"defend":58,"keeper":22,"portrait":10}'::jsonb),
('zf-072','{"id":"zf-072","name":"Bruno Renvald","position":"RW","tier":"silver","rating":77,"pace":73,"shoot":71,"pass":74,"defend":65,"keeper":22,"portrait":11}'::jsonb),
('zf-073','{"id":"zf-073","name":"Luca Sorell","position":"GK","tier":"silver","rating":74,"pace":73,"shoot":68,"pass":71,"defend":62,"keeper":74,"portrait":12}'::jsonb),
('zf-074','{"id":"zf-074","name":"Emil Vossan","position":"LB","tier":"silver","rating":71,"pace":73,"shoot":65,"pass":68,"defend":78,"keeper":22,"portrait":13}'::jsonb),
('zf-075','{"id":"zf-075","name":"Noel Arden","position":"CB","tier":"silver","rating":78,"pace":83,"shoot":72,"pass":75,"defend":85,"keeper":22,"portrait":14}'::jsonb),
('zf-076','{"id":"zf-076","name":"Kamil Kovaro","position":"RB","tier":"silver","rating":75,"pace":68,"shoot":69,"pass":72,"defend":82,"keeper":22,"portrait":15}'::jsonb),
('zf-077','{"id":"zf-077","name":"Marek Veldan","position":"CM","tier":"silver","rating":72,"pace":68,"shoot":66,"pass":78,"defend":60,"keeper":22,"portrait":16}'::jsonb),
('zf-078','{"id":"zf-078","name":"Soren Morello","position":"CAM","tier":"silver","rating":79,"pace":78,"shoot":73,"pass":85,"defend":67,"keeper":22,"portrait":17}'::jsonb),
('zf-079','{"id":"zf-079","name":"Enzo Rovik","position":"LW","tier":"silver","rating":76,"pace":78,"shoot":70,"pass":73,"defend":64,"keeper":22,"portrait":18}'::jsonb),
('zf-080','{"id":"zf-080","name":"Tomas Santoski","position":"ST","tier":"silver","rating":73,"pace":78,"shoot":80,"pass":70,"defend":61,"keeper":22,"portrait":19}'::jsonb),
('zf-081','{"id":"zf-081","name":"Alex Kordel","position":"RW","tier":"silver","rating":70,"pace":63,"shoot":64,"pass":67,"defend":58,"keeper":22,"portrait":20}'::jsonb),
('zf-082','{"id":"zf-082","name":"Hugo Navaro","position":"GK","tier":"silver","rating":77,"pace":73,"shoot":71,"pass":74,"defend":65,"keeper":77,"portrait":21}'::jsonb),
('zf-083','{"id":"zf-083","name":"Rio Silven","position":"LB","tier":"silver","rating":74,"pace":73,"shoot":68,"pass":71,"defend":81,"keeper":22,"portrait":22}'::jsonb),
('zf-084','{"id":"zf-084","name":"Jan Torvik","position":"CB","tier":"silver","rating":71,"pace":73,"shoot":65,"pass":68,"defend":78,"keeper":22,"portrait":23}'::jsonb),
('zf-085','{"id":"zf-085","name":"Erik Valenti","position":"RB","tier":"silver","rating":78,"pace":83,"shoot":72,"pass":75,"defend":85,"keeper":22,"portrait":24}'::jsonb),
('zf-086','{"id":"zf-086","name":"Felix Zarecki","position":"CM","tier":"silver","rating":75,"pace":68,"shoot":69,"pass":81,"defend":63,"keeper":22,"portrait":25}'::jsonb),
('zf-087','{"id":"zf-087","name":"Alan Lindaro","position":"CAM","tier":"silver","rating":72,"pace":68,"shoot":66,"pass":78,"defend":60,"keeper":22,"portrait":26}'::jsonb),
('zf-088','{"id":"zf-088","name":"Igor Bergan","position":"LW","tier":"silver","rating":79,"pace":78,"shoot":73,"pass":76,"defend":67,"keeper":22,"portrait":27}'::jsonb),
('zf-089','{"id":"zf-089","name":"Lian Castelo","position":"ST","tier":"silver","rating":76,"pace":78,"shoot":83,"pass":73,"defend":64,"keeper":22,"portrait":28}'::jsonb),
('zf-090','{"id":"zf-090","name":"Victor Norlund","position":"RW","tier":"silver","rating":73,"pace":78,"shoot":67,"pass":70,"defend":61,"keeper":22,"portrait":29}'::jsonb),
('zf-091','{"id":"zf-091","name":"Milan Bravik","position":"GK","tier":"gold","rating":86,"pace":79,"shoot":80,"pass":83,"defend":74,"keeper":86,"portrait":0}'::jsonb),
('zf-092','{"id":"zf-092","name":"Adrian Caldor","position":"LB","tier":"gold","rating":85,"pace":81,"shoot":79,"pass":82,"defend":92,"keeper":22,"portrait":1}'::jsonb),
('zf-093','{"id":"zf-093","name":"Niko Melnik","position":"CB","tier":"gold","rating":84,"pace":83,"shoot":78,"pass":81,"defend":91,"keeper":22,"portrait":2}'::jsonb),
('zf-094','{"id":"zf-094","name":"Leon Astori","position":"RB","tier":"gold","rating":83,"pace":85,"shoot":77,"pass":80,"defend":90,"keeper":22,"portrait":3}'::jsonb),
('zf-095','{"id":"zf-095","name":"Oskar Renvald","position":"CM","tier":"gold","rating":82,"pace":87,"shoot":76,"pass":88,"defend":70,"keeper":22,"portrait":4}'::jsonb),
('zf-096','{"id":"zf-096","name":"Ruben Sorell","position":"CAM","tier":"gold","rating":81,"pace":74,"shoot":75,"pass":87,"defend":69,"keeper":22,"portrait":5}'::jsonb),
('zf-097','{"id":"zf-097","name":"Ivo Vossan","position":"LW","tier":"gold","rating":80,"pace":76,"shoot":74,"pass":77,"defend":68,"keeper":22,"portrait":6}'::jsonb),
('zf-098','{"id":"zf-098","name":"Dario Arden","position":"ST","tier":"gold","rating":87,"pace":86,"shoot":94,"pass":84,"defend":75,"keeper":22,"portrait":7}'::jsonb),
('zf-099','{"id":"zf-099","name":"Elias Kovaro","position":"RW","tier":"gold","rating":86,"pace":88,"shoot":80,"pass":83,"defend":74,"keeper":22,"portrait":8}'::jsonb),
('zf-100','{"id":"zf-100","name":"Teo Veldan","position":"GK","tier":"gold","rating":85,"pace":90,"shoot":79,"pass":82,"defend":73,"keeper":85,"portrait":9}'::jsonb),
('zf-101','{"id":"zf-101","name":"Aron Morello","position":"LB","tier":"gold","rating":84,"pace":77,"shoot":78,"pass":81,"defend":91,"keeper":22,"portrait":10}'::jsonb),
('zf-102','{"id":"zf-102","name":"Bruno Rovik","position":"CB","tier":"gold","rating":83,"pace":79,"shoot":77,"pass":80,"defend":90,"keeper":22,"portrait":11}'::jsonb),
('zf-103','{"id":"zf-103","name":"Luca Santoski","position":"RB","tier":"gold","rating":82,"pace":81,"shoot":76,"pass":79,"defend":89,"keeper":22,"portrait":12}'::jsonb),
('zf-104','{"id":"zf-104","name":"Emil Kordel","position":"CM","tier":"gold","rating":81,"pace":83,"shoot":75,"pass":87,"defend":69,"keeper":22,"portrait":13}'::jsonb),
('zf-105','{"id":"zf-105","name":"Noel Navaro","position":"CAM","tier":"gold","rating":80,"pace":85,"shoot":74,"pass":86,"defend":68,"keeper":22,"portrait":14}'::jsonb),
('zf-106','{"id":"zf-106","name":"Kamil Silven","position":"LW","tier":"gold","rating":87,"pace":80,"shoot":81,"pass":84,"defend":75,"keeper":22,"portrait":15}'::jsonb),
('zf-107','{"id":"zf-107","name":"Marek Torvik","position":"ST","tier":"gold","rating":86,"pace":82,"shoot":93,"pass":83,"defend":74,"keeper":22,"portrait":16}'::jsonb),
('zf-108','{"id":"zf-108","name":"Soren Valenti","position":"RW","tier":"gold","rating":85,"pace":84,"shoot":79,"pass":82,"defend":73,"keeper":22,"portrait":17}'::jsonb),
('zf-109','{"id":"zf-109","name":"Enzo Zarecki","position":"GK","tier":"gold","rating":84,"pace":86,"shoot":78,"pass":81,"defend":72,"keeper":84,"portrait":18}'::jsonb),
('zf-110','{"id":"zf-110","name":"Tomas Lindaro","position":"LB","tier":"gold","rating":83,"pace":88,"shoot":77,"pass":80,"defend":90,"keeper":22,"portrait":19}'::jsonb),
('zf-111','{"id":"zf-111","name":"Alex Bergan","position":"CB","tier":"gold","rating":82,"pace":75,"shoot":76,"pass":79,"defend":89,"keeper":22,"portrait":20}'::jsonb),
('zf-112','{"id":"zf-112","name":"Hugo Castelo","position":"RB","tier":"gold","rating":81,"pace":77,"shoot":75,"pass":78,"defend":88,"keeper":22,"portrait":21}'::jsonb),
('zf-113','{"id":"zf-113","name":"Rio Norlund","position":"CM","tier":"gold","rating":80,"pace":79,"shoot":74,"pass":86,"defend":68,"keeper":22,"portrait":22}'::jsonb),
('zf-114','{"id":"zf-114","name":"Jan Ferano","position":"CAM","tier":"gold","rating":87,"pace":89,"shoot":81,"pass":93,"defend":75,"keeper":22,"portrait":23}'::jsonb),
('zf-115','{"id":"zf-115","name":"Erik Wolenski","position":"LW","tier":"gold","rating":86,"pace":91,"shoot":80,"pass":83,"defend":74,"keeper":22,"portrait":24}'::jsonb),
('zf-116','{"id":"zf-116","name":"Felix Demaro","position":"ST","tier":"gold","rating":85,"pace":78,"shoot":92,"pass":82,"defend":73,"keeper":22,"portrait":25}'::jsonb),
('zf-117','{"id":"zf-117","name":"Alan Ostvik","position":"RW","tier":"gold","rating":84,"pace":80,"shoot":78,"pass":81,"defend":72,"keeper":22,"portrait":26}'::jsonb),
('zf-118','{"id":"zf-118","name":"Igor Lazaro","position":"GK","tier":"gold","rating":83,"pace":82,"shoot":77,"pass":80,"defend":71,"keeper":83,"portrait":27}'::jsonb),
('zf-119','{"id":"zf-119","name":"Lian Karven","position":"LB","tier":"gold","rating":82,"pace":84,"shoot":76,"pass":79,"defend":89,"keeper":22,"portrait":28}'::jsonb),
('zf-120','{"id":"zf-120","name":"Victor Solano","position":"CB","tier":"gold","rating":81,"pace":86,"shoot":75,"pass":78,"defend":88,"keeper":22,"portrait":29}'::jsonb),
('zf-121','{"id":"zf-121","name":"Milan Arden","position":"RB","tier":"gold","rating":80,"pace":73,"shoot":74,"pass":77,"defend":87,"keeper":22,"portrait":0}'::jsonb),
('zf-122','{"id":"zf-122","name":"Adrian Kovaro","position":"CM","tier":"gold","rating":87,"pace":83,"shoot":81,"pass":93,"defend":75,"keeper":22,"portrait":1}'::jsonb),
('zf-123','{"id":"zf-123","name":"Niko Veldan","position":"CAM","tier":"gold","rating":86,"pace":85,"shoot":80,"pass":92,"defend":74,"keeper":22,"portrait":2}'::jsonb),
('zf-124','{"id":"zf-124","name":"Leon Morello","position":"LW","tier":"gold","rating":85,"pace":87,"shoot":79,"pass":82,"defend":73,"keeper":22,"portrait":3}'::jsonb),
('zf-125','{"id":"zf-125","name":"Oskar Rovik","position":"ST","tier":"gold","rating":84,"pace":89,"shoot":91,"pass":81,"defend":72,"keeper":22,"portrait":4}'::jsonb),
('zf-126','{"id":"zf-126","name":"Ruben Santoski","position":"RW","tier":"gold","rating":83,"pace":76,"shoot":77,"pass":80,"defend":71,"keeper":22,"portrait":5}'::jsonb),
('zf-127','{"id":"zf-127","name":"Ivo Kordel","position":"GK","tier":"gold","rating":82,"pace":78,"shoot":76,"pass":79,"defend":70,"keeper":82,"portrait":6}'::jsonb),
('zf-128','{"id":"zf-128","name":"Dario Navaro","position":"LB","tier":"gold","rating":81,"pace":80,"shoot":75,"pass":78,"defend":88,"keeper":22,"portrait":7}'::jsonb),
('zf-129','{"id":"zf-129","name":"Elias Silven","position":"CB","tier":"gold","rating":80,"pace":82,"shoot":74,"pass":77,"defend":87,"keeper":22,"portrait":8}'::jsonb),
('zf-130','{"id":"zf-130","name":"Teo Torvik","position":"RB","tier":"gold","rating":87,"pace":92,"shoot":81,"pass":84,"defend":94,"keeper":22,"portrait":9}'::jsonb),
('zf-131','{"id":"zf-131","name":"Aron Valenti","position":"CM","tier":"gold","rating":86,"pace":79,"shoot":80,"pass":92,"defend":74,"keeper":22,"portrait":10}'::jsonb),
('zf-132','{"id":"zf-132","name":"Bruno Zarecki","position":"CAM","tier":"gold","rating":85,"pace":81,"shoot":79,"pass":91,"defend":73,"keeper":22,"portrait":11}'::jsonb),
('zf-133','{"id":"zf-133","name":"Luca Lindaro","position":"LW","tier":"gold","rating":84,"pace":83,"shoot":78,"pass":81,"defend":72,"keeper":22,"portrait":12}'::jsonb),
('zf-134','{"id":"zf-134","name":"Emil Bergan","position":"ST","tier":"gold","rating":83,"pace":85,"shoot":90,"pass":80,"defend":71,"keeper":22,"portrait":13}'::jsonb),
('zf-135','{"id":"zf-135","name":"Noel Castelo","position":"RW","tier":"gold","rating":82,"pace":87,"shoot":76,"pass":79,"defend":70,"keeper":22,"portrait":14}'::jsonb),
('zf-136','{"id":"zf-136","name":"Kamil Norlund","position":"GK","tier":"elite","rating":91,"pace":84,"shoot":85,"pass":88,"defend":79,"keeper":91,"portrait":15}'::jsonb),
('zf-137','{"id":"zf-137","name":"Marek Ferano","position":"LB","tier":"elite","rating":92,"pace":88,"shoot":86,"pass":89,"defend":96,"keeper":22,"portrait":16}'::jsonb),
('zf-138','{"id":"zf-138","name":"Soren Wolenski","position":"CB","tier":"elite","rating":93,"pace":92,"shoot":87,"pass":90,"defend":96,"keeper":22,"portrait":17}'::jsonb),
('zf-139','{"id":"zf-139","name":"Enzo Demaro","position":"RB","tier":"elite","rating":88,"pace":90,"shoot":82,"pass":85,"defend":95,"keeper":22,"portrait":18}'::jsonb),
('zf-140','{"id":"zf-140","name":"Tomas Ostvik","position":"CM","tier":"elite","rating":89,"pace":94,"shoot":83,"pass":95,"defend":77,"keeper":22,"portrait":19}'::jsonb),
('zf-141','{"id":"zf-141","name":"Alex Lazaro","position":"CAM","tier":"elite","rating":90,"pace":83,"shoot":84,"pass":96,"defend":78,"keeper":22,"portrait":20}'::jsonb),
('zf-142','{"id":"zf-142","name":"Hugo Karven","position":"LW","tier":"elite","rating":91,"pace":87,"shoot":85,"pass":88,"defend":79,"keeper":22,"portrait":21}'::jsonb),
('zf-143','{"id":"zf-143","name":"Rio Solano","position":"ST","tier":"elite","rating":92,"pace":91,"shoot":99,"pass":89,"defend":80,"keeper":22,"portrait":22}'::jsonb),
('zf-144','{"id":"zf-144","name":"Jan Bravik","position":"RW","tier":"elite","rating":93,"pace":95,"shoot":87,"pass":90,"defend":81,"keeper":22,"portrait":23}'::jsonb),
('zf-145','{"id":"zf-145","name":"Erik Caldor","position":"GK","tier":"elite","rating":88,"pace":93,"shoot":82,"pass":85,"defend":76,"keeper":88,"portrait":24}'::jsonb),
('zf-146','{"id":"zf-146","name":"Felix Melnik","position":"LB","tier":"elite","rating":89,"pace":82,"shoot":83,"pass":86,"defend":96,"keeper":22,"portrait":25}'::jsonb),
('zf-147','{"id":"zf-147","name":"Alan Astori","position":"CB","tier":"elite","rating":90,"pace":86,"shoot":84,"pass":87,"defend":96,"keeper":22,"portrait":26}'::jsonb),
('zf-148','{"id":"zf-148","name":"Igor Renvald","position":"RB","tier":"elite","rating":91,"pace":90,"shoot":85,"pass":88,"defend":96,"keeper":22,"portrait":27}'::jsonb),
('zf-149','{"id":"zf-149","name":"Lian Sorell","position":"CM","tier":"elite","rating":92,"pace":94,"shoot":86,"pass":96,"defend":80,"keeper":22,"portrait":28}'::jsonb),
('zf-150','{"id":"zf-150","name":"Victor Vossan","position":"CAM","tier":"elite","rating":93,"pace":96,"shoot":87,"pass":96,"defend":81,"keeper":22,"portrait":29}'::jsonb),
('zf-151','{"id":"zf-151","name":"Milan Navaro","position":"LW","tier":"elite","rating":88,"pace":81,"shoot":82,"pass":85,"defend":76,"keeper":22,"portrait":0}'::jsonb),
('zf-152','{"id":"zf-152","name":"Adrian Silven","position":"ST","tier":"elite","rating":89,"pace":85,"shoot":96,"pass":86,"defend":77,"keeper":22,"portrait":1}'::jsonb),
('zf-153','{"id":"zf-153","name":"Niko Torvik","position":"RW","tier":"elite","rating":90,"pace":89,"shoot":84,"pass":87,"defend":78,"keeper":22,"portrait":2}'::jsonb),
('zf-154','{"id":"zf-154","name":"Leon Valenti","position":"GK","tier":"elite","rating":91,"pace":93,"shoot":85,"pass":88,"defend":79,"keeper":91,"portrait":3}'::jsonb),
('zf-155','{"id":"zf-155","name":"Oskar Zarecki","position":"LB","tier":"elite","rating":92,"pace":96,"shoot":86,"pass":89,"defend":96,"keeper":22,"portrait":4}'::jsonb),
('zf-156','{"id":"zf-156","name":"Ruben Lindaro","position":"CB","tier":"elite","rating":93,"pace":86,"shoot":87,"pass":90,"defend":96,"keeper":22,"portrait":5}'::jsonb),
('zf-157','{"id":"zf-157","name":"Ivo Bergan","position":"RB","tier":"elite","rating":88,"pace":84,"shoot":82,"pass":85,"defend":95,"keeper":22,"portrait":6}'::jsonb),
('zf-158','{"id":"zf-158","name":"Dario Castelo","position":"CM","tier":"elite","rating":89,"pace":88,"shoot":83,"pass":95,"defend":77,"keeper":22,"portrait":7}'::jsonb),
('zf-159','{"id":"zf-159","name":"Elias Norlund","position":"CAM","tier":"elite","rating":90,"pace":92,"shoot":84,"pass":96,"defend":78,"keeper":22,"portrait":8}'::jsonb),
('zf-160','{"id":"zf-160","name":"Teo Ferano","position":"LW","tier":"elite","rating":91,"pace":96,"shoot":85,"pass":88,"defend":79,"keeper":22,"portrait":9}'::jsonb),
('zf-161','{"id":"zf-161","name":"Aron Wolenski","position":"ST","tier":"elite","rating":92,"pace":85,"shoot":99,"pass":89,"defend":80,"keeper":22,"portrait":10}'::jsonb),
('zf-162','{"id":"zf-162","name":"Bruno Demaro","position":"RW","tier":"elite","rating":93,"pace":89,"shoot":87,"pass":90,"defend":81,"keeper":22,"portrait":11}'::jsonb),
('zf-163','{"id":"zf-163","name":"Luca Ostvik","position":"GK","tier":"elite","rating":88,"pace":87,"shoot":82,"pass":85,"defend":76,"keeper":88,"portrait":12}'::jsonb),
('zf-164','{"id":"zf-164","name":"Emil Lazaro","position":"LB","tier":"elite","rating":89,"pace":91,"shoot":83,"pass":86,"defend":96,"keeper":22,"portrait":13}'::jsonb),
('zf-165','{"id":"zf-165","name":"Noel Karven","position":"CB","tier":"elite","rating":90,"pace":95,"shoot":84,"pass":87,"defend":96,"keeper":22,"portrait":14}'::jsonb),
('zf-166','{"id":"zf-166","name":"Kamil Solano","position":"RB","tier":"elite","rating":91,"pace":84,"shoot":85,"pass":88,"defend":96,"keeper":22,"portrait":15}'::jsonb),
('zf-167','{"id":"zf-167","name":"Marek Bravik","position":"CM","tier":"elite","rating":92,"pace":88,"shoot":86,"pass":96,"defend":80,"keeper":22,"portrait":16}'::jsonb),
('zf-168','{"id":"zf-168","name":"Soren Caldor","position":"CAM","tier":"elite","rating":93,"pace":92,"shoot":87,"pass":96,"defend":81,"keeper":22,"portrait":17}'::jsonb),
('zf-169','{"id":"zf-169","name":"Enzo Melnik","position":"LW","tier":"elite","rating":88,"pace":90,"shoot":82,"pass":85,"defend":76,"keeper":22,"portrait":18}'::jsonb),
('zf-170','{"id":"zf-170","name":"Tomas Astori","position":"ST","tier":"elite","rating":89,"pace":94,"shoot":96,"pass":86,"defend":77,"keeper":22,"portrait":19}'::jsonb),
('zf-171','{"id":"zf-171","name":"Alex Renvald","position":"RW","tier":"elite","rating":90,"pace":83,"shoot":84,"pass":87,"defend":78,"keeper":22,"portrait":20}'::jsonb),
('zf-172','{"id":"zf-172","name":"Hugo Sorell","position":"GK","tier":"elite","rating":91,"pace":87,"shoot":85,"pass":88,"defend":79,"keeper":91,"portrait":21}'::jsonb),
('zf-173','{"id":"zf-173","name":"Rio Vossan","position":"LB","tier":"elite","rating":92,"pace":91,"shoot":86,"pass":89,"defend":96,"keeper":22,"portrait":22}'::jsonb),
('zf-174','{"id":"zf-174","name":"Jan Arden","position":"CB","tier":"elite","rating":93,"pace":95,"shoot":87,"pass":90,"defend":96,"keeper":22,"portrait":23}'::jsonb),
('zf-175','{"id":"zf-175","name":"Erik Kovaro","position":"RB","tier":"elite","rating":88,"pace":93,"shoot":82,"pass":85,"defend":95,"keeper":22,"portrait":24}'::jsonb),
('zf-176','{"id":"zf-176","name":"Felix Veldan","position":"CM","tier":"elite","rating":89,"pace":82,"shoot":83,"pass":95,"defend":77,"keeper":22,"portrait":25}'::jsonb),
('zf-177','{"id":"zf-177","name":"Alan Morello","position":"CAM","tier":"elite","rating":90,"pace":86,"shoot":84,"pass":96,"defend":78,"keeper":22,"portrait":26}'::jsonb),
('zf-178','{"id":"zf-178","name":"Igor Rovik","position":"LW","tier":"elite","rating":91,"pace":90,"shoot":85,"pass":88,"defend":79,"keeper":22,"portrait":27}'::jsonb),
('zf-179','{"id":"zf-179","name":"Lian Santoski","position":"ST","tier":"elite","rating":92,"pace":94,"shoot":99,"pass":89,"defend":80,"keeper":22,"portrait":28}'::jsonb),
('zf-180','{"id":"zf-180","name":"Victor Kordel","position":"RW","tier":"elite","rating":93,"pace":96,"shoot":87,"pass":90,"defend":81,"keeper":22,"portrait":29}'::jsonb)
on conflict(id) do update set data=excluded.data;

create or replace function zone_football_private.public_club(target uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('user_id',c.user_id,'name',c.name,'formation',c.formation,'roster',coalesce((select jsonb_agg(p.data||jsonb_build_object('cardId',x.value#>>'{}') order by x.ordinality) from jsonb_array_elements(c.squad) with ordinality x join lateral(select a.value from jsonb_array_elements(c.cards) a where a.value->>'id'=x.value#>>'{}')a on true join zone_football_private.players p on p.id=a.value->>'player_id'),'[]')) from zone_football_private.clubs c where c.user_id=target
$$;
revoke all on function zone_football_private.public_club(uuid) from public,anon,authenticated;
create or replace function zone_football_private.command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare uid uuid:=auth.uid();club zone_football_private.clubs;room zone_football_private.rooms;cards jsonb:='[]';squad jsonb:='[]';pulled jsonb:='[]';card jsonb;pid text;nonce uuid;pack text;price integer;roll float;tier text;oldpack zone_football_private.packs;checked record;starter text[]:=array['zf-001','zf-002','zf-003','zf-012','zf-004','zf-005','zf-014','zf-006','zf-007','zf-008','zf-009','zf-010','zf-021','zf-011','zf-023','zf-015','zf-017','zf-018'];
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if args is null or jsonb_typeof(args)<>'object' or octet_length(args::text)>20000 then raise exception 'FOOTBALL_INPUT';end if;
 if not exists(select 1 from public.zh_library where user_id=uid and game_id='zone-football') then raise exception 'FOOTBALL_OWNERSHIP' using errcode='42501';end if;
 perform zone_wallet_private.lock();perform zone_wallet_private.ensure(uid);
 select * into club from zone_football_private.clubs where user_id=uid for update;
 if club.user_id is null then
  foreach pid in array starter loop card:=jsonb_build_object('id',gen_random_uuid(),'player_id',pid);cards:=cards||jsonb_build_array(card);squad:=squad||jsonb_build_array(card->'id');end loop;
  insert into zone_football_private.clubs(user_id,cards,squad) values(uid,cards,squad) returning * into club;
 end if;
 if action='state' then null;
 elsif action='squad' then
  squad:=args->'squad';
  if coalesce(args->>'formation','') not in ('4-3-3','4-4-2','3-5-2') or jsonb_typeof(squad) is distinct from 'array' or jsonb_array_length(squad)<>18 then raise exception 'FOOTBALL_SQUAD';end if;
  if (select count(distinct x.value#>>'{}') from jsonb_array_elements(squad)x)<>18 then raise exception 'FOOTBALL_SQUAD';end if;
  if (select count(distinct a.value->>'player_id') from jsonb_array_elements(squad)x join lateral(select v.value from jsonb_array_elements(club.cards)v where v.value->>'id'=x.value#>>'{}')a on true)<>18 then raise exception 'FOOTBALL_SQUAD';end if;
  for checked in select x.value,x.ordinality,p.data from jsonb_array_elements(squad) with ordinality x join lateral(select a.value from jsonb_array_elements(club.cards)a where a.value->>'id'=x.value#>>'{}')a on true join zone_football_private.players p on p.id=a.value->>'player_id' loop
   if (checked.ordinality=1 and checked.data->>'position'<>'GK') or (checked.ordinality between 2 and 11 and checked.data->>'position'='GK') then raise exception 'FOOTBALL_KEEPER';end if;
  end loop;
  if length(btrim(coalesce(args->>'name','')))<2 or length(args->>'name')>28 or args->>'name'~'[[:cntrl:]]' then raise exception 'FOOTBALL_NAME';end if;
  update zone_football_private.clubs set squad=squad,formation=args->>'formation',name=btrim(args->>'name'),revision=revision+1 where user_id=uid returning * into club;
 elsif action='buy_pack' then
  if coalesce(args->>'nonce','')!~'^[a-f0-9-]{36}$' then raise exception 'FOOTBALL_NONCE';end if;nonce:=(args->>'nonce')::uuid;pack:=args->>'pack';
  select * into oldpack from zone_football_private.packs p where p.user_id=uid and p.nonce=nonce;
  if oldpack.user_id is not null then
   if oldpack.pack is distinct from pack then raise exception 'FOOTBALL_NONCE';end if;pulled:=oldpack.cards;
  else
   price:=case pack when 'bronze' then 75 when 'silver' then 200 when 'gold' then 500 else null end;
   if price is null or jsonb_array_length(club.cards)>4997 then raise exception 'FOOTBALL_PACK';end if;
   perform zone_wallet_private.change(uid,-price::bigint,'football_pack',nonce::text,'zone-football');
   for i in 1..3 loop
    roll:=random()*100;tier:=case when pack='bronze' then case when roll<85 then 'bronze' when roll<99 then 'silver' else 'gold' end when pack='silver' then case when roll<85 then 'silver' when roll<99 then 'gold' else 'elite' end else case when roll<94 then 'gold' else 'elite' end end;
    select p.id into pid from zone_football_private.players p where p.data->>'tier'=tier order by random() limit 1;
    card:=jsonb_build_object('id',gen_random_uuid(),'player_id',pid);pulled:=pulled||jsonb_build_array(card);
   end loop;
   insert into zone_football_private.packs(user_id,nonce,pack,cards) values(uid,nonce,pack,pulled);
   update zone_football_private.clubs set cards=club.cards||pulled,revision=revision+1 where user_id=uid returning * into club;
   update public.saves set json=zone_wallet_private.project(json,uid),updated_at=now() where user_id=uid;
  end if;
 elsif action='progress' then
  if jsonb_typeof(args->'progress') is distinct from 'object' or octet_length((args->'progress')::text)>12000 then raise exception 'FOOTBALL_PROGRESS';end if;
  -- Personal, unranked history only. Results never mint currency or cards.
  update zone_football_private.clubs set progress=args->'progress',revision=revision+1 where user_id=uid returning * into club;
 elsif action='room_create' then
  delete from zone_football_private.rooms where expires_at<now() or host_id=uid;
  insert into zone_football_private.rooms(code,host_id) values(upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),uid) returning * into room;
 elsif action='room_join' then
  select * into room from zone_football_private.rooms where code=upper(args->>'code') and expires_at>now() for update;
  if room.id is null or room.host_id=uid or (room.guest_id is not null and room.guest_id<>uid) then raise exception 'FOOTBALL_ROOM';end if;
  update zone_football_private.rooms set guest_id=uid where id=room.id returning * into room;
 elsif action in ('room_state','room_leave') then
  select * into room from zone_football_private.rooms where id=(args->>'id')::uuid and expires_at>now() and uid in(host_id,guest_id) for update;
  if room.id is null then raise exception 'FOOTBALL_ROOM';end if;
  if action='room_leave' then
   if room.host_id=uid then delete from zone_football_private.rooms where id=room.id;else update zone_football_private.rooms set guest_id=null where id=room.id;end if;
   return jsonb_build_object('left',true);
  end if;
 else raise exception 'FOOTBALL_ACTION';end if;
 if room.id is not null then return jsonb_build_object('id',room.id,'code',room.code,'topic',room.topic,'host_id',room.host_id,'guest_id',room.guest_id,'host',zone_football_private.public_club(room.host_id),'guest',zone_football_private.public_club(room.guest_id));end if;
 return jsonb_build_object('club',to_jsonb(club)-'user_id','wallet',zone_wallet_private.view(uid),'pulled',pulled);
end $$;
revoke all on function zone_football_private.command(text,jsonb) from public,anon;
grant execute on function zone_football_private.command(text,jsonb) to authenticated;
create or replace function public.zone_football(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_football_private.command(action,args) $$;
revoke all on function public.zone_football(text,jsonb) from public,anon;
grant execute on function public.zone_football(text,jsonb) to authenticated;

-- Keep Haunt economy and wallet routing intact; add only the Football purchase.
create or replace function zone_hub_private.football_hub_command(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();doc jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'HUB_LOGIN' using errcode='42501';end if;
 if jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>262144 then raise exception 'HUB_INPUT';end if;
 if action='add_game' and args->>'game_id'='zone-football' then
  perform zone_wallet_private.lock();if exists(select 1 from public.zh_library where user_id=uid and game_id='zone-football') then return '{}';end if;
  if not exists(select 1 from public.zh_games where id='zone-football' and published and price_zc=50) then raise exception 'HUB_GAME';end if;
  if args->>'purchasePrice' is distinct from '50' then raise exception 'HUB_PURCHASE_CONFIRM';end if;
  perform zone_wallet_private.ensure(uid);perform zone_wallet_private.change(uid,-50,'game_purchase','zone-football','zone-football');insert into public.zh_library(user_id,game_id) values(uid,'zone-football');
  select json into doc from public.saves where user_id=uid for update;update public.saves set json=zone_wallet_private.project(doc,uid),updated_at=now() where user_id=uid;return '{}';
 end if;
 return zone_hub_private.haunt_economy_command(action,args);
end $$;
revoke all on function zone_hub_private.football_hub_command(text,jsonb) from public,anon;
grant execute on function zone_hub_private.football_hub_command(text,jsonb) to authenticated;
create or replace function public.zone_hub(action text,args jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select zone_hub_private.football_hub_command(action,args) $$;
