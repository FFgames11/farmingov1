const CACHE_NAME = 'farmingo-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './auth.css',
    // JS files
    './js/arena.js',
    './js/arenaData.js',
    './js/arenaScreen.js',
    './js/avatar.js',
    './js/boosts.js',
    './js/bossFight.js',
    './js/dailyQuests.js',
    './js/farmGrid.js',
    './js/gameBalance.js',
    './js/gameLoop.js',
    './js/initDefaults.js',
    './js/libraryExam.js',
    './js/petsData.js',
    './js/plantingHarvesting.js',
    './js/questionRenderer.js',
    './js/quizBank.js',
    './js/saveLoad.js',
    './js/shopInventory.js',
    './js/startGame.js',
    './js/supabase.js',
    './js/tileUnlock.js',
    './js/tools.js',
    './js/tutorial.js',
    './js/ui.js',
    './js/uiUpdate.js',
    './js/utils.js',
    './js/wildPetEntity.js',
    './js/wildPetSpawn.js',
    './js/xpLevel.js',
    './js/zoo.js',
    // Fonts
    './fonts/Bungee-Regular.ttf',
    './fonts/Bungee-Regular.woff',
    './fonts/Bungee-Regular.woff2',
    './fonts/arialroundedmtbold.ttf',
    './fonts/arialroundedmtbold.woff',
    // Key Images
    './images/zoobg.png',
    './images/townbg.png',
    './images/tofarm.png',
    './images/tofarmglow.png',
    './images/shop.png',
    './images/zoo.png',
    './images/inventory.png',
    './images/questboard.png',
    './images/townmarket.png',
    './images/townlibrary.png',
    './images/townarena.png',
    './images/upgrade-arrow.png',
    './images/readyspark.png'
];

// Install event - pre-cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-caching offline assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - Cache First strategy for media/scripts, Network First for others if needed
// But for this game, Cache First for almost everything is fine since it's a static app with Supabase for data
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return from cache if found
            if (response) {
                return response;
            }

            // Otherwise fetch from network and cache for later
            return fetch(event.request).then((networkResponse) => {
                // Don't cache non-GET requests or external API calls (like Supabase)
                if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
                    return networkResponse;
                }

                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        })
    );
});
