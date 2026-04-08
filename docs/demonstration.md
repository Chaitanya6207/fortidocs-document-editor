# FortiDocs — Panel Demonstration Guide

## Demo Flow: Share a File and Show What Happens

### Step 1: Create & Save a Document
- Open **http://localhost:3000**, log in, type some content in the editor, click **Save to Cloud**.

### Step 2: Share the Document
- Click **Share** → enter recipient email → pick **VIEW** or **EDIT** → confirm.

### Step 3: Recipient Views / Edits
- Log in as the recipient → go to **Inbox** → click **View** → (if EDIT permission) make changes and save.

---

## What to Show the Panel at Each Layer

### A. MongoDB (use MongoDB Compass or `mongosh`)

Connect to `mongodb://127.0.0.1:27017/fortidocs` and run these queries:

| Collection | Query | What It Proves |
|---|---|---|
| **files** | `db.files.find({}, { filename:1, cid:1, currentVersion:1, accessList:1, encrypted:1 })` | File metadata, current IPFS pointer, who has access, encryption flag |
| **fileaccesses** | `db.fileaccesses.find({}, { recipientEmail:1, permission:1, serverEncryptedKey:1 })` | Per-recipient ACL with encrypted AES keys (one key per user) |
| **documentversions** | `db.documentversions.find({}, { version:1, cid:1, previousCid:1, fileHash:1, blockchainTxHash:1, editorWallet:1 })` | Version chain (v1→v2→v3), each with its own IPFS CID, SHA-256 hash, and blockchain tx hash |
| **activitylogs** | `db.activitylogs.find({}).sort({createdAt:1})` | Full timeline: SAVED_CLOUD → SHARED → OPENED → VERSIONED → EDITED etc. |

**Key things to highlight:**
- `serverEncryptedKey` — the AES key is **RSA-encrypted** per user, never stored in plaintext
- `previousCid` in versions — forms an **immutable chain** linking each version to its predecessor
- `blockchainTxHash` — proof that this version was also logged to Ganache

---

### B. IPFS / Pinata

Show the Pinata dashboard (**https://app.pinata.cloud**) → **Files** section:

- Each save creates a new **pinned file** with a unique CID
- Click a CID → show the stored JSON:
  ```json
  {
    "type": "encrypted-document",
    "encryptedContent": "U2FsdGVkX1+...",
    "createdAt": "2026-03-22T..."
  }
  ```
- **Key point:** Even if someone accesses IPFS directly, they only see encrypted gibberish — no plaintext content.

You can also fetch via gateway to prove it's real:
```
https://gateway.pinata.cloud/ipfs/<CID>
```

---

### C. Ganache (Blockchain)

**Option 1 — Query script** (best for demo):
```powershell
cd fortidocs-document-editor/blockchain
npx hardhat run scripts/query.js --network ganache
```
This prints all records neatly:
```
══════════════════════════════════════════════
  📜 VERSION LOGS: 2 record(s)
══════════════════════════════════════════════
  Version Log #0
  ├─ File Hash   : a3f2b8c9d1e4...
  ├─ Previous CID: (none — first version)
  ├─ New CID     : QmXy7z...
  ├─ Editor      : 0xABC...
  ├─ Version     : 1
  └─ Timestamp   : 3/22/2026, 10:30:00 AM

  Version Log #1
  ├─ File Hash   : e7d1f3a0b5c8...
  ├─ Previous CID: QmXy7z...
  ├─ New CID     : QmPq9r...
  ├─ Editor      : 0xDEF...
  ├─ Version     : 2
  └─ Timestamp   : 3/22/2026, 10:45:00 AM
```

**Option 2 — Ganache UI:** Open the Ganache desktop app → **Transactions** tab → click on any transaction to see the contract call details and gas used.

**Key points to highlight:**
- `fileHash` — SHA-256 of the document, so you can **verify integrity** (recompute hash and compare)
- `previousCid → newCid` — forms an **on-chain version chain**
- `editor` — proves **who** made the edit
- `timestamp` — immutable proof of **when** it happened
- These records **cannot be altered or deleted** — that's the blockchain guarantee

---

### D. Frontend UI (What the User Sees)

| Screen | What to show |
|---|---|
| **Editor** | Share modal, page editing, "Saved to Cloud" toast |
| **My Files** | File list with version numbers, activity log sidebar |
| **Sent** | All files you've shared, with recipient emails and permissions |
| **Inbox** | Files shared with you, View/Edit buttons |
| **Viewer** | Read-only or editable view, version history dropdown |

---

## Summary: Where Each Piece Lives

```
┌─────────────────────────────────────────────────────────────┐
│                     WHAT'S STORED WHERE                      │
├──────────────┬──────────────────────────────────────────────┤
│   MONGODB    │ File metadata, access control (ACL),         │
│              │ encrypted AES keys, version records,         │
│              │ activity logs, user accounts                  │
├──────────────┼──────────────────────────────────────────────┤
│   IPFS       │ Encrypted document content (AES-256          │
│  (Pinata)    │ ciphertext) — one CID per version            │
├──────────────┼──────────────────────────────────────────────┤
│  BLOCKCHAIN  │ Immutable audit trail: file hash,            │
│  (Ganache)   │ version chain (prev→new CID), editor         │
│              │ wallet, version number, timestamp             │
├──────────────┼──────────────────────────────────────────────┤
│   CLIENT     │ AES encryption/decryption happens in         │
│  (Browser)   │ browser — server never sees plaintext keys   │
└──────────────┴──────────────────────────────────────────────┘
```

---

## Three Pillars for the Panel

1. **Security** — End-to-end AES-256 encryption + per-user RSA-encrypted keys + access control
2. **Integrity** — Blockchain audit trail + SHA-256 content hashing + IPFS content-addressing
3. **Decentralization** — IPFS storage via Pinata (no single point of failure for document content)
