"use strict";

// Retire the old Avengers worker without reading or deleting any site's cache.
// index.html removes this registration only after the shared ../sw.js is active.
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});
