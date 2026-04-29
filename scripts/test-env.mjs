import "dotenv/config";

const requiredEnvVars = [
  "APIFY_TOKEN",
  "APIFY_DATASET_ID",
  "AIRTABLE_API_KEY",
  "AIRTABLE_BASE_ID",
  "AIRTABLE_TABLE_ID",
];

let missingCount = 0;

console.log("Environment variable check:");

for (const key of requiredEnvVars) {
  const isPresent = Boolean(process.env[key]?.trim());
  if (!isPresent) {
    missingCount += 1;
  }

  console.log(`${key}: ${isPresent ? "present" : "missing"}`);
}

if (missingCount > 0) {
  console.log(`\nMissing ${missingCount} required environment variable(s).`);
  process.exitCode = 1;
} else {
  console.log("\nAll required environment variables are present.");
}
