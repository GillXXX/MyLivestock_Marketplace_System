// Free, keyless routing via OSRM's public demo server. Suitable for this
// project's scale (dev/demo, not high-traffic production) — no API key or
// backend proxy needed, consistent with the rest of the app's free OSM/Esri
// map stack.
export async function fetchRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== "Ok" || !data.routes?.length) return null;

    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch (error) {
    return null;
  }
}
