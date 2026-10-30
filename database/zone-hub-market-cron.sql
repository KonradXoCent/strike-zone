-- Runs without a signed-in client; the function is not executable by players.
create extension if not exists pg_cron;
select cron.schedule('zone-hub-market-bots','* * * * *','select zone_hub_private.market_bot_tick()');
