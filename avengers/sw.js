"use strict";

// Tombstone for devices that installed the former /avengers/ child scope.
// The page migrates them to ../sw.js; this worker never owns caches or fetches.
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

// Do not self-unregister here: the page removes this legacy registration only
// after ../sw.js is active, which avoids an offline gap if root install fails.
