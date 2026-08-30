# Document Verification — what it actually does today

`claims.parseDocument` (see `server/routers.ts`) runs three real, rule-based
checks on every uploaded claim document. It does **not** call an LLM or do
OCR/AI field extraction — that is an explicit next milestone, not something
this claims to do today.

1. **File-type validation.** Rejects anything that isn't a plausible claim
   document (PDF, JPG/JPEG/PNG/HEIC, DOC/DOCX). This is a real check that
   didn't exist before — previously any filename was accepted and always
   marked "VERIFIED."
2. **Duplicate-document detection.** If another verified document of the same
   type is already on the claim, the new upload is flagged `MISMATCH` with a
   message naming the existing file, instead of silently accepting a
   duplicate.
3. **Cross-reference against the claim's real asset record.** The response's
   `extractedFields` (provider, masked account number, asset type, nominee,
   value) are pulled from the actual, saved `assets` row tied to this claim —
   not fabricated or left null. This is genuinely correct data about the
   claim, sourced from the database, even though it isn't extracted from the
   document's actual content (no OCR is performed on the file itself).

## What this is not

This is not AI-based document parsing. No text is read out of the uploaded
file. If a judge asks "does it read the PDF and pull the account number out
of it," the honest answer is: not yet — today it validates the upload and
cross-checks it against your claim record; OCR/LLM-based extraction from the
document's actual content is the natural next step (`server/_core/llm.ts`
already has the request/response types scaffolded for this, but the platform
API key it originally pointed at — the old Manus `BUILT_IN_FORGE_API_URL`/
`BUILT_IN_FORGE_API_KEY` — was decommissioned in the self-hosted migration
and isn't wired to a live model provider).

## How to demo it live

- Upload a `.pdf` or image for a claim → shows **Verified**, with the real
  asset's provider/account/type/nominee visible.
- Upload the same document *type* twice on one claim (needs a real database,
  not the no-DB mock fallback) → the second one shows **Mismatch** with a
  message naming the duplicate.
- Upload a `.exe` or `.zip` → shows **Rejected** with a clear reason.

## Tests

`server/claims.parseDocument.test.ts` covers the reject and verify paths
against the mock data fallback (no live database needed to run them).
