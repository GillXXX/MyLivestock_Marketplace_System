import { useEffect, useState } from "react";

const EARTH_RADIUS_KM = 6371;

// Before a deal is agreed, buyers get a farm pin moved up to this far from
// the real spot (backend/utils/locationPrivacy.js, MAX_OFFSET_M — keep both
// in sync), so a circle this size around the pin always contains the farm.
export const APPROXIMATE_FARM_RADIUS_M = 500;

// Great-circle distance between two coordinates, per the manuscript's
// Distance Computation Formula for Geolocation Mapping.
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

// "450 m" / "2.35 km" / "12.4 km" — precise enough that walking a few
// dozen meters visibly changes the number.
export function formatKm(km) {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${km.toFixed(2)} km`;
  return `${km.toFixed(1)} km`;
}

export function formatDistance(km) {
  const text = formatKm(km);
  return text ? `${text} away` : null;
}

// How far is left along a route polyline ([[lat, lng], ...]) from the
// buyer's current position: snaps the position onto the nearest segment and
// adds up the rest of the road. Lets the remaining distance update on every
// GPS fix without re-requesting the route.
// Returns { km, offRouteKm } — offRouteKm is how far the buyer is from the
// road line itself.
export function remainingAlongRoute(coordinates, point) {
  if (!coordinates || coordinates.length < 2 || !point) return null;

  // Local flat projection (meters) around the buyer — plenty accurate at
  // the scale of one segment.
  const toRad = (deg) => (deg * Math.PI) / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(toRad(point.lat));
  const toXY = ([lat, lng]) => [
    (lng - point.lng) * metersPerDegLng,
    (lat - point.lat) * metersPerDegLat,
  ];

  let best = { index: 0, t: 0, distM: Infinity };

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [ax, ay] = toXY(coordinates[i]);
    const [bx, by] = toXY(coordinates[i + 1]);
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const distM = Math.hypot(px, py); // buyer is at the origin

    if (distM < best.distM) best = { index: i, t, distM };
  }

  const [aLat, aLng] = coordinates[best.index];
  const [bLat, bLng] = coordinates[best.index + 1];
  const snapped = [aLat + (bLat - aLat) * best.t, aLng + (bLng - aLng) * best.t];

  let km = haversineDistanceKm(snapped[0], snapped[1], bLat, bLng);
  for (let i = best.index + 1; i < coordinates.length - 1; i++) {
    const [lat1, lng1] = coordinates[i];
    const [lat2, lng2] = coordinates[i + 1];
    km += haversineDistanceKm(lat1, lng1, lat2, lng2);
  }

  return { km, offRouteKm: best.distM / 1000 };
}

// ---------------------------------------------------------------------------
// Live buyer location
//
// One shared GPS watch for the whole app (Map, Marketplace, Seller Profile),
// started when the first component needs it and stopped when the last one
// unmounts. The position follows the buyer as they move, so "you are here"
// and every buyer-seller distance stay current.
//
// status: idle | loading | granted | unavailable | denied | insecure | unsupported
//   unavailable — no GPS fix right now (weak signal / timeout); the last
//                 known position is kept and the watch keeps trying
//   insecure    — browsers only share GPS with https:// pages (or localhost)
// ---------------------------------------------------------------------------

// Ignore GPS jitter: only publish a new fix after a real move, a much better
// accuracy reading, or a while without updates.
const MIN_MOVE_METERS = 8;
const ACCURACY_GAIN_METERS = 20;
const REFRESH_MS = 30000;

let state = { location: null, status: "idle" };
let watchId = null;
let lastPublishedAt = 0;
const listeners = new Set();

function publish(next) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener(state));
}

function shouldPublish(prev, next) {
  if (!prev) return true;
  const movedMeters = haversineDistanceKm(prev.lat, prev.lng, next.lat, next.lng) * 1000;
  if (movedMeters >= MIN_MOVE_METERS) return true;
  if (prev.accuracy - next.accuracy >= ACCURACY_GAIN_METERS) return true;
  return Date.now() - lastPublishedAt >= REFRESH_MS;
}

function startWatching() {
  if (watchId !== null) return;

  if (!("geolocation" in navigator)) {
    publish({ status: "unsupported" });
    return;
  }

  if (!window.isSecureContext) {
    publish({ status: "insecure" });
    return;
  }

  if (!state.location) publish({ status: "loading" });

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const next = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
        updatedAt: pos.timestamp,
      };

      if (shouldPublish(state.location, next)) {
        lastPublishedAt = Date.now();
        publish({ location: next, status: "granted" });
      } else if (state.status !== "granted") {
        publish({ status: "granted" });
      }
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        publish({ status: "denied" });
        stopWatching();
        return;
      }
      // Timeout / no signal: keep the last known spot; the watch retries.
      publish({ status: state.location ? "granted" : "unavailable" });
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
  );
}

function stopWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

// Continuously-updating position of the buyer: { location, status }.
// location = { lat, lng, accuracy (meters), updatedAt } or null.
export function useLiveLocation() {
  const [current, setCurrent] = useState(state);

  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(state);
    startWatching();

    return () => {
      listeners.delete(setCurrent);
      if (listeners.size === 0) stopWatching();
    };
  }, []);

  return current;
}

// Buyer-seller distances (Marketplace, Seller Profile) follow the live
// position too, so they update as the buyer moves.
export const useBuyerLocation = useLiveLocation;
