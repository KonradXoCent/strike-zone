-- Admin-controlled installation metadata. Existing authenticated read policy
-- and server-only writes remain unchanged. The home RPC includes new columns.
alter table public.zh_games add column if not exists package_config jsonb
 check(package_config is null or jsonb_typeof(package_config)='object');
update public.zh_games set package_config='{"protocol":1,"executable":"StrikeZone.exe","manifestName":"zonehub-game-manifest.json","releasePrefix":"v"}'::jsonb where id='strike-zone' and package_config is null;
update public.zh_games set package_config='{"protocol":1,"executable":"ZoneRoyale.exe","manifestName":"zonehub-royale-manifest.json","releasePrefix":"royale-v"}'::jsonb where id='zone-royale' and package_config is null;
