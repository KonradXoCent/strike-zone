# Zone Football 0.3.0 / Zone Hub 0.1.19 preview

The Ultimate Club menu includes the squad, competitions, grouped player collection, seven packs, a player-to-player card market and a training arena. The original 5v5 game and other Zone games remain available.

Each footballer appears once in the collection, with a count of additional copies. The eighteen squad and substitute slots must contain different footballers. Selecting a starting slot filters the collection to that formation's exact position; selecting a substitute allows every position. Formations rearrange existing owned cards. Selecting a bench slot edits that slot instead of immediately swapping it into the starting eleven.

ZF is a separate Football currency. Top-ups require confirmation and exchange 100 / 500 / 1000 Zone Hub coins for 1000 / 5000 / 10000 ZF. Packs cost 750–12000 ZF. Kickoff, Rising Stars and Elite Nights retain their earlier odds; Backline, Playmakers, Goal Hunters and Starlight add position-specific and elite choices. The store displays the per-card odds. Each pack contains three fictional footballers. Existing promotional grants remain finite and free.

Quick sell returns 20 / 60 / 180 / 400 ZF for a bronze / silver / gold / elite card. Squad and substitute cards cannot be sold or listed. Listings escrow the selected card until purchased or withdrawn. Buyers pay the displayed ZF price; the seller receives the full amount. A completed purchase transfers the actual card once. Shared transaction locking and operation receipts prevent duplicate charges and double purchases. Search is paginated, while the owner's active listings remain available independently of filters. No automatic buyer or artificial market offers are added.

Goals have an automatic slow replay using recorded match frames, followed by a kickoff. The match clock stays paused. The host can skip the replay. Both clients receive the same capped recording. VAR still requires an actual ambiguous serious foul, and goal-line still applies only to close saves.

Player switching always chooses the closest eligible outfield player to the ball, including when that player is already selected. Uncontrolled defenders approach the exposed ball and can tackle for the human team. Shots and passes are slower. Training includes dribbling and shooting, fixed penalties and free kicks with a wall, an active AI goalkeeper, local attempt counters and repeat with R. Training does not submit competition results or currency rewards.

The standalone HTML is an offline demo: it has a separate persisted practice wallet, six finite test packs, local listings and all three drills. It cannot access real accounts, shared coins, other players' offers or online matches. Real purchases, transfers and clubs use the Hub session and server RPC.

Validation covers wallet conversion and rollback, idempotence, positional and duplicate squad rules, escrow and ownership, competing buyers, withdrawal, retained test packs, bot matches, AI recovery, shot speed, goal recordings, all drills, the real desktop UI, two SDK clients, and the existing Hub and game regression checks. Windows packaging and installed-update preservation run in the preview workflow.
