/** Loads Maps JS API + Places library once per page. */
let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
      script.onload = () => resolve();
      script.onerror = () => {
        loadPromise = null;
        reject(new Error("Could not load Google Maps"));
      };
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}
