// Fills the local database with sample farmers, buyers, an MAO staff
// member, listings, deals, chats and favorites, so every screen has
// something to show during development and demos.
//
//   node scripts/seed.js           add the sample data
//   node scripts/seed.js --clean   remove it again
//   node scripts/seed.js --reset   remove it, then add it fresh
//
// Every sample account uses an @seed.herdmarket.test email, which is how
// --clean finds what to delete; real accounts are never touched. Refuses
// to run against anything but a local database.

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const fs = require("fs");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { buildAddress } = require("../utils/veruelaPlaces");
const { getCategory, getPricePerQuantityUnit } = require("../utils/productCatalog");
const { makeIdCard } = require("./seedIdCard");

const SEED_DOMAIN = "seed.herdmarket.test";
const SEED_PASSWORD = "Seed12345";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];

// Barangay centres, from frontend/src/data/veruelaBarangays.json.
const BARANGAY_CENTRES = {
  Anitap: [7.9596, 125.7892],
  "Bacay II": [8.086, 125.8808],
  Binongan: [8.0232, 125.9783],
  Caigangan: [8.0583, 125.8619],
  Candiis: [7.9376, 125.8796],
  "Del Monte": [7.9876, 125.8821],
  "Don Mateo": [8.0888, 125.8895],
  Katipunan: [7.9756, 125.8548],
  "La Fortuna": [8.0257, 125.9137],
  Limot: [7.953, 125.8752],
  Magsaysay: [8.0542, 125.9312],
  Masayan: [8.0641, 125.9032],
  Poblacion: [8.0721, 125.9549],
  Sampaguita: [8.0209, 125.9508],
  "San Gabriel": [8.0927, 125.9202],
  "Santa Cruz": [7.984, 125.8385],
  "Santa Emelia": [7.9436, 125.903],
  Sawagan: [8.0155, 125.8708],
  Sinobong: [7.9631, 125.9214],
  Sisimon: [7.9655, 125.8632],
};

const TOTAL_FARMERS = 57;
const TOTAL_BUYERS = 44;

const FARMERS = [
  { key: "pedro", handle: "rogelio.ompad", name: "Rogelio B. Ompad", middle: "Bentulan", barangay: "Anitap", purok: "Purok 2", about: "Backyard hog raiser for 12 years. Pigs are fed commercial feeds and kitchen greens." },
  { key: "maria", handle: "nenitagabutan", name: "Nenita C. Gabutan", middle: "Cabaluna", barangay: "Katipunan", purok: "Purok 4", about: "Free-range native chickens and fresh eggs every week." },
  { key: "jun", handle: "junrey.sumampao", name: "Junrey L. Sumampao", middle: "Lapinig", barangay: "Del Monte", purok: "Purok 1", about: "Cattle and carabao, raised on open pasture." },
  { key: "liza", handle: "marivic.lagura", name: "Marivic T. Lagura", middle: "Tumulak", barangay: "La Fortuna", purok: "Purok 3", about: "Goats, ducks and vegetables from our family farm." },
  { key: "ramon", handle: "dionisio.tampus", name: "Dionisio A. Tampus", middle: "Alimpoos", barangay: "Candiis", purok: "Purok 5", about: "Fruit trees and a few beehives." },
  { key: "elena", handle: "jocelynbacus", name: "Jocelyn P. Bacus", middle: "Paquibot", barangay: "Santa Cruz", purok: "Purok 2", about: "Swine and dairy goats." },
  // Waiting for MAO to check their documents, so they can't post yet.
  { key: "carlo", handle: "rodel.ebarle", name: "Rodel M. Ebarle", middle: "Montebon", barangay: "Limot", purok: "Purok 6", verification: "Pending" },
  { key: "nena", handle: "erlinda.dumanon", name: "Erlinda S. Dumanon", middle: "Sabellano", barangay: "Bacay II", purok: "Purok 1", verification: "Pending" },
];

const BUYERS = [
  { key: "ana", handle: "kristinejoy.amper", name: "Kristine Joy Amper", barangay: "Poblacion", purok: "Purok 3" },
  { key: "joseph", handle: "ariel.cuizon", name: "Ariel D. Cuizon", barangay: "San Gabriel", purok: "Purok 1" },
  { key: "grace", handle: "marygrace.lumayag", name: "Mary Grace Lumayag", barangay: "Poblacion", purok: "Purok 7" },
  { key: "mark", handle: "markanthony.galagar", name: "Mark Anthony Galagar", barangay: "Santa Cruz", purok: "Purok 4" },
  { key: "rose", handle: "rosalie.saligumba", name: "Rosalie B. Saligumba", barangay: "Katipunan", purok: "Purok 2" },
];

// Personnel assigned at the Veruela Municipal Agriculture Office, from the
// MAO's certification. Their designation and program go in "about", since
// staff accounts have no field of their own for it. reviews: what they
// approve in the sample data — the Livestock Coordinator handles livestock
// listings, the HVCDP coordinators farm products, and the technologists
// farmer verifications.
const STAFF = [
  { key: "balonda", handle: "darwin.balonda", name: "Darwin B. Balonda", about: "Municipal Agriculturist — Rice Program" },
  { key: "vbasang", handle: "vercellijoyce.basang", name: "Vercelli Joyce V. Basang", about: "Agriculturist II — Rice Program" },
  { key: "lnuangay", handle: "lovengrace.nuangay", name: "Loven Grace E. Nuangay", about: "Agriculturist II — Rice, HVCDP Coordinator", reviews: "product" },
  { key: "terrado", handle: "rina.terrado", name: "Rina D. Terrado", about: "Agriculturist II — Rice, Fisheries Coordinator" },
  { key: "lugagay", handle: "versa.lugagay", name: "Versa S. Lugagay", about: "Agricultural Technologist — Rice Program", reviews: "farmer" },
  { key: "ayco", handle: "analyn.ayco", name: "Analyn E. Ayco", about: "Agricultural Technologist — Rice Program", reviews: "farmer" },
  { key: "pelino", handle: "robert.pelino", name: "Robert B. Peliño", about: "Agricultural Technologist — Rice Program", reviews: "farmer" },
  { key: "moneva", handle: "jaselame.moneva", name: "Jaselame A. Moñeva", about: "Agricultural Technologist — Rice Program", reviews: "farmer" },
  { key: "aldip", handle: "briangregg.aldip", name: "Brian Gregg C. Aldip", about: "Agricultural Technologist", reviews: "farmer" },
  { key: "diane", handle: "lito.diane", name: "Lito S. Diane", about: "Agricultural Technologist — Rice Program", reviews: "farmer" },
  { key: "mbasang", handle: "melanio.basangjr", name: "Melanio C. Basang Jr.", about: "Agricultural Technologist — Rice, HVCDP Coordinator", reviews: "product" },
  { key: "abancio", handle: "engel.abancio", name: "Engel C. Abancio", about: "Agricultural Technologist — Rice, PCA Coordinator" },
  { key: "ramada", handle: "rodel.ramada", name: "Rodel A. Ramada", about: "Animal Keeper III — Livestock Coordinator", reviews: "livestock" },
  { key: "sabug", handle: "roy.sabug", name: "Roy R. Sabug", about: "Agricultural Technologist — Rice, Meat Inspector Coordinator" },
  { key: "jnuangay", handle: "jerome.nuangay", name: "Jerome E. Nuangay", about: "Agricultural Technologist — Rice, Organic Coordinator" },
  { key: "gingo", handle: "judy.gingo", name: "Judy F. Gingo", about: "Agricultural Technologist — Rice, Corn Coordinator" },
].map((person) => ({ ...person, barangay: "Poblacion", purok: "Purok 1" }));

const reviewersFor = (kind) => STAFF.filter((s) => s.reviews === kind);

// review: "mao" = approved by MAO (gets the "MAO verified" badge),
// "auto" = published without review. quantity is what's left after the
// deals below took their share.
const LISTINGS = [
  { key: "hogs", farmer: "pedro", type: "Swine", breed: "Large White", age: "5 months", weight: "85", price: 165, quantity: 4, unit: "kg_live", review: "mao", days: 21, description: "Healthy fattening hogs, dewormed and vaccinated against hog cholera." },
  { key: "piglets", farmer: "pedro", type: "Swine", breed: "Landrace x Duroc", age: "6 weeks", weight: "12", price: 3500, quantity: 8, unit: "head", review: "mao", days: 9, description: "Weaned piglets, eating on their own. Pick up in Anitap." },
  { key: "sow", farmer: "pedro", type: "Swine", breed: "Landrace", age: "2 years", weight: "180", price: 18000, quantity: 1, unit: "head", status: "Pending", days: 1, description: "Proven breeder sow, 3 litters. Selling because we're downsizing." },
  { key: "chickens", farmer: "maria", type: "Poultry", breed: "Native (Bisaya)", age: "6 months", weight: "1.5", price: 350, quantity: 18, unit: "head", review: "mao", days: 14, description: "Free-range native chickens. Good for tinola." },
  { key: "eggs", farmer: "maria", type: "Eggs", breed: "Native chicken eggs", price: 270, quantity: 15, unit: "tray", review: "mao", days: 4, description: "Fresh eggs collected daily, 30 per tray." },
  { key: "broilers", farmer: "maria", type: "Poultry", breed: "Broiler", age: "40 days", weight: "2", price: 150, quantity: 0, unit: "kg_live", status: "Sold", review: "mao", days: 28, description: "Ready-to-harvest broilers." },
  { key: "cattle", farmer: "jun", type: "Cattle", breed: "Brahman cross", age: "2.5 years", weight: "320", price: 185, quantity: 2, unit: "kg_live", review: "mao", days: 18, description: "Grass-fed steers, calm and easy to handle." },
  { key: "carabao", farmer: "jun", type: "Carabao", breed: "Philippine Carabao", age: "4 years", weight: "450", price: 75000, quantity: 1, unit: "head", review: "mao", days: 11, description: "Trained work carabao, good for plowing." },
  { key: "heifer", farmer: "jun", type: "Cattle", breed: "Native", age: "1.5 years", weight: "210", price: 42000, quantity: 1, unit: "head", status: "Rejected", reviewNote: "The health certificate photo is blurry — please upload a clearer copy.", days: 6, description: "Young heifer, ready for breeding next season." },
  { key: "goats", farmer: "liza", type: "Goat", breed: "Anglo-Nubian cross", age: "1 year", weight: "28", price: 9500, quantity: 5, unit: "head", review: "mao", days: 16, description: "Healthy goats, dewormed last month." },
  { key: "ducks", farmer: "liza", type: "Duck", breed: "Itik (Pateros)", age: "5 months", weight: "1.8", price: 300, quantity: 12, unit: "head", review: "auto", days: 7, description: "Laying ducks, already producing." },
  { key: "vegetables", farmer: "liza", type: "Vegetables", breed: "Pechay, sitaw, talong", price: 60, quantity: 40, unit: "kg", review: "mao", days: 3, description: "Mixed fresh vegetables, harvested the morning of pickup." },
  { key: "bananas", farmer: "ramon", type: "Fruits", breed: "Lakatan banana", price: 55, quantity: 120, unit: "kg", review: "mao", days: 8, description: "Sweet lakatan, sold by the kilo." },
  { key: "honey", farmer: "ramon", type: "Honey", breed: "Wild forest honey", price: 450, quantity: 20, unit: "bottle", review: "auto", days: 5, description: "Raw honey, 750 ml per bottle." },
  { key: "durian", farmer: "ramon", type: "Fruits", breed: "Puyat durian", price: 120, quantity: 60, unit: "kg", status: "Pending", days: 0, description: "First harvest of the season." },
  { key: "fatteners", farmer: "elena", type: "Swine", breed: "Duroc cross", age: "4 months", weight: "70", price: 160, quantity: 6, unit: "kg_live", review: "mao", days: 12, description: "Fatteners on a strict feeding program." },
  { key: "goatmilk", farmer: "elena", type: "Milk / Dairy", breed: "Fresh goat milk", price: 120, quantity: 25, unit: "liter", review: "mao", days: 2, description: "Pasteurized goat milk, chilled. Bring your own container." },
  { key: "doe", farmer: "elena", type: "Goat", breed: "Boer", age: "2 years", weight: "40", price: 14000, quantity: 1, unit: "head", status: "Pending", days: 1, description: "Pregnant Boer doe, due next month." },
  { key: "boar", farmer: "elena", type: "Swine", breed: "Pietrain", age: "1 year", weight: "150", price: 25000, quantity: 1, unit: "head", status: "Draft", days: 0, description: "Breeder boar — still finishing this listing." },
];

// step/status follow the deal flow: Negotiation (offer on the table),
// Confirmation (terms agreed, awaiting pickup), Completed, or closed early.
const DEALS = [
  { listing: "broilers", buyer: "ana", quantity: 40, step: "Completed", status: "Completed", days: 25, offerBy: "buyer", unitPrice: 145, actualWeightKg: 82, payment: "Cash on pickup" },
  { listing: "hogs", buyer: "joseph", quantity: 2, step: "Completed", status: "Completed", days: 15, offerBy: "farmer", unitPrice: 160, actualWeightKg: 176, payment: "Bank / GCash transfer" },
  { listing: "chickens", buyer: "grace", quantity: 6, step: "Confirmation", status: "Pending", days: 3, offerBy: "buyer", unitPrice: 330, payment: "Cash on pickup" },
  { listing: "goats", buyer: "mark", quantity: 1, step: "Confirmation", status: "Pending", days: 2, offerBy: "farmer", unitPrice: 9000, payment: "Down payment, balance on pickup" },
  { listing: "cattle", buyer: "joseph", quantity: 1, step: "Negotiation", status: "Pending", days: 1, offerBy: "buyer", unitPrice: 175, payment: "Bank / GCash transfer" },
  { listing: "eggs", buyer: "rose", quantity: 5, step: "Negotiation", status: "Pending", days: 0, offerBy: null },
  { listing: "piglets", buyer: "ana", quantity: 2, step: "Negotiation", status: "Declined", days: 6, offerBy: "buyer", unitPrice: 2500, payment: "Cash on pickup" },
  { listing: "bananas", buyer: "grace", quantity: 30, step: "Confirmation", status: "Cancelled", days: 5, offerBy: "farmer", unitPrice: 50, payment: "Cash on pickup", cancelReason: "Typhoon closed the road to the farm." },
];

// Questions asked in chat without starting a deal.
const INQUIRIES = [
  { listing: "carabao", buyer: "mark", days: 4, chat: [["buyer", "Good day! Is the carabao still available? Is it used to plowing rice fields?"], ["farmer", "Yes, still available. He's plowed our rice field for 2 seasons."], ["buyer", "Can I visit on Saturday to see him?"]] },
  { listing: "honey", buyer: "rose", days: 2, chat: [["buyer", "Hello po, is the honey pure? How long does it keep?"], ["farmer", "Pure po, straight from the hive. It keeps for over a year if sealed."]] },
  { listing: "goatmilk", buyer: "ana", days: 1, chat: [["buyer", "Do you deliver to Poblacion?"]] },
];

const FAVORITES = [
  ["ana", "carabao"], ["ana", "goatmilk"], ["joseph", "fatteners"], ["grace", "eggs"],
  ["grace", "honey"], ["mark", "ducks"], ["rose", "vegetables"], ["rose", "chickens"],
];

const PICKUP_PLACES = ["At the farm", "Veruela public market", "Poblacion barangay hall"];

// ---- Generated accounts --------------------------------------------------
// The hand-written people above carry the deals and chats; the rest of the
// farmers and buyers are generated from common local names so the lists,
// map and reports look like a real municipality. A fixed random seed keeps
// them the same on every run.

const MALE_NAMES = [
  "Arnel", "Ricky", "Rolando", "Elmer", "Joel", "Reynaldo", "Danilo", "Romeo", "Jessie", "Wilfredo",
  "Ernesto", "Alvin", "Jerome", "Nestor", "Benjie", "Felix", "Teodoro", "Crisanto", "Gilbert", "Jovito",
  "Lito", "Marlon", "Noel", "Rommel", "Edgar", "Ronald", "Junjun", "Virgilio", "Renato", "Jhon Rey",
];

const FEMALE_NAMES = [
  "Gina", "Lorna", "Merlinda", "Analyn", "Jennifer", "Ma. Luisa", "Cristina", "Evelyn", "Leonora", "Rowena",
  "Lourdes", "Teresita", "Imelda", "Juvy", "Mylene", "Charmaine", "Arlene", "Susan", "Rachelle", "Lovely",
  "Ma. Cecilia", "Edna", "Precious", "Jenelyn", "Rubylyn",
];

const SURNAMES = [
  "Ompad", "Gabutan", "Sumampao", "Lagura", "Tampus", "Bacus", "Ebarle", "Dumanon", "Amper", "Cuizon",
  "Lumayag", "Galagar", "Saligumba", "Manlapig", "Ladera", "Gumapac", "Tagalogon", "Abucay", "Ybañez",
  "Pagaran", "Catubig", "Dalagan", "Lumanog", "Bayawa", "Mondejar", "Ranises", "Linogao", "Bentulan",
  "Tabañag", "Pahayahay", "Maglinte", "Cabaluna", "Ruaya", "Sabellano", "Alimpoos", "Lapinig", "Ocon",
  "Daguplo", "Montebon", "Laurente", "Sumalinog", "Igot", "Paquibot", "Tumulak", "Dinoro",
];

const MIDDLE_INITIALS = "ABCDGLMOPRST";

// What a generated farmer might post. price/weight/quantity are [min, max].
const LISTING_TEMPLATES = [
  { type: "Swine", breeds: ["Large White", "Landrace", "Duroc cross"], age: "5 months", weight: [70, 95], price: [155, 175], quantity: [2, 8], unit: "kg_live", description: "Fattening hogs, dewormed and vaccinated against hog cholera." },
  { type: "Swine", breeds: ["Landrace x Duroc", "Large White"], age: "6 weeks", weight: [10, 14], price: [3000, 3800], quantity: [4, 10], unit: "head", description: "Weaned piglets, already eating on their own." },
  { type: "Cattle", breeds: ["Brahman cross", "Native"], age: "2 years", weight: [250, 350], price: [170, 190], quantity: [1, 3], unit: "kg_live", description: "Grass-fed cattle, raised on open pasture." },
  { type: "Carabao", breeds: ["Philippine Carabao"], age: "4 years", weight: [380, 480], price: [55000, 80000], quantity: [1, 1], unit: "head", description: "Strong carabao, used to farm work." },
  { type: "Goat", breeds: ["Native", "Anglo-Nubian cross", "Boer cross"], age: "1 year", weight: [22, 35], price: [7000, 12000], quantity: [1, 6], unit: "head", description: "Healthy goats, dewormed and ready for pickup." },
  { type: "Poultry", breeds: ["Native (Bisaya)", "Dabakan"], age: "6 months", weight: [1.2, 1.8], price: [300, 380], quantity: [8, 25], unit: "head", description: "Free-range native chickens." },
  { type: "Duck", breeds: ["Itik (Pateros)", "Mallard"], age: "5 months", weight: [1.5, 2], price: [280, 330], quantity: [6, 15], unit: "head", description: "Laying ducks." },
  { type: "Eggs", breeds: ["Native chicken eggs", "Duck eggs"], price: [250, 290], quantity: [5, 20], unit: "tray", description: "Fresh eggs, 30 per tray." },
  { type: "Vegetables", breeds: ["Pechay, sitaw, talong", "Kalabasa", "Okra and ampalaya"], price: [40, 80], quantity: [20, 60], unit: "kg", description: "Freshly harvested vegetables." },
  { type: "Fruits", breeds: ["Lakatan banana", "Lanzones", "Rambutan", "Marang"], price: [40, 90], quantity: [30, 150], unit: "kg", description: "Fresh from our trees, sold by the kilo." },
  { type: "Honey", breeds: ["Wild forest honey"], price: [400, 500], quantity: [5, 20], unit: "bottle", description: "Raw honey, 750 ml per bottle." },
  { type: "Milk / Dairy", breeds: ["Fresh goat milk", "Carabao milk"], price: [100, 130], quantity: [10, 30], unit: "liter", description: "Chilled fresh milk. Bring your own container." },
];

// mulberry32: a tiny seeded random generator, so every run makes the same people.
function makeRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(2026);
const pick = (list) => list[Math.floor(random() * list.length)];
const between = ([min, max], step = 1) => Math.round((min + random() * (max - min)) / step) * step;

const handleFor = (first, last) => {
  const clean = (s) => s.toLowerCase().replace(/^ma\. /, "ma").replace(/ñ/g, "n").replace(/[^a-z]/g, "");
  const [f, l] = [clean(first), clean(last)];
  return pick([`${f}.${l}`, `${f}${l}`, `${l}.${f}`, `${f}.${l}${between([1, 99])}`, `${f}${l}${between([80, 99])}`]);
};

function generatePeople(count, existing) {
  const usedNames = new Set(existing.map((p) => p.name.replace(/ [A-Z]\. /, " ")));
  const usedHandles = new Set(existing.map((p) => p.handle));
  const barangays = Object.keys(BARANGAY_CENTRES);
  const people = [];

  while (people.length < count) {
    const first = pick(random() < 0.5 ? MALE_NAMES : FEMALE_NAMES);
    const last = pick(SURNAMES);
    const handle = handleFor(first, last);
    if (usedNames.has(`${first} ${last}`) || usedHandles.has(handle)) continue;
    usedNames.add(`${first} ${last}`);
    usedHandles.add(handle);

    people.push({
      key: `gen-${handle}`,
      handle,
      name: random() < 0.7 ? `${first} ${pick([...MIDDLE_INITIALS])}. ${last}` : `${first} ${last}`,
      barangay: pick(barangays),
      purok: `Purok ${between([1, 7])}`,
    });
  }
  return people;
}

const generatedFarmers = generatePeople(TOTAL_FARMERS - FARMERS.length, [...FARMERS, ...BUYERS, ...STAFF]);
const generatedBuyers = generatePeople(TOTAL_BUYERS - BUYERS.length, [...FARMERS, ...BUYERS, ...STAFF, ...generatedFarmers]);

for (const [i, farmer] of generatedFarmers.entries()) {
  // Most are verified; the rest sent their documents and are waiting on MAO.
  farmer.verification = i % 9 === 4 || i % 13 === 7 ? "Pending" : undefined;
  if (farmer.verification) continue;

  const templates = [pick(LISTING_TEMPLATES)];
  if (random() < 0.5) templates.push(pick(LISTING_TEMPLATES.filter((t) => t !== templates[0])));
  farmer.about = `Small farm in ${farmer.barangay} raising ${templates.map((t) => t.type.toLowerCase()).join(" and ")}.`;

  for (const [n, t] of templates.entries()) {
    const roll = random();
    LISTINGS.push({
      key: `${farmer.key}-${n}`,
      farmer: farmer.key,
      type: t.type,
      breed: pick(t.breeds),
      age: t.age,
      weight: t.weight ? String(between(t.weight, t.weight[1] < 5 ? 0.1 : 1)) : undefined,
      price: between(t.price, t.price[1] > 1000 ? 100 : 5),
      quantity: between(t.quantity),
      unit: t.unit,
      review: roll < 0.82 ? "mao" : roll < 0.92 ? "auto" : undefined,
      status: roll < 0.92 ? undefined : "Pending",
      days: between([0, 60]),
      description: t.description,
    });
  }
}

FARMERS.push(...generatedFarmers);
BUYERS.push(...generatedBuyers);

// Each generated buyer saves a few listings that are on the marketplace.
const favoriteChoices = LISTINGS.filter((l) => !l.status);
for (const buyer of generatedBuyers) {
  const saved = new Set();
  const count = between([0, 3]);
  while (saved.size < count) saved.add(pick(favoriteChoices).key);
  for (const listing of saved) FAVORITES.push([buyer.key, listing]);
}

const seedEmail = (person) => `${person.handle}@${SEED_DOMAIN}`;

const daysAgo = (days, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000);

const toDateOnly = (date) => date.toISOString().slice(0, 10);

const peso = (n) => `₱${Number(n).toLocaleString("en-PH")}`;

// A stable offset of up to ~1 km so farms in one barangay don't share a pin.
function jitter(seed, i) {
  const x = Math.sin(seed * 9301 + i * 49297) * 233280;
  return (x - Math.floor(x) - 0.5) * 0.018;
}

function assertLocalDatabase() {
  const host = process.env.DB_HOST || "localhost";
  if (!LOCAL_HOSTS.includes(host) || process.env.NODE_ENV === "production") {
    console.error(`Refusing to seed: DB_HOST is "${host}" (NODE_ENV=${process.env.NODE_ENV || "unset"}). Sample data is for local databases only.`);
    process.exit(1);
  }
}

async function getSeedUserIds(conn) {
  const [rows] = await conn.query("SELECT id FROM users WHERE email LIKE ?", [`%@${SEED_DOMAIN}`]);
  return rows.map((r) => r.id);
}

async function clean(conn) {
  const ids = await getSeedUserIds(conn);
  if (ids.length === 0) return 0;

  const [listingRows] = await conn.query("SELECT id FROM livestock_listings WHERE farmer_id IN (?)", [ids]);
  const listingIds = listingRows.map((r) => r.id);
  const [convRows] = await conn.query(
    "SELECT id FROM conversations WHERE farmer_id IN (?) OR buyer_id IN (?)" + (listingIds.length ? " OR listing_id IN (?)" : ""),
    listingIds.length ? [ids, ids, listingIds] : [ids, ids]
  );
  const convIds = convRows.map((r) => r.id);

  if (convIds.length) await conn.query("DELETE FROM messages WHERE conversation_id IN (?)", [convIds]);
  await conn.query("DELETE FROM messages WHERE sender_id IN (?)", [ids]);
  if (convIds.length) await conn.query("DELETE FROM conversations WHERE id IN (?)", [convIds]);

  await conn.query("DELETE FROM transactions WHERE farmer_id IN (?) OR buyer_id IN (?)", [ids, ids]);
  await conn.query("DELETE FROM favorites WHERE buyer_id IN (?)", [ids]);
  await conn.query("DELETE FROM inquiries WHERE buyer_id IN (?)", [ids]);
  if (listingIds.length) {
    await conn.query("DELETE FROM favorites WHERE listing_id IN (?)", [listingIds]);
    await conn.query("DELETE FROM inquiries WHERE listing_id IN (?)", [listingIds]);
    await conn.query("UPDATE messages SET listing_id = NULL WHERE listing_id IN (?)", [listingIds]);
    await conn.query("DELETE FROM livestock_listings WHERE id IN (?)", [listingIds]);
  }

  // If the sample MAO staff member reviewed real listings, keep the review
  // but drop the link to the account being removed.
  await conn.query("UPDATE livestock_listings SET reviewed_by = NULL WHERE reviewed_by IN (?)", [ids]);
  await conn.query("UPDATE users SET verification_reviewed_by = NULL WHERE verification_reviewed_by IN (?)", [ids]);

  await conn.query("DELETE FROM farmer_notification_reads WHERE farmer_id IN (?)", [ids]);
  await conn.query("DELETE FROM buyer_notification_reads WHERE buyer_id IN (?)", [ids]);
  await conn.query("DELETE FROM staff_sessions WHERE user_id IN (?)", [ids]);
  await conn.query("DELETE FROM users WHERE id IN (?)", [ids]);
  removeSeedIdFiles();
  removeSeedPhotoFiles();

  return ids.length;
}

// Sample documents to attach: every farmer's own government ID (the sample
// ID with their name printed on it) and a barangay certificate, and the
// health certificate on livestock listings. The originals are kept in
// scripts/seed-files/ (not committed, like any ID image); without them the
// sample data simply has no documents.
const SEED_SOURCE_DIR = path.resolve(__dirname, "seed-files");
const SAMPLE_ID = "sample-id.jpg";
const SAMPLE_CERTIFICATE = "sample-health-certificate.pdf";
const PRIVATE_DIR = path.resolve(__dirname, "..", "uploads-private");
const PUBLIC_DIR = path.resolve(__dirname, "..", "uploads");
const ID_FILE_PREFIX = "upload-seed-id-";
const BARANGAY_CERTIFICATE_FILE = "upload-seed-barangay-certificate.pdf";
const HEALTH_CERTIFICATE_FILE = "upload-seed-health-certificate.pdf";

const HAND_WRITTEN_MALE_NAMES = ["Rogelio", "Junrey", "Dionisio", "Rodel", "Ariel", "Mark Anthony"];

// Given, middle and last name plus gender, for printing on the ID.
// "Rogelio B. Ompad" -> given "Rogelio", last "Ompad", and a middle name
// starting with B (the person's own, or a local surname picked by handle).
function idDetails(person) {
  const parts = person.name.split(" ");
  const last = parts.pop();
  const initial = /^[A-Z]\.$/.test(parts[parts.length - 1]) ? parts.pop()[0] : null;
  const given = parts.join(" ");

  let middle = person.middle;
  if (!middle) {
    const choices = SURNAMES.filter((s) => s !== last && (!initial || s.startsWith(initial)));
    const hash = [...person.handle].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000003, 7);
    middle = choices[hash % choices.length];
  }

  const isMale = MALE_NAMES.includes(given) || HAND_WRITTEN_MALE_NAMES.includes(given);
  return { given, middle, last, gender: isMale ? "Male" : "Female" };
}

function installSeedFiles() {
  const missing = [SAMPLE_ID, SAMPLE_CERTIFICATE].filter((f) => !fs.existsSync(path.join(SEED_SOURCE_DIR, f)));
  if (missing.length) {
    console.log(`No sample documents attached — add ${missing.join(" and ")} to scripts/seed-files/.`);
    return {};
  }

  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.copyFileSync(path.join(SEED_SOURCE_DIR, SAMPLE_CERTIFICATE), path.join(PRIVATE_DIR, BARANGAY_CERTIFICATE_FILE));
  fs.copyFileSync(path.join(SEED_SOURCE_DIR, SAMPLE_CERTIFICATE), path.join(PUBLIC_DIR, HEALTH_CERTIFICATE_FILE));

  // Stored the way the upload code stores them: private files by name,
  // listing documents as public URLs (server.js rewrites the host).
  const baseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  return {
    async verificationDocumentFor(person) {
      const idFile = `${ID_FILE_PREFIX}${person.handle.replace(/[^\w-]/g, "-")}.jpg`;
      await makeIdCard(path.join(SEED_SOURCE_DIR, SAMPLE_ID), path.join(PRIVATE_DIR, idFile), idDetails(person));
      return JSON.stringify([
        { type: "Government ID", file: idFile },
        { type: "Barangay Certificate", file: BARANGAY_CERTIFICATE_FILE },
      ]);
    },
    listingDocuments: JSON.stringify([`${baseUrl}/uploads/${HEALTH_CERTIFICATE_FILE}`]),
  };
}

function removeSeedIdFiles() {
  if (!fs.existsSync(PRIVATE_DIR)) return;
  for (const file of fs.readdirSync(PRIVATE_DIR)) {
    if (file.startsWith(ID_FILE_PREFIX)) fs.unlinkSync(path.join(PRIVATE_DIR, file));
  }
}

// ---- Listing photos ------------------------------------------------------
// Freely licensed Wikimedia Commons photos, chosen per kind of listing and
// listed with their author and licence in scripts/seedPhotos.json. They're
// downloaded once into scripts/seed-files/photos/ (not committed) and
// copied into uploads/ like a farmer's own upload. A listing whose photo
// can't be fetched just shows the usual placeholder.
const SEED_PHOTOS = require("./seedPhotos.json");
const PHOTO_CACHE_DIR = path.join(SEED_SOURCE_DIR, "photos");
const PHOTO_FILE_PREFIX = "upload-seed-photo-";

// Which photo pool in seedPhotos.json fits a listing.
function photoTagFor(item) {
  const breed = item.breed.toLowerCase();
  switch (item.type) {
    case "Swine":
      if (/week/.test(item.age || "")) return "piglets";
      return /duroc/.test(breed) && !/landrace/.test(breed) ? "duroc-pig" : "pig";
    case "Goat":
      if (/boer/.test(breed)) return "boer-goat";
      return /nubian/.test(breed) ? "nubian-goat" : "goat";
    case "Poultry":
      return /broiler/.test(breed) ? "broiler" : "native-chicken";
    case "Eggs":
      return /duck/.test(breed) ? "duck-eggs" : "eggs";
    case "Vegetables":
      if (/kalabasa/.test(breed)) return "squash";
      return /okra/.test(breed) ? "okra" : "vegetables";
    case "Fruits":
      return ["lanzones", "rambutan", "marang", "durian"].find((f) => breed.includes(f)) || "banana";
    case "Milk / Dairy":
      return /goat/.test(breed) ? "goat-milk" : "milk";
    default:
      return item.type.toLowerCase(); // cattle, carabao, duck, honey
  }
}

async function installSeedPhotos() {
  fs.mkdirSync(PHOTO_CACHE_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  const baseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  const urls = {};
  let failed = 0;

  for (const [tag, photos] of Object.entries(SEED_PHOTOS)) {
    urls[tag] = [];
    for (const [n, photo] of photos.entries()) {
      const cached = path.join(PHOTO_CACHE_DIR, photo.file);
      if (!fs.existsSync(cached)) {
        try {
          const res = await fetch(photo.url, { headers: { "User-Agent": "HerdMarketSeed/1.0 (local sample data)" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          fs.writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
        } catch (error) {
          failed++;
          continue;
        }
      }
      const name = `${PHOTO_FILE_PREFIX}${tag}-${n}.jpg`;
      fs.copyFileSync(cached, path.join(PUBLIC_DIR, name));
      urls[tag].push(`${baseUrl}/uploads/${name}`);
    }
  }

  if (failed) console.log(`${failed} listing photo(s) couldn't be downloaded; those listings use the placeholder.`);
  return urls;
}

function removeSeedPhotoFiles() {
  if (!fs.existsSync(PUBLIC_DIR)) return;
  for (const file of fs.readdirSync(PUBLIC_DIR)) {
    if (file.startsWith(PHOTO_FILE_PREFIX)) fs.unlinkSync(path.join(PUBLIC_DIR, file));
  }
}

async function insertUser(conn, person, role, passwordHash, extra = {}) {
  const [lat, lng] = BARANGAY_CENTRES[person.barangay];
  const address = buildAddress({ purok: person.purok, barangay: person.barangay });
  // A number unique to this person, for their phone number and where their pin sits.
  const index = [...person.handle].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000003, 7);
  const isFarmer = role === "farmer";

  const [result] = await conn.query(
    `INSERT INTO users
      (full_name, email, phone, location, farm_location, barangay, purok, farm_lat, farm_lng, role, password, about,
       is_verified, verification_status, verification_document, verification_submitted_at, verification_reviewed_by, verification_reviewed_at,
       profile_completed, privacy_consented_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      person.name,
      seedEmail(person),
      `09${String(100000000 + ((index * 7654321) % 900000000)).padStart(9, "0")}`,
      address,
      isFarmer ? address : null,
      person.barangay,
      person.purok,
      isFarmer ? (lat + jitter(index, 1)).toFixed(7) : null,
      isFarmer ? (lng + jitter(index, 2)).toFixed(7) : null,
      role,
      passwordHash,
      person.about || null,
      extra.isVerified ? 1 : 0,
      extra.verificationStatus || "Not Submitted",
      extra.verificationDocument || null,
      extra.submittedAt || null,
      extra.reviewedBy || null,
      extra.reviewedAt || null,
      extra.createdAt,
      extra.createdAt,
    ]
  );
  return result.insertId;
}

async function findOrCreateConversation(conn, conversations, listing, buyerId, createdAt) {
  const key = `${listing.id}:${buyerId}`;
  if (!conversations[key]) {
    const [result] = await conn.query(
      "INSERT INTO conversations (listing_id, farmer_id, buyer_id, created_at, farmer_last_read_at, buyer_last_read_at) VALUES (?, ?, ?, ?, ?, ?)",
      [listing.id, listing.farmerId, buyerId, createdAt, createdAt, createdAt]
    );
    conversations[key] = result.insertId;
  }
  return conversations[key];
}

async function addMessage(conn, conversationId, senderId, listingId, text, at) {
  await conn.query(
    "INSERT INTO messages (conversation_id, sender_id, message, listing_id, created_at) VALUES (?, ?, ?, ?, ?)",
    [conversationId, senderId, text, listingId, at]
  );
}

const pickPhoto = (pool, n) => (pool && pool.length ? pool[n % pool.length] : null);

async function seed(conn) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const documents = installSeedFiles();
  const photos = await installSeedPhotos();
  const ids = {};

  for (const [i, person] of STAFF.entries()) {
    ids[person.key] = await insertUser(conn, person, "mao_staff", passwordHash, { createdAt: daysAgo(300 - i) });
  }
  // Takes turns among the staff who handle that kind of review.
  const reviewerId = (kind, n) => {
    const reviewers = reviewersFor(kind);
    return ids[reviewers[n % reviewers.length].key];
  };

  for (const [i, farmer] of FARMERS.entries()) {
    const status = farmer.verification || "Approved";
    const createdAt = daysAgo(240 - i * 2);
    ids[farmer.key] = await insertUser(conn, farmer, "farmer", passwordHash, {
      createdAt,
      isVerified: status === "Approved",
      verificationStatus: status,
      verificationDocument:
        status === "Not Submitted" || !documents.verificationDocumentFor ? null : await documents.verificationDocumentFor(farmer),
      submittedAt: status === "Not Submitted" ? null : daysAgo(235 - i * 2),
      reviewedBy: status === "Approved" ? reviewerId("farmer", i) : null,
      reviewedAt: status === "Approved" ? daysAgo(233 - i * 2) : null,
    });
  }

  for (const [i, buyer] of BUYERS.entries()) {
    ids[buyer.key] = await insertUser(conn, buyer, "buyer", passwordHash, { createdAt: daysAgo(200 - i * 3) });
  }

  const listings = {};
  for (const [n, item] of LISTINGS.entries()) {
    const farmer = FARMERS.find((f) => f.key === item.farmer);
    const createdAt = daysAgo(item.days, 3);
    const reviewed = item.review === "mao" || item.status === "Rejected";
    const [result] = await conn.query(
      `INSERT INTO livestock_listings
        (farmer_id, livestock_type, category, breed, age, weight, price, quantity, unit, health_status, location,
         description, image_url, documents, status, review_note, reviewed_by, reviewed_at, views, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ids[item.farmer],
        item.type,
        getCategory(item.type),
        item.breed,
        item.age || null,
        item.weight || null,
        item.price,
        item.quantity,
        item.unit,
        getCategory(item.type) === "livestock" ? "Healthy" : null,
        buildAddress({ purok: farmer.purok, barangay: farmer.barangay }),
        item.description,
        pickPhoto(photos[photoTagFor(item)], n),
        getCategory(item.type) === "livestock" ? documents.listingDocuments || null : null,
        item.status || "Available",
        item.reviewNote || null,
        reviewed ? reviewerId(getCategory(item.type), n) : null,
        reviewed ? daysAgo(Math.max(item.days - 1, 0)) : null,
        item.status === "Draft" || item.status === "Pending" ? 0 : 8 + item.days * 3,
        createdAt,
      ]
    );
    listings[item.key] = { ...item, id: result.insertId, farmerId: ids[item.farmer] };
  }

  const conversations = {};

  for (const [i, deal] of DEALS.entries()) {
    const listing = listings[deal.listing];
    const buyerId = ids[deal.buyer];
    const startedAt = daysAgo(deal.days, 6);
    const listedAmount = Math.round(getPricePerQuantityUnit(listing) * deal.quantity * 100) / 100;
    const offerAt = daysAgo(deal.days, 4);
    const agreed = ["Confirmation", "Completed"].includes(deal.step) || deal.cancelReason;

    // What the agreed offer comes to; live-weight deals use the real
    // weight once the animals have been weighed at pickup.
    let amount = listedAmount;
    if (deal.unitPrice && agreed) {
      amount = listing.unit === "kg_live"
        ? deal.unitPrice * (deal.actualWeightKg || parseFloat(listing.weight) * deal.quantity)
        : deal.unitPrice * deal.quantity;
    }

    await conn.query(
      `INSERT INTO transactions
        (listing_id, farmer_id, buyer_id, amount, listed_amount, quantity, workflow_step, status,
         offer_unit_price, offer_pickup_date, offer_pickup_place, offer_payment, offer_by, offer_at,
         terms_agreed_at, actual_weight_kg, weighed_at, cancel_requested_at, cancel_reason, cancel_outcome, cancel_responded_at,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        listing.id,
        listing.farmerId,
        buyerId,
        amount,
        listedAmount,
        deal.quantity,
        deal.step,
        deal.status,
        deal.unitPrice || null,
        deal.unitPrice ? toDateOnly(daysAgo(deal.days - 3)) : null,
        deal.unitPrice ? PICKUP_PLACES[i % PICKUP_PLACES.length] : null,
        deal.payment || null,
        deal.offerBy ? (deal.offerBy === "buyer" ? buyerId : listing.farmerId) : null,
        deal.unitPrice ? offerAt : null,
        agreed ? daysAgo(deal.days, 2) : null,
        deal.actualWeightKg || null,
        deal.actualWeightKg ? daysAgo(Math.max(deal.days - 3, 0)) : null,
        deal.cancelReason ? daysAgo(deal.days - 1) : null,
        deal.cancelReason || null,
        deal.cancelReason ? "Approved" : null,
        deal.cancelReason ? daysAgo(deal.days - 1, -2) : null,
        startedAt,
        daysAgo(Math.max(deal.days - 3, 0)),
      ]
    );

    const conversationId = await findOrCreateConversation(conn, conversations, listing, buyerId, startedAt);
    const say = (who, text, at) => addMessage(conn, conversationId, who === "buyer" ? buyerId : listing.farmerId, listing.id, text, at);

    await say("buyer", `🤝 Ready to negotiate: ${deal.quantity} x ${listing.type} for ${peso(listedAmount)}. Let's agree on the details!`, startedAt);
    if (deal.unitPrice) {
      await say(deal.offerBy, `Offer: ${peso(deal.unitPrice)} per ${listing.unit === "kg_live" ? "kg" : listing.unit}, ${deal.payment.toLowerCase()}.`, offerAt);
    }
    if (agreed) {
      await say(deal.offerBy === "buyer" ? "farmer" : "buyer", `✅ Deal agreed — ${peso(amount)}.`, daysAgo(deal.days, 2));
    }
    if (deal.status === "Completed") {
      await say("buyer", "Received, thank you po! Very healthy animals.", daysAgo(Math.max(deal.days - 3, 0)));
    }
    if (deal.status === "Declined") {
      await say("farmer", "Sorry po, that's too low for weaned piglets. I can't go below ₱3,200.", daysAgo(deal.days, 1));
    }
    if (deal.cancelReason) {
      await say("farmer", deal.cancelReason, daysAgo(deal.days - 1));
    }
  }

  for (const inquiry of INQUIRIES) {
    const listing = listings[inquiry.listing];
    const buyerId = ids[inquiry.buyer];
    const startedAt = daysAgo(inquiry.days, 5);

    await conn.query(
      "INSERT INTO inquiries (listing_id, buyer_id, message, status, created_at) VALUES (?, ?, ?, ?, ?)",
      [listing.id, buyerId, inquiry.chat[0][1], inquiry.chat.length > 1 ? "Read" : "Unread", startedAt]
    );

    const conversationId = await findOrCreateConversation(conn, conversations, listing, buyerId, startedAt);
    for (const [n, [who, text]] of inquiry.chat.entries()) {
      await addMessage(conn, conversationId, who === "buyer" ? buyerId : listing.farmerId, listing.id, text, daysAgo(inquiry.days, 5 - n));
    }
  }

  for (const [buyer, listing] of FAVORITES) {
    await conn.query("INSERT INTO favorites (buyer_id, listing_id) VALUES (?, ?)", [ids[buyer], listings[listing].id]);
  }

  return {
    users: FARMERS.length + BUYERS.length + STAFF.length,
    listings: LISTINGS.length,
    deals: DEALS.length,
    chats: Object.keys(conversations).length,
  };
}

async function main() {
  assertLocalDatabase();
  const mode = process.argv.includes("--reset") ? "reset" : process.argv.includes("--clean") ? "clean" : "seed";
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    if (mode === "clean" || mode === "reset") {
      const removed = await clean(conn);
      console.log(`Removed ${removed} sample account(s) and everything linked to them.`);
    }

    if (mode === "seed" || mode === "reset") {
      if ((await getSeedUserIds(conn)).length > 0) {
        console.log("Sample data is already there. Run with --reset to replace it, or --clean to remove it.");
        await conn.rollback();
        return;
      }

      const counts = await seed(conn);
      console.log(`Added ${counts.users} accounts, ${counts.listings} listings, ${counts.deals} deals and ${counts.chats} chats.`);
      console.log(`\nAll sample accounts use the password: ${SEED_PASSWORD}`);
      console.log(`  MAO staff: ${STAFF.slice(0, 3).map(seedEmail).join(", ")} … (${STAFF.length} in all)`);
      console.log(`  Farmers:   ${FARMERS.slice(0, 3).map(seedEmail).join(", ")} … (${FARMERS.length} in all)`);
      console.log(`  Buyers:    ${BUYERS.slice(0, 3).map(seedEmail).join(", ")} … (${BUYERS.length} in all)`);
      console.log("  Every sample email ends in @" + SEED_DOMAIN + " — see the Users page for the full list.");
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    if (error.code === "ER_BAD_FIELD_ERROR" || error.code === "ER_NO_SUCH_TABLE") {
      console.error(`${error.sqlMessage}\nYour database is missing a migration — apply everything in backend/migrations first.`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    conn.release();
    await db.end();
  }
}

main();
