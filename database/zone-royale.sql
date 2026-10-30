-- The beta shares its account and owned cosmetics with Strike Zone. Its cloud
-- library entry and platform playtime are independent of the original game.
insert into public.zh_games(id,title,description_pl,description_en,tags,free,published)
values('zone-royale','Zone Royale',
 'Battle Royale 2.5D: Frontier Island z sześcioma miejscówkami, solo/duo/trio/squad, boty, osobne malowania, kilofy i karnet.',
 'A 2.5D Battle Royale: Frontier Island with six locations, solo/duo/trio/squad, bots, dedicated wraps, pickaxes and a season pass.',
 array['Battle Royale','2.5D','Multiplayer','Beta'],true,true)
on conflict(id) do update set title=excluded.title,description_pl=excluded.description_pl,description_en=excluded.description_en,tags=excluded.tags,free=excluded.free,published=excluded.published;
