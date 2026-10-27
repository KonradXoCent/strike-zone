-- The beta shares its account and owned cosmetics with Strike Zone. Its cloud
-- library entry and platform playtime are independent of the original game.
insert into public.zh_games(id,title,description_pl,description_en,tags,free,published)
values('zone-royale','Zone Royale',
 'Testowe Battle Royale 2.5D: trzy wyspy, lot samolotem, spadochrony, łupy, burza i boty. Wspólne mecze przez lobby oraz kosmetyki z konta Strike Zone.',
 'A 2.5D Battle Royale beta: three islands, plane drops, parachutes, loot, a storm and bots. Shared lobby matches and cosmetics from your Strike Zone account.',
 array['Battle Royale','2.5D','Multiplayer','Beta'],true,true)
on conflict(id) do update set title=excluded.title,description_pl=excluded.description_pl,description_en=excluded.description_en,tags=excluded.tags,free=excluded.free,published=excluded.published;
