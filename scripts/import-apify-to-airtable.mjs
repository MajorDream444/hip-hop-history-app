import "dotenv/config";

const REQUIRED_ENV_VARS = [
  "APIFY_TOKEN",
  "APIFY_DATASET_ID",
  "AIRTABLE_API_KEY",
  "AIRTABLE_BASE_ID",
  "AIRTABLE_TABLE_ID",
];

const AIRTABLE_FIELDS = {
  name: "fldqY6CDv3hMrOCB0",
  notes: "fldoqTGtW0iyp7jQL",
  status: "fldFNgPBNEhzAbd7t",
  channelUrl: "fldHi0g7Z9J4BkwWf",
  videoUrl: "fldJfaGKvnQRDNo1B",
  youtubeHandle: "fldT4IuPgHOq3XHq7",
  subscriberCount: "fldd5A1Ni9FYpkgYx",
  viewCount: "fldfwcyoBbzUP3evG",
  niche: "fldJUSz7NQwMLs0DY",
  leadType: "fldB1ifz6ztAte3Rq",
  opportunityType: "fld5yIoyzByYXAYkG",
  rawSourceJson: "fldzd09HgyqzkCunp",
};

const PAGE_LIMIT = 1000;
const AIRTABLE_BATCH_SIZE = 10;

function requireEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function firstNonEmpty(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function asText(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item))
      .filter(Boolean)
      .join("\n\n");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function asNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeRecord(record) {
  const name = asText(firstNonEmpty(record, ["title", "videoTitle", "name"]));
  const description = asText(record.description);
  const transcript = asText(firstNonEmpty(record, ["transcript", "captions", "subtitles"]));
  const notes = [description, transcript].filter(Boolean).join("\n\n");
  const channelUrl = asText(
    firstNonEmpty(record, ["channelUrl", "ownerChannelUrl", "authorUrl"]),
  );
  const videoUrl = asText(firstNonEmpty(record, ["videoUrl", "url", "watchUrl", "link"]));
  const youtubeHandle = asText(
    firstNonEmpty(record, ["handle", "channelHandle", "author", "channelName"]),
  );
  const subscriberCount = asNumber(
    firstNonEmpty(record, ["subscriberCount", "subscribers", "channelSubscribers"]),
  );
  const viewCount = asNumber(firstNonEmpty(record, ["viewCount", "views", "videoViewCount"]));

  return {
    [AIRTABLE_FIELDS.name]: name ?? videoUrl ?? channelUrl ?? "Untitled hip-hop source",
    [AIRTABLE_FIELDS.notes]: notes || undefined,
    [AIRTABLE_FIELDS.status]: "Todo",
    [AIRTABLE_FIELDS.channelUrl]: channelUrl,
    [AIRTABLE_FIELDS.videoUrl]: videoUrl,
    [AIRTABLE_FIELDS.youtubeHandle]: youtubeHandle,
    [AIRTABLE_FIELDS.subscriberCount]: subscriberCount,
    [AIRTABLE_FIELDS.viewCount]: viewCount,
    [AIRTABLE_FIELDS.niche]: "Hip Hop",
    [AIRTABLE_FIELDS.leadType]: "Hip Hop Quiz Source",
    [AIRTABLE_FIELDS.opportunityType]: "App Research",
    [AIRTABLE_FIELDS.rawSourceJson]: JSON.stringify(record),
  };
}

function removeEmptyFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== ""),
  );
}

function dedupeKey(fields) {
  const videoUrl = fields[AIRTABLE_FIELDS.videoUrl];
  if (videoUrl) {
    return `video:${String(videoUrl).trim().toLowerCase()}`;
  }

  const channelUrl = fields[AIRTABLE_FIELDS.channelUrl];
  const name = fields[AIRTABLE_FIELDS.name];
  if (channelUrl && name) {
    return `channel-name:${String(channelUrl).trim().toLowerCase()}|${String(name)
      .trim()
      .toLowerCase()}`;
  }

  return undefined;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const responseText = await response.text();
  let payload;

  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = responseText;
  }

  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${detail}`);
  }

  return payload;
}

async function fetchApifyItems(offset) {
  const url = new URL(
    `https://api.apify.com/v2/datasets/${process.env.APIFY_DATASET_ID}/items`,
  );
  url.searchParams.set("token", process.env.APIFY_TOKEN);
  url.searchParams.set("format", "json");
  url.searchParams.set("clean", "true");
  url.searchParams.set("limit", String(PAGE_LIMIT));
  url.searchParams.set("offset", String(offset));

  return fetchJson(url);
}

function airtableRecordsUrl() {
  const baseId = encodeURIComponent(process.env.AIRTABLE_BASE_ID);
  const tableId = encodeURIComponent(process.env.AIRTABLE_TABLE_ID);
  return `https://api.airtable.com/v0/${baseId}/${tableId}`;
}

function airtableHeaders() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function fetchExistingDedupeKeys() {
  const existingKeys = new Set();
  let offset;

  do {
    const url = new URL(airtableRecordsUrl());
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("returnFieldsByFieldId", "true");
    url.searchParams.append("fields[]", AIRTABLE_FIELDS.videoUrl);
    url.searchParams.append("fields[]", AIRTABLE_FIELDS.channelUrl);
    url.searchParams.append("fields[]", AIRTABLE_FIELDS.name);
    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const payload = await fetchJson(url, {
      headers: airtableHeaders(),
    });

    for (const record of payload.records ?? []) {
      const key = dedupeKey(record.fields ?? {});
      if (key) {
        existingKeys.add(key);
      }
    }

    offset = payload.offset;
  } while (offset);

  return existingKeys;
}

async function createAirtableBatch(batch) {
  const url = new URL(airtableRecordsUrl());
  url.searchParams.set("returnFieldsByFieldId", "true");

  return fetchJson(url, {
    method: "POST",
    headers: airtableHeaders(),
    body: JSON.stringify({
      records: batch,
      typecast: true,
    }),
  });
}

async function importBatch(batch, stats) {
  try {
    const payload = await createAirtableBatch(batch);
    const importedCount = payload.records?.length ?? 0;
    stats.imported += importedCount;
    console.log(`records imported: ${stats.imported}`);
  } catch (error) {
    stats.failedBatches += 1;
    console.error(`failed batch ${stats.failedBatches}: ${error.message}`);
  }
}

async function main() {
  requireEnv();

  const stats = {
    fetched: 0,
    imported: 0,
    skippedDuplicates: 0,
    failedBatches: 0,
  };

  console.log("Loading existing Airtable dedupe keys...");
  const seenKeys = await fetchExistingDedupeKeys();
  console.log(`existing Airtable records indexed: ${seenKeys.size}`);

  let offset = 0;
  let pendingBatch = [];

  while (true) {
    console.log(`offset: ${offset}`);

    const items = await fetchApifyItems(offset);
    if (!Array.isArray(items)) {
      throw new Error("Apify dataset response was not an array.");
    }

    stats.fetched += items.length;
    console.log(`records fetched: ${items.length}`);

    for (const item of items) {
      const fields = removeEmptyFields(normalizeRecord(item));
      const key = dedupeKey(fields);

      if (key && seenKeys.has(key)) {
        stats.skippedDuplicates += 1;
        continue;
      }

      if (key) {
        seenKeys.add(key);
      }

      pendingBatch.push({ fields });

      if (pendingBatch.length === AIRTABLE_BATCH_SIZE) {
        await importBatch(pendingBatch, stats);
        pendingBatch = [];
      }
    }

    if (items.length < PAGE_LIMIT) {
      break;
    }

    offset += PAGE_LIMIT;
  }

  if (pendingBatch.length > 0) {
    await importBatch(pendingBatch, stats);
  }

  console.log("Import complete.");
  console.log(`final total fetched: ${stats.fetched}`);
  console.log(`final total imported: ${stats.imported}`);
  console.log(`final duplicate skips: ${stats.skippedDuplicates}`);
  console.log(`failed batches: ${stats.failedBatches}`);

  if (stats.failedBatches > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Importer failed: ${error.message}`);
  process.exitCode = 1;
});
