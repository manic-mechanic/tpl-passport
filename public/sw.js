// No fetch handler on purpose. With one, even an empty one, every page load
// has to wait for the browser to start this worker before it can go to the
// network, and Safari (macOS and iOS) can hold a load for a long time when the
// worker was shut down in the background. iOS never needed a fetch handler to
// install the app, and current Chrome doesn't either (check Android's install
// prompt still appears, #62).

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
