# Strict Knowledge Graph Extractor

We are using the strict identity model.

That means one canonical row per entity in Airtable:

- Nas = one row
- Illmatic = one row
- Queensbridge = one row
- Def Jam = one row
- The Tunnel = one row

YouTube videos, transcripts, interviews, and Apify records are sources. They do not become the main knowledge record unless the source itself is historically important.

## Airtable Tables

### Youtube Data
Raw ingestion layer.

Purpose:
- store raw JSON
- transcript
- thumbnail
- video metadata
- classification fields

### Hip Hop Knowledge Graph
Canonical intelligence layer.

Purpose:
- store people, places, labels, songs, albums, events, crews, concepts
- store source-backed summaries
- store relationships
- store quiz seeds
- store verification status
- store confidence score
- store raw structured intelligence JSON

## Extraction Logic

For each Youtube Data record with a transcript:

1. Read transcript and metadata.
2. Extract entities:
   - Artists
   - DJs
   - Producers
   - Executives
   - Labels
   - Crews
   - Places
   - Events
   - Albums
   - Songs
   - Business Concepts
   - Cultural Movements
3. Normalize names.
4. Upsert each entity into Hip Hop Knowledge Graph by Entity Name.
5. Never create duplicate entity rows for the same canonical identity.
6. Append source references to existing entities.
7. Add relationships as plain text first.
8. Later, migrate relationships into a dedicated edge table.

## Airtable Field Map

Base:
`appAUjHxxhLjuVy1k`

Youtube Data:
`tblc2gu7PzmHsWAFm`

Hip Hop Knowledge Graph:
`tblL5kVUo7sSORNjr`

### Hip Hop Knowledge Graph Fields

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

## First Build Task

Create a script:

`scripts/extract-youtube-to-knowledge-graph.mjs`

The script should:

- read Airtable env vars
- fetch Youtube Data rows where Transcript is not empty
- process records in dry-run mode by default
- use a strict schema for entity extraction
- upsert into Hip Hop Knowledge Graph using Entity Name
- preserve source Airtable record ID
- preserve source video URL
- preserve source channel
- avoid overwriting richer existing data
- batch writes in groups of 10
- print summary:
  - records scanned
  - entities extracted
  - entities created
  - entities updated
  - duplicates skipped
  - errors

## Future Edge Table

After the first entity table is stable, add a second table:

`Hip Hop Relationships`

Fields:
- Relationship Name
- Source Entity
- Target Entity
- Relationship Type
- Evidence
- Source URL
- Source Record ID
- Fact Status
- Confidence Score

This will power the real graph later.
