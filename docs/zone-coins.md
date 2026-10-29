# Zone Coins — account wallet

Zone Hub 0.1.13, managed Strike 1.5.10-zonehub.6, Royale 0.1.8 and Haunt 0.1.4 use one account-wide virtual currency: Zone Coins (ZC). Inventories remain game-specific. Strike round buy money and seasonal Halloween candy are separate gameplay/event mechanics.

## Migration and rewards

Apply `database/zone-wallet.sql` after the Hub account/style, Haunt, market stock and game-save schemas. Optional existing bonus and Community Forge functions are adapted when present. Migration source checks fail explicitly if their expected purchase statements have changed. Reapply this migration after recreating those legacy functions. The migration is repeatable.

Accounts migrate lazily when a wallet-aware Hub sends `walletProtocol: 1`, or when a new game opens `zone_wallet`. Sum persisted Strike and Royale wallet fields across saved profiles plus historical Haunt payouts tagged ZC once, at 1:1. An account primary key and one migration receipt prevent a second import. The saved wallet fields become compatibility projections of the central balance; they must never be summed again. Previously owned cosmetics remain owned. Old clients without wallet support continue normally until that account migrates, then must update before changing its balance.

The existing server-timed Hub play session grants 30 ZC per complete minute. One active session is allowed per account; elapsed increments are capped at 90 seconds per heartbeat. Closed/repeated ticks add nothing. Keep fractional minutes across games. Existing gameplay rewards, money bonus codes, legacy ZC Haunt results and sales also contribute to the same wallet. There are no real-money deposits, withdrawal features or public arbitrary credit RPCs.

## Transactions and synchronization

Wallet accounts, ledger entries and game save sessions live in a private schema with RLS and no client table access. RPCs bind identity to Auth. Market settlement, cosmetic purchases, bonus redemption, Community Forge cases and Haunt results update the wallet and their receipts/inventories within one transaction. An offline seller is credited to their central account if migrated; otherwise the legacy balance is imported later. Client-supplied absolute balances do not determine wallet balance.

Strike/Royale game saves use a user/game-bound UUID session, monotonically increasing sequence and cumulative signed total. The server applies only the difference from the last accepted total. Old and repeated packets cannot pay twice; concurrent game sessions add their differences without overwriting each other's wallet. Replies include the accepted cursor; the renderer retains local changes made while a request was in flight and ignores older revisions. Inventory epoch conflicts reload authoritative inventory and discard the uncommitted local economy change before retrying. Insufficient funds cannot make the wallet negative. Login loads authoritative cloud inventory instead of replaying a newer local cache with an uncommitted debit.

The existing Strike/Royale simulation remains client/peer authoritative. This protocol prevents lost wallet updates and retry duplication; it does not make arbitrary client-generated gameplay earnings cheat-proof. Dedicated authoritative gameplay validation remains a separate project. Haunt's existing once-per-roster result validation and payout cap are retained.

Wallet writers take advisory transaction lock `28003420` before existing save/market locks, including the bot market cron. This deliberately serializes short economic transactions in the beta; match snapshots do not take it. Track contention as usage grows. All private functions pin their search path. `zone_wallet` exposes only open/state to registered users; the history endpoint returns the caller's last 40 entries.

## UI and checks

The Hub header and Wallet page show the same balance as the style shop, both market games and each game menu. The game text adapter changes permanent wallet prices to ZC while leaving round HUD money intact. Twelve avatar frames include six new designs and the revised Pumpkin Guardian. Existing six paid bundles keep their server prices, now denominated in ZC.

`tests/zone-wallet.test.cjs` exercises import, shared purchases, market escrow, offline payouts, time rewards, Haunt rewards, codes, Community Forge, retries, foreign sessions, and actual renderer adapter reconciliation against PostgreSQL. Native handoffs with `--wallet` use the same SQL fixture for Strike, Royale and Haunt. The Hub UI check includes purchases, two-client market settlement, the new wallet view, PL/EN and three window sizes. Existing Windows release gates retain install verification, content-only updates and platform self-update preservation.

Zone Haunt costs 500 ZC for a new library license, with explicit price confirmation. Existing owners keep access. Before each contract, players buy finite equipment with separate Research Points at server prices and choose their contribution. Each owner receives 1K RP once; new contract identification/evidence/bonus rewards pay RP only. A whole-crew wipe consumes the deployed gear; reserves remain. A surviving team recovers its loadout. RP gear purchases and result settlement are idempotent. ZC equipment orders from the preceding version are refunded once and retained items stay owned. Apply `database/haunt-research.sql` after the existing wallet and progression scripts; do not reapply an earlier router/trigger migration afterward without reapplying the research add-on. The Hub wallet, market and store amounts use compact K/M/B/T presentation.
