// Veruela's 20 barangays and the purok choices offered on the profile.
// Mirrors frontend/src/data/veruelaBarangays.json and PUROK_OPTIONS in
// frontend/src/utils/veruelaGeo.js — keep them in sync.
// Puroks are a generic numbered list until the official per-barangay list
// is available; a farmer can type their own if theirs isn't listed.

const VERUELA_BARANGAY_NAMES = [
  "Anitap",
  "Bacay II",
  "Binongan",
  "Caigangan",
  "Candiis",
  "Del Monte",
  "Don Mateo",
  "Katipunan",
  "La Fortuna",
  "Limot",
  "Magsaysay",
  "Masayan",
  "Poblacion",
  "Sampaguita",
  "San Gabriel",
  "Santa Cruz",
  "Santa Emelia",
  "Sawagan",
  "Sinobong",
  "Sisimon",
];

const PUROK_MAX_LENGTH = 50;
const SITIO_MAX_LENGTH = 100;

// The readable address saved as farm_location: "Sitio Uno, Purok 3, Anitap, Veruela, Agusan del Sur".
function buildAddress({ sitio, purok, barangay }) {
  return [sitio, purok, barangay, "Veruela, Agusan del Sur"].filter(Boolean).join(", ");
}

// Validates a barangay / purok / sitio submission. Returns { error } or
// the cleaned { barangay, purok, sitio }.
function cleanAddressParts(body) {
  const barangay = String(body.barangay || "").trim();
  if (!VERUELA_BARANGAY_NAMES.includes(barangay)) {
    return { error: "Please choose your barangay" };
  }

  const purok = String(body.purok || "").trim();
  if (!purok || purok.length > PUROK_MAX_LENGTH) {
    return { error: "Please choose or enter your purok" };
  }

  const sitio = String(body.sitio || "").trim();
  if (sitio.length > SITIO_MAX_LENGTH) {
    return { error: `Sitio / street must be ${SITIO_MAX_LENGTH} characters or fewer` };
  }

  return { barangay, purok, sitio: sitio || null };
}

module.exports = { VERUELA_BARANGAY_NAMES, buildAddress, cleanAddressParts };
