import boundaryData from "../data/veruelaBoundary.json";
import barangaysData from "../data/veruelaBarangays.json";

export const VERUELA_BARANGAYS = barangaysData;

export const VERUELA_BOUNDARY_GEOJSON = boundaryData.geojson;

export const VERUELA_CENTER = [8.0698, 125.9554];

// Leaflet-style bounds: [[south, west], [north, east]]
export const VERUELA_BOUNDS = [
  [boundaryData.boundingBox.south, boundaryData.boundingBox.west],
  [boundaryData.boundingBox.north, boundaryData.boundingBox.east],
];

/**
 * Ray-casting point-in-polygon test against the real Veruela municipal
 * boundary (OpenStreetMap administrative relation), so pins can be
 * validated as actually falling within municipality scope rather than
 * just within a bounding box.
 */
export function isInsideVeruela(lat, lng) {
  const ring = VERUELA_BOUNDARY_GEOJSON.coordinates[0];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

export function findBarangay(name) {
  return VERUELA_BARANGAYS.find((b) => b.name === name) || null;
}

// Purok choices on the profile. A generic numbered list until the official
// per-barangay list is available — "Other" lets a farmer type theirs.
// Mirrors backend/utils/veruelaPlaces.js.
export const PUROK_OPTIONS = Array.from({ length: 15 }, (_, i) => `Purok ${i + 1}`);
