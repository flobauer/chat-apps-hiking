import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import geohash from "ngeohash";

const precision = Number(process.argv[2] ?? 9);

if (!Number.isInteger(precision) || precision < 1 || precision > 12) {
  throw new Error("Geohash precision must be an integer between 1 and 12.");
}

const allToursPath = path.resolve(process.cwd(), "assets/all.json");
const rawContent = await readFile(allToursPath, "utf8");
const payload = JSON.parse(rawContent);

if (!payload?.data?.items || !Array.isArray(payload.data.items)) {
  throw new Error("assets/all.json does not have the expected data.items array.");
}

let updatedCount = 0;
let skippedCount = 0;

const items = payload.data.items.map((item) => {
  const [longitudeValue, latitudeValue] = item.coordinates ?? [];
  const longitude = Number(longitudeValue);
  const latitude = Number(latitudeValue);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    skippedCount += 1;
    return item;
  }

  updatedCount += 1;
  return {
    ...item,
    geohash: geohash.encode(latitude, longitude, precision),
  };
});

payload.data.items = items;

await writeFile(allToursPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Updated ${updatedCount} tours with geohash precision ${precision}.`);
if (skippedCount > 0) {
  console.log(`Skipped ${skippedCount} tours because their coordinates were invalid.`);
}