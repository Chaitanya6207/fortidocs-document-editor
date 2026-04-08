# Role of Blockchain in FortiDocs

## Purpose: Immutable Audit Logging

Blockchain in FortiDocs serves one specific purpose — creating a **tamper-proof, permanent record** of document activity. It does **not** store documents, manage access, or handle encryption.

---

## Smart Contract: `FortiDocsAudit.sol`

### Data Structures

- **VersionRecord** — stores document version history on-chain
- **ShareRecord** — stores share/revoke events on-chain

### Write Functions (owner-only)

| Function | Parameters | Purpose |
|----------|-----------|---------|
| `logVersion()` | fileHash, previousCid, newCid, editor, version | Records a document version with SHA-256 hash, IPFS CIDs, editor wallet, and version number |
| `logShare()` | recipient, cid, action | Records a share/revoke event with recipient address, IPFS CID, and action type |

### Read Functions (public)

| Function | Returns |
|----------|---------|
| `getVersionLogCount()` | Total number of version logs |
| `getShareLogCount()` | Total number of share logs |
| `getVersionLog(index)` | A specific version record |
| `getShareLog(index)` | A specific share record |

### Events

- `VersionLogged` — emitted on every version log
- `ShareLogged` — emitted on every share log

---

## What Gets Logged On-Chain

| User Action | Smart Contract Call | Data Recorded |
|-------------|-------------------|---------------|
| **Document created** (POST /api/doc/save) | `logVersion()` | SHA-256 content hash, IPFS CID, editor wallet, version 1 |
| **Document edited** (POST /api/doc/edit/:fileId) | `logVersion()` | Content hash, previous CID → new CID, editor wallet, version number |
| **Document shared** | `logShare()` | Recipient address, IPFS CID, action type (SHARE/REVOKE) |

> **Note:** `logShare()` exists in the smart contract but is not yet called from the backend routes. Sharing is currently logged only to the database ActivityLog.

---

## Data Flow

```
1. User saves/edits document
2. Content is hashed (SHA-256)
3. Content is encrypted (AES-256) and pinned to IPFS → returns CID
4. Backend calls logVersionOnChain() (non-blocking)
5. Smart contract appends to versionLogs[]
6. Transaction hash saved to DocumentVersion.blockchainTxHash in MongoDB
```

---

## What Blockchain Provides

- **Integrity proof** — SHA-256 hash can be recomputed and compared to verify content hasn't been altered
- **Edit traceability** — previousCid → newCid forms an immutable version chain
- **Editor attribution** — editor's wallet address is permanently recorded
- **Timestamp proof** — block timestamp proves when changes occurred, independent of the server

## What Blockchain Does NOT Do

- **Storage** — documents are stored on IPFS/Pinata, not on-chain
- **Access control** — managed by MongoDB FileAccess records
- **Encryption** — handled client-side (AES-256) and server-side (RSA key wrapping)
- **Key management** — encryption keys are never stored on-chain

---

## Backend Integration (`services/chain.js`)

Two functions connect the backend to the smart contract:

### `logVersionOnChain()`
```
Parameters: ownerPrivateKey, contractAddress, rpcUrl, fileHash, previousCid, editorWallet, version, newCid
Returns: transaction receipt with hash
```

### `logShareOnChain()`
```
Parameters: ownerPrivateKey, contractAddress, rpcUrl, recipientAddress, cid, action
Returns: transaction receipt with hash
```

Both functions gracefully degrade — if blockchain is not configured (missing private key or zero-address contract), they log a warning and return null without blocking the operation.

---

## Configuration

Required environment variables in `backend/.env`:

```
OWNER_PRIVATE_KEY=<hex private key>
CONTRACT_ADDRESS=<deployed contract address>
RPC_URL=<blockchain RPC endpoint>
```

Deployment via Hardhat automatically updates `CONTRACT_ADDRESS` in `.env`.
