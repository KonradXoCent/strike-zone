# Zombie Mode grenades and football safety

Humans no longer take damage or catch fire from human HE grenades and Molotovs. Grenades capture the thrower's team at throw time, so a later infection cannot turn a previously thrown grenade or lingering fire into friendly damage. Enemy damage and other modes retain their existing rules.

In Zombie Mode the Smoke slot is a **Freeze Grenade**: a single burst with a radius of 150 and a 3-second freeze. It affects living, vulnerable zombies with line of sight to the burst, extinguishes their fire and stops movement and attacks. It creates no smoke. Humans, protected respawns, zombies behind walls and targets outside the radius are unaffected. Actors return to normal when the timer expires; transformation and respawn clear the status. The host sends the remaining duration in snapshots, and client prediction and rendering use the same state. Ice highlights, a blue burst and the buy-menu label distinguish it from ordinary smoke.

Football bots approach from behind the ball and consider the likely free-ball trajectory before kicking. A kick that would enter their own goal is replaced by a forward clearance. Backpasses to human teammates remain possible when safe. Human kicking, the free ball, its 820 px/s kick and goalkeeper contacts retain their existing controls and physics. Normal physical deflections remain possible.
