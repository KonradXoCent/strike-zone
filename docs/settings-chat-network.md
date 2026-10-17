# Settings, chat and multiplayer — 1.4.0

The launcher gear opens shared PL/EN language preferences and Night, Forest and Sand themes. Language changes propagate to an already running game through the desktop bridge. Preferences live in the existing application profile and survive updates. The game also exposes the language choice in Settings. `shared/locale-data.js` is the bilingual catalog; `scripts/embed-shared.cjs` embeds the shared UI into the single HTML browser source.

Click a friend or the Messages button to start a direct conversation. Groups support up to 16 members, owner-managed invitations, removal and renaming. Leaving transfers ownership to a remaining member. Conversations, unread positions and messages are stored in Supabase, including when recipients are offline. Notifications appear as unread badges and in-app toasts. The desktop launcher and game share one controller; only a focused, visible conversation acknowledges messages. The public game continues to authenticate through the launcher; the HTML test preview retains its own test sign-in.

`database/social.sql` and the generated migration define three RLS-enabled tables and the authenticated `sz_chat` RPC. Clients cannot insert, update or delete chat rows directly. Every operation checks membership; new conversations require a friend. Messages have idempotent retry nonces, a 2000-character limit and a 30-per-minute sender limit. Group creation is limited to 10 per 24 hours. History is paginated with textual int8 sequence IDs. Postgres Changes triggers refreshes, with polling after disconnects and membership changes. HTML in chat is displayed as text, never interpreted.

Ancient's Cave/B partition now continues into the lower masonry. Both spawns still reach both bomb sites with player clearance; the previous gap is blocked.

Server creation awaits publication and reports failures. Joining your own listing retains the host role. A player joining a running server enters the same host simulation and match session. Lobby departure awaits channel cleanup before another connection. Network snapshots include bomb planting progress; a remote bomb carrier can no longer stop the render loop by accessing an undefined progress value. A waiting screen prevents mode rendering before the first complete snapshot.

## Checks

- `npm test`: account, saves, updates, map connectivity, workshop, chat RLS, offline unread state, group authorization, history pagination, rate limits and duplicate retries.
- `npm run check:ui`: inline script syntax, embedded module consistency and English coverage of Polish UI literals.
- `npm run test:social`: actual Electron launcher/game with an isolated PostgreSQL and account fixture; bilingual UI, shared preferences, themes, offline messages, XSS-safe display, retry after a committed-but-lost response, shared unread state, groups and account cleanup.
- `npm run test:gameplay`: authoritative movement, purchases, damage, scores, modes, maps, CTF routes and Nuke stairs.
- `npm run test:network`: two actual SDK clients over a local Phoenix fixture, both lobby-code and late server-list entry in all 14 modes.
- `SZ_LIVE_REALTIME=1 node scripts/network-smoke.cjs`: the same two-client transport check against the actual Supabase Realtime endpoint. Test identities and server-list/account operations remain isolated, so this does not modify players' accounts or saves. This verifies the actual network transport, not a test using two real production accounts.

The current deliverable is a 1.4.0 test installer. Promoting it through the stable channel remains a separate release action.
