-- The beta shares its account and owned cosmetics with Strike Zone. Its cloud
-- library entry and platform playtime are independent of the original game.
insert into public.zh_games(id,title,description_pl,description_en,tags,free,published)
values('zone-royale','Zone Royale',
 'Battle Royale 2.5D: trzy wyspy, solo, duo, trio i squad, dobieranie drużyn, boty, osobna szafka oraz karnet Pierwsza fala.',
 'A 2.5D Battle Royale: three islands, solo, duo, trio and squad, team matchmaking, bots, a dedicated locker and the First Wave pass.',
 array['Battle Royale','2.5D','Multiplayer','Beta'],true,true)
on conflict(id) do update set title=excluded.title,description_pl=excluded.description_pl,description_en=excluded.description_en,tags=excluded.tags,free=excluded.free,published=excluded.published;
