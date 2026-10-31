// Puts a sample farmer's own name (and gender) on the sample ID image used
// by scripts/seed.js, so the ID MAO reviews matches the account. Positions
// are for scripts/seed-files/sample-id.jpg (1264 x 848).

const sharp = require("sharp");

// Where each value sits on the card: left edge, top, width and height of
// the text to replace, and how much width a new value may take.
const FIELDS = {
  fullName: { x: 593, y: 328, w: 408, h: 30, room: 425 },
  givenNames: { x: 593, y: 376, w: 158, h: 28, room: 400 },
  lastName: { x: 593, y: 423, w: 242, h: 28, room: 400 },
  middleName: { x: 593, y: 470, w: 102, h: 28, room: 400 },
  gender: { x: 593, y: 581, w: 100, h: 28, room: 115 },
};

const TEXT_COLOR = "#141414";
const FONT_SIZE = 25;
// A rough width of one bold capital at FONT_SIZE, to shrink long names.
const CHAR_WIDTH = 0.66;

const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Paints over the printed text inside a field: each pixel of the old
// letters takes the average colour of the untouched background in its own
// column, which follows the card's colour gradient instead of leaving a
// flat box.
function eraseText(pixels, width, channels, field) {
  const isDark = (i) => pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114 < 180;

  // Mark dark pixels first, then grow the mark by two pixels so the soft
  // edges of the old letters go too.
  const marked = new Set();
  for (let y = field.y; y < field.y + field.h; y++) {
    for (let x = field.x; x < field.x + field.w; x++) {
      if (isDark((y * width + x) * channels)) {
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) marked.add((y + dy) * width + (x + dx));
      }
    }
  }

  // Background colour around each column: the light, unmarked pixels in a
  // band of nearby columns, so the fill is smooth rather than streaky.
  const BAND = 8;
  const fillFor = {};
  for (let x = field.x - 2; x < field.x + field.w + 2; x++) {
    const sum = [0, 0, 0];
    let count = 0;
    for (let bx = x - BAND; bx <= x + BAND; bx++) {
      for (let y = field.y - 2; y < field.y + field.h + 2; y++) {
        const p = y * width + bx;
        if (marked.has(p) || isDark(p * channels)) continue;
        for (let c = 0; c < 3; c++) sum[c] += pixels[p * channels + c];
        count++;
      }
    }
    if (count) fillFor[x] = sum.map((s) => Math.round(s / count));
  }

  const fallback = Object.values(fillFor)[0] || [235, 235, 235];
  for (const p of marked) {
    const fill = fillFor[p % width] || fallback;
    for (let c = 0; c < 3; c++) pixels[p * channels + c] = fill[c];
  }
}

function textSvg(width, height, values) {
  const lines = Object.entries(values).map(([key, text]) => {
    const field = FIELDS[key];
    const size = Math.min(FONT_SIZE, Math.floor(field.room / (text.length * CHAR_WIDTH)));
    const baseline = field.y + field.h - 6;
    return `<text x="${field.x + 2}" y="${baseline}" font-size="${size}">${escapeXml(text)}</text>`;
  });
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <g font-family="Arial, Helvetica, sans-serif" font-weight="bold" fill="${TEXT_COLOR}">${lines.join("")}</g>
    </svg>`
  );
}

// person: { given, middle, last, gender } — writes the ID to outputPath.
async function makeIdCard(sourcePath, outputPath, person) {
  const { data, info } = await sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const field of Object.values(FIELDS)) eraseText(data, info.width, info.channels, field);

  const values = {
    fullName: `${person.last}, ${person.given} ${person.middle}`.toUpperCase(),
    givenNames: person.given.toUpperCase(),
    lastName: person.last.toUpperCase(),
    middleName: person.middle.toUpperCase(),
    gender: person.gender.toUpperCase(),
  };

  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .composite([{ input: textSvg(info.width, info.height, values) }])
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}

module.exports = { makeIdCard };
