# Editor view and gameplay mouse

`shared/skin-view.js` changes only the editor's view transform. The existing
renderer and brush inverse both call `creatorSkinTransform()`, so painting,
brush widths, clipped weapon outlines, undo and exported skin coordinates use
the same model space at 50–400% zoom. Wheel zoom preserves the point under the
pointer. Buttons and canvas keys `+`, `-`, `0` zoom/reset. Middle drag, Space +
drag or the Pan button move the view without adding strokes. Wheel events while
a stroke is active are ignored. A WeakMap isolates view state by creator account;
zoom/pan are never exported, submitted, traded or stored in a skin payload.

`shared/game-input.js` uses standard Pointer Lock in the existing game canvas.
A canvas click, intro-skip click or resume click supplies the required browser
gesture. The first capture click does not fire or throw a grenade. There are no
automatic retry loops. Unsupported/denied capture leaves free-pointer aiming
available, hides the OS cursor over gameplay and offers a user-driven retry.
Promise and legacy undefined-return APIs are supported. Browser lock-request
rate limits are respected; capture is never forced after Escape.

Locked mouse deltas are converted from the displayed canvas rectangle to the
existing `VW × 640` view coordinates and clamped to that view. Aim angles,
grenade range, camera zoom, the selected crosshair and network aim all keep using
the existing virtual mouse coordinates. Resizing updates the scale and cached
rectangle. Gameplay's old absolute-mouse listener ignores locked events. No
work is added to the render loop.

Pause, shop, tactical BR map, dialogs, result overlays, quitting, window blur and
document hiding release capture. Unexpected unlock pauses a running local view;
Escape cannot immediately toggle that pause back off. Release clears held keys
and mouse buttons and sends a neutral input frame for multiplayer clients.
Typing in forms cannot reach the window gameplay handlers. A late successful
lock after a menu opens is immediately released. The persistent PL/EN setting
defaults to enabled and is available in both main and pause settings.

Run `npm test`, `npm run check:ui` and `npm run test:controls`. The latter uses
real native Electron pointer lock, trusted input and actual editor painting;
only relative-motion edge cases are dispatched with explicit deltas. It checks
Escape/resume, shop, modal typing, focus loss, match end, denial fallback, legacy
API return values, preferences and small editor viewports. Native acquisitions
are paced to respect Chromium's short-window request limit. Run GUI smoke tests
sequentially so other Electron windows cannot take focus during capture.

The standalone preview retains its separate test-account login; the public
desktop build continues to receive the launcher session.
