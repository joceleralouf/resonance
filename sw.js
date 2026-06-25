/* ============================================================
   Résonance — Service Worker
   Le CACHE ci-dessous est la version. Pour "bumper" : change
   le numéro (v21 -> v22) à CHAQUE fois que tu modifies un fichier.
   ============================================================ */
const CACHE = "resonance-v22";h

/* Fichiers mis en cache à l'installation (chemins relatifs au dossier). */
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

/* Installation : on précharge le coeur, puis on s'active sans attendre. */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

/* Activation : on supprime les anciens caches et on prend la main tout de suite. */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Récupération des requêtes.
   - Navigation (ouverture de la page) : réseau d'abord, pour voir les maj
     immédiatement quand il y a du réseau. Repli sur le cache hors ligne.
   - Autres fichiers : cache d'abord, et on rafraîchit le cache en arrière-plan. */
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const isNav = req.mode === "navigate" || (req.destination === "document");

  if (isNav) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
