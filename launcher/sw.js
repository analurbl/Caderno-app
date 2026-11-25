// Service worker mínimo: torna o atalho instalável no Chrome. Não guarda nada em cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
