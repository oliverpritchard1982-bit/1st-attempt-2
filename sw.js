const CACHE_NAME = 'nina-adventure-v1';
const CORE = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  './assets/bg_lobby.png',
  './assets/bg_foyer.png',
  './assets/bg_library.png',
  './assets/bg_dining.png',
  './assets/bg_utility.png',
  './assets/bg_attic.png',
  './assets/spr_nina.png',
  './assets/spr_cas.png',
  './assets/spr_curator.png',
  './assets/ico_look.png',
  './assets/ico_use.png',
  './assets/ico_talk.png',
  './assets/ico_notebook.png',
  './assets/ico_hint.png',
  './assets/ico_menu.png',
  './assets/ico_objective.png',
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k===CACHE_NAME)?null:caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then(cached => cached || fetch(evt.request))
  );
});
