# FortiDocs

**FortiDocs** is a blockchain-assisted secure document editing and sharing platform. It combines a React-based editor, a Node.js/Express backend, MongoDB for metadata persistence, IPFS via Pinata for decentralized document storage, and an Ethereum smart contract for immutable audit logging.

---

## 📘 Project Abstract

FortiDocs is designed to provide a safer way to create, store, edit, and share documents in collaborative environments. The system focuses on four main goals:

- **Confidentiality** through document encryption and protected key handling
- **Integrity** through version tracking and SHA-256 content hashing
- **Controlled sharing** using owner-based and permission-based access control
- **Auditability** using blockchain logs for document version events

This project demonstrates how modern web technologies and blockchain can be combined to build a secure document workflow for academic or enterprise-style use cases.

---

## 🏗️ Architecture

FortiDocs follows a multi-layer architecture:

### 1. Frontend
- Built with **React**
- Provides login/register flows, editor interface, viewer pages, inbox/received pages, and sharing UI
- Communicates with the backend through REST APIs using `axios`

### 2. Backend API
- Built with **Node.js + Express**
- Handles authentication, file storage metadata, versioning, sharing permissions, logging, and document retrieval
- Uses **JWT** for protected routes

### 3. Database Layer
- **MongoDB** stores users, files, access control records, activity logs, and document versions

### 4. Decentralized Storage
- **Pinata/IPFS** stores document payloads and version content using immutable CIDs

### 5. Blockchain Audit Layer
- **Solidity smart contract** (`FortiDocsAudit.sol`) stores tamper-resistant version/share audit records
- **Hardhat** is used for compile/deploy/test workflows

### High-Level Flow
1. A user registers and logs in.
2. The user creates or edits a document in the browser.
3. The content is saved locally or uploaded to IPFS.
4. Metadata and access information are saved in MongoDB.
5. New versions are hashed and optionally logged on-chain.
6. Shared users can open documents according to their permissions.

---

## ✨ Core Functionality

- **User registration and login**
  - Email/password authentication
  - JWT-protected API access
  - Wallet-signature support for enhanced verification

- **Secure document editing**
  - Rich-text document editing in the frontend
  - Save locally or save to the cloud

- **Encrypted storage workflow**
  - AES-based content encryption for documents
  - Server-side protected key handling for authorized viewing

- **Document sharing**
  - Share files with other users by email
  - Permission control with `VIEW` and `EDIT`

- **Version history**
  - Every edit can produce a new document version
  - Each version tracks CID, editor, timestamp, and hash

- **Activity logging**
  - Logs key user actions such as open, save, share, revoke, and version creation

- **Blockchain audit trail**
  - Smart contract records version and sharing events for tamper-resistant verification

---

## 📂 Directory Structure

```text
fortidocs-document-editor/
├── backend/
│   ├── middleware/         # JWT auth middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints (auth, docs, files, logs, sharing, keys)
│   ├── services/           # Pinata, blockchain, email, crypto helpers
│   ├── uploads/            # Temporary uploaded files
│   ├── package.json
│   └── server.js           # Express app entry point
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # Ribbon and UI components
│   │   ├── pages/          # Login, Register, Editor, Viewer, Received pages
│   │   └── utils/          # API and crypto helpers
│   └── package.json
│
├── blockchain/
│   ├── contracts/          # Solidity smart contracts
│   ├── scripts/            # Deployment/query scripts
│   ├── hardhat.config.js
│   └── package.json
│
└── docs/                   # Supporting project documentation
```

---

## 🔌 Main API Areas

- ` /api/auth ` — register, login, nonce, signature verification
- ` /api/doc ` — save, view, edit, version history, log actions
- ` /api/files ` — upload, list owned files, delete files
- ` /api/share ` — share documents, sent list, received list, revoke access
- ` /api/logs ` — fetch activity logs
- ` /api/keys ` — manage user encryption public keys

---

## ⚙️ Prerequisites

Before running the project, make sure you have:

- **Node.js** (v18+ recommended)
- **npm**
- **MongoDB** running locally or remotely
- **Ganache** or another Ethereum RPC endpoint for local blockchain testing
- **MetaMask** (recommended for wallet-related flows)
- A valid **Pinata JWT** for IPFS uploads

---

## 🔐 Backend Environment Variables

Create a `backend/.env` file with values similar to the following:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/fortidocs
JWT_SECRET=your_jwt_secret_here
PINATA_JWT=your_pinata_jwt_here
RPC_URL=http://127.0.0.1:7545
OWNER_PRIVATE_KEY=your_wallet_private_key_here
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

> `CONTRACT_ADDRESS` is updated after deploying the smart contract.

---

## 🚀 Installation and Execution Steps

### 1) Clone the repository
```bash
git clone https://github.com/Chaitanya6207/fortidocs-document-editor.git
cd fortidocs-document-editor
```

### 2) Install backend dependencies
```bash
cd backend
npm install
```

### 3) Install frontend dependencies
```bash
cd ../frontend
npm install
```

### 4) Install blockchain dependencies
```bash
cd ../blockchain
npm install
```

### 5) Compile and deploy the smart contract
Make sure Ganache is running first.

```bash
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network ganache
```

### 6) Start the backend server
```bash
cd ../backend
npm run dev
```

Backend runs at:
- `http://localhost:5000`

### 7) Start the frontend application
Open a new terminal:

```bash
cd frontend
npm start
```

Frontend runs at:
- `http://localhost:3000`

---

## 🧪 Useful Commands

| Area | Command | Purpose |
|------|---------|---------|
| Backend | `npm run dev` | Start backend with nodemon |
| Backend | `npm start` | Start backend normally |
| Frontend | `npm start` | Run React development server |
| Frontend | `npm run build` | Create production build |
| Frontend | `npm test` | Run frontend tests |
| Blockchain | `npm run compile` | Compile smart contracts |
| Blockchain | `npm run deploy` | Deploy contract to Ganache |
| Blockchain | `npm test` | Run Hardhat tests |

---

## 👤 Typical Usage Flow

1. Register a new account.
2. Log in to receive a JWT session.
3. Open the editor and create or modify content.
4. Save the document locally or to cloud/IPFS.
5. Share the file with another user using email-based access.
6. Open document history and view version metadata.
7. Verify version/share events through logs and blockchain records.

---

## 🛠️ Technology Stack

- **Frontend:** React, React Router, Axios, React Quill
- **Backend:** Node.js, Express, Mongoose, JWT, bcrypt
- **Database:** MongoDB
- **Storage:** Pinata + IPFS
- **Blockchain:** Solidity, Hardhat, Ethers.js
- **Security:** AES encryption, wallet-based key workflows, JWT auth

---

## 📌 Notes

- The frontend API helper points to `http://localhost:5000`.
- Blockchain logging is optional but recommended for the full FortiDocs workflow.
- IPFS uploads require a valid Pinata token in the backend environment.

---

## 📄 License

This project is intended for academic/project demonstration use unless otherwise specified by the repository owner.
