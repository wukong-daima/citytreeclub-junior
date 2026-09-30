import { readFileSync, writeFileSync } from "node:fs";

// Only resource identifiers are written. API credentials remain in CI secrets.
const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
const bucket = process.env.CLOUDFLARE_R2_BUCKET || "citytreeclub-junior-photos";
if (
  !databaseId ||
  !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(databaseId) ||
  databaseId === "00000000-0000-4000-8000-000000000000"
) {
  throw new Error("Set CLOUDFLARE_DATABASE_ID to your real D1 database UUID.");
}
if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
  throw new Error("CLOUDFLARE_R2_BUCKET must be a valid R2 bucket name.");
}
const config = JSON.parse(
  readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
);
config.name = "citytreeclub-junior";
config.workers_dev = true;
config.d1_databases = [
  {
    binding: "DB",
    database_name: "citytreeclub-junior",
    database_id: databaseId,
    migrations_dir: "drizzle",
  },
];
config.r2_buckets = [{ binding: "BUCKET", bucket_name: bucket }];
writeFileSync(
  new URL("../wrangler.production.json", import.meta.url),
  JSON.stringify(config, null, 2) + "\n",
);
console.log(
  "Production resource configuration prepared (no credentials written).",
);
