# Automated Hip-Hop Knowledge Graph Agent Loop

Decision: use automated mode.

The Hip-Hop Intelligence Engine should not depend on manual script runs forever. The system should be designed so an agent loop, n8n workflow, GitHub Action, or cron job can regularly move records from raw YouTube ingestion into the strict Knowledge Graph.

## Current Airtable Base

Base: `APIFY and Key Data`
Base ID: `appAUjHxxhLjuVy1k`

## Tables

### Youtube Data
Table ID: `tblc2gu7PzmHsWAFm`

Role: raw ingestion layer.

Important fields:
- Name: `fldqY6CDv3hMrOCB0`
- Channel URL: `fldHi0g7Z9J4BkwWf`
- Video URL: `fldJfaGKvnQRDNo1B`
- YouTube Handle: `fldT4IuPgHOq3XHq7`
- View Count: `fldfwcyoBbzUP3evG`
- Lead Type: `fldB1ifz6ztAte3Rq`
- Opportunity Type: `fld5yIoyzByYXAYkG`
- Raw Source JSON: `fldzd09HgyqzkCunp`
- Transcript: `fldG1SMq8uwuRdB1z`
- Thumbnail URL: `fldh9hlkQxTPRM08V`

### Hip Hop Knowledge Graph
Table ID: `tblL5kVUo7sSORNjr`

Role: canonical intelligence layer.

Important fields:
- Entity Name: `fldDLClUcTy8PV38d`
- Entity Type: `fldhewJ7hPGWnGG6z`
- Era: `fld03gssjYfejnyrR`
- Region: `fldWgLYw7Aj1ELcly`
- Summary: `flddIv6LWfEPAhgMz`
- Deep Context: `fldOzByji6PYzjeU3`
- Key Relationships: `fldVDCAY1WOIE3dRo`
- Timeline Moments: `fldn50EoANe3FWb66`
- Business Lesson: `fldp8d33KsRPnZM8U`
- Cultural Lesson: `fldnX84JZoVcABlPJ`
- Quiz Seeds: `fldbgSJDKiTrHT9ws`
- Source URLs: `fldfKxQiacrubYb8H`
- Source Airtable Record IDs: `fldokYwPl1IpO0TEx`
- Fact Status: `fldDzKcev61uarKjs`
- Confidence Score: `fld9TWym64QFfZm25`
- Tags: `fldfCx56MMBTm7UIC`
- Raw Intelligence JSON: `fldPyMMPSKwwR7vZV`

## Automation Goal

Run a recurring extractor that:

1. Finds YouTube Data rows with transcript present.
2. Skips records already processed.
3. Sends transcript + metadata to an extraction model.
4. Extracts canonical entities.
5. Upserts entities into `Hip Hop Knowledge Graph` using `Entity Name` as the merge key.
6. Appends source URL and Airtable record ID without overwriting existing richer data.
7. Preserves raw structured JSON.
8. Produces clean logs for review.

## Required New Fields on Youtube Data

Add these fields to Youtube Data if not already present:

- KG Processing Status: single select
  - New
  - Ready
  - Processing
  - Processed
  - Needs Review
  - Error

- KG Last Processed At: dateTime
- KG Extracted Entity Count: number
- KG Error: multiline text

These fields make the workflow resumable and safe.

## Recommended Automation Architecture

### Option 1: n8n every 30–60 minutes

Trigger:
- Cron schedule

Steps:
1. Airtable search: Youtube Data where Transcript is not empty and KG Processing Status is New/Ready/blank.
2. Limit to 5–10 records per run.
3. Mark each record Processing.
4. Run extractor function/model.
5. Upsert into Knowledge Graph.
6. Mark source record Processed.
7. If failure, mark Error and write KG Error.

### Option 2: GitHub Action cron

Create:
`.github/workflows/extract-knowledge-graph.yml`

Schedule:
- every 6 hours for conservative mode
- hourly once stable

Run:
`node scripts/extract-youtube-to-knowledge-graph.mjs --limit=10`

Secrets needed:
- AIRTABLE_TOKEN
- AIRTABLE_BASE_ID
- OPENAI_API_KEY or model provider key

### Option 3: Local agent loop

Use while testing:

`node scripts/extract-youtube-to-knowledge-graph.mjs --limit=5 --dry-run`

Then:

`node scripts/extract-youtube-to-knowledge-graph.mjs --limit=5 --write`

## Extractor Script Requirements

Create:
`scripts/extract-youtube-to-knowledge-graph.mjs`

CLI flags:
- `--limit=10`
- `--dry-run`
- `--write`
- `--record=recXXXXXXXXXXXXXX`
- `--status=Ready`

Safety rules:
- dry-run by default
- never overwrite stronger existing fields with weaker extracted data
- append sources, do not replace sources
- one canonical row per entity
- if unsure, mark Fact Status as Needs Verification
- first-hand interview claims should be marked First-hand Account, not Verified
- rumors stay Rumor unless confirmed by strong external sources

## Entity Extraction JSON Schema

The model should return only valid JSON:

```json
{
  "source": {
    "airtable_record_id": "",
    "video_url": "",
    "channel": "",
    "title": "",
    "published_at": ""
  },
  "entities": [
    {
      "entity_name": "",
      "entity_type": "Artist | DJ | Producer | Executive | Label | Crew | Place | Event | Album | Song | Business Concept | Cultural Movement | Source",
      "era": "",
      "region": "",
      "summary": "",
      "deep_context": "",
      "key_relationships": [],
      "timeline_moments": [],
      "business_lesson": "",
      "cultural_lesson": "",
      "quiz_seeds": [],
      "source_urls": [],
      "fact_status": "Verified | Widely Reported | First-hand Account | Needs Verification | Disputed | Rumor",
      "confidence_score": 1,
      "tags": [],
      "raw_evidence_notes": []
    }
  ]
}
```

## Suggested Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "kg:extract:dry": "node scripts/extract-youtube-to-knowledge-graph.mjs --dry-run --limit=5",
    "kg:extract:write": "node scripts/extract-youtube-to-knowledge-graph.mjs --write --limit=5",
    "kg:extract:single": "node scripts/extract-youtube-to-knowledge-graph.mjs --dry-run --record=RECORD_ID"
  }
}
```

## First Automation Sprint

1. Add KG processing fields to Youtube Data.
2. Build extractor script with dry-run default.
3. Run dry-run on 3 records.
4. Review extracted entities manually.
5. Run write mode on 3 records.
6. Confirm Knowledge Graph rows are clean.
7. Only then increase limit to 10–25 records per run.

## Do Not Build Yet

No app UI.
No quiz game UI.
No visual graph UI.
No frontend.

Only ingestion, extraction, normalization, upsert, and review loops.
