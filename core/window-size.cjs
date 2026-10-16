'use strict';
function launcherBounds(area) {
  const width = Math.min(1020, Math.max(360, Math.floor(area.width * .88)));
  const height = Math.min(680, Math.max(420, Math.floor(area.height * .88)));
  return { width, height, minWidth: Math.min(680, width), minHeight: Math.min(480, height),
    x: area.x + Math.round((area.width - width) / 2), y: area.y + Math.round((area.height - height) / 2) };
}
module.exports = { launcherBounds };
