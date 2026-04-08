# FortiDocs — Work Division (3 Members)

**Total Project:** ~7,600 lines across 42 files

---

## Member 1 — Frontend: Editor & UI Components (~2,500 lines)

| File | Lines | Description |
|---|---|---|
| **Editor.jsx** | ~1,400 | Full document editor (Quill, multi-page, encryption, sharing modal) |
| **InsertRibbon.jsx** | ~670 | Tables, shapes, symbols, header/footer |
| **HomeRibbon.jsx** | ~520 | Clipboard, fonts, find/replace |
| **Ribbon.jsx** | ~45 | Tab navigation |
| **FileRibbon.jsx** | ~75 | Save, export, print, share buttons |
| **App.js / App.css / index.js / index.css** | ~147 | App shell & styling |

**Owns:** Rich text editor, toolbar UI, page formatting, client-side share modal

---

## Member 2 — Backend: API, Auth & Encryption (~2,500 lines)

| File | Lines | Description |
|---|---|---|
| **routes/doc.js** | ~550 | Save, view, edit, versions, change detection |
| **routes/auth.js** | ~170 | Register, login, nonce, wallet signature |
| **routes/share.js** | ~200 | Share, revoke, sent/received lists |
| **routes/files.js** | ~85 | Upload, list, delete |
| **routes/keys.js** | ~55 | Store/retrieve encryption keys |
| **routes/logs.js** | ~55 | Activity logging |
| **routes/received.js** | ~60 | Received shares |
| **services/serverCrypto.js** | ~90 | AES-256-GCM server-side encryption |
| **services/email.js** | ~40 | Email notifications |
| **services/pinata.js** | ~15 | IPFS pinning |
| **All 5 models** | ~132 | User, File, FileAccess, DocumentVersion, ActivityLog |
| **server.js + middleware/auth.js** | ~45 | Express setup, JWT middleware |
| **utils/api.js** | ~15 | Axios client config |

**Owns:** All REST APIs, database models, server encryption, IPFS integration, authentication

---

## Member 3 — Blockchain, Crypto & Frontend Pages (~2,600 lines)

| File | Lines | Description |
|---|---|---|
| **FortiDocsAudit.sol** | ~185 | Smart contract (version + share audit trail) |
| **scripts/deploy.js** | ~35 | Contract deployment |
| **scripts/query.js** | ~85 | On-chain data querying |
| **hardhat.config.js** | ~20 | Hardhat setup |
| **services/chain.js** | ~65 | Blockchain integration service |
| **utils/crypto.js** | ~125 | Client-side AES + wallet encryption |
| **Login.jsx** | ~200 | Login page |
| **Register.jsx** | ~230 | Registration page |
| **MyFiles.jsx** | ~280 | File list + activity logs |
| **Inbox.jsx** | ~195 | Incoming shared files |
| **Sent.jsx** | ~245 | Outgoing shared files |
| **Received.jsx** | ~280 | Received files view |
| **Viewer.jsx** | ~215 | Read-only / editable document viewer |
| **LayoutRibbon.jsx** | ~330 | Margins, page setup |
| **ViewRibbon.jsx** | ~280 | Zoom, view modes, stats |

**Owns:** Smart contract, blockchain audit logging, client encryption, all secondary pages, viewer

---

## Summary

| Member | Domain | ~Lines | Effort |
|---|---|---|---|
| **Member 1** | Frontend: Editor & Toolbars | ~2,500 | High (complex editor logic) |
| **Member 2** | Backend: APIs, DB & Encryption | ~2,500 | High (security + IPFS + all routes) |
| **Member 3** | Blockchain, Crypto & Pages | ~2,600 | Moderate-High (breadth across layers) |
