// This optional code is used to register a service worker.
// register() is not called by default.

import { Workbox } from 'workbox-window';

// This lets the app know when it's installed/updated
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
};

export function register(config?: Config): Workbox | undefined {
  if ('serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(import.meta.env.BASE_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if BASE_URL is on a different origin
      // from what our page is served on. This might happen if a CDN is used.
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;

      if (isLocalhost) {
        // This is running on localhost. Check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);
      } else {
        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config);
      }
    });

    // Set up listeners for online/offline events
    window.addEventListener('online', () => {
      if (config?.onOnline) config.onOnline();
    });
    
    window.addEventListener('offline', () => {
      if (config?.onOffline) config.onOffline();
    });

    // Initial check for connection status
    if (!navigator.onLine && config?.onOffline) {
      config.onOffline();
    }

    const wb = new Workbox(`${import.meta.env.BASE_URL}sw.js`);
    return wb;
  }
  return undefined;
}

function registerValidSW(swUrl: string, config?: Config) {
  const wb = new Workbox(swUrl);
  
  wb.addEventListener('installed', event => {
    const isUpdate = !!event.isUpdate;
    if (isUpdate) {
      if (config?.onUpdate) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            config.onUpdate?.(registration);
          }
        });
      }
    } else {
      if (config?.onSuccess) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            config.onSuccess?.(registration);
          }
        });
      }
    }
  });
  
  wb.register();
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Check if the service worker can be found.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' }
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
      if (config?.onOffline) config.onOffline();
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Helper to check if the browser is running on iOS
export function isIOS() {
  return (
    [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}

// Helper to check if the browser is Huawei Browser
export function isHuaweiBrowser() {
  return navigator.userAgent.toLowerCase().includes('huawei');
}

// Helper to check if the browser is Android Chrome
export function isAndroidChrome() {
  return (
    /android/i.test(navigator.userAgent) && 
    /chrome/i.test(navigator.userAgent) && 
    !/edg/i.test(navigator.userAgent)
  );
}
