// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FortiDocsAudit
 * @notice Immutable on-chain audit trail for FortiDocs document management.
 *         Records document version history and share actions for tamper-proof auditing.
 */
contract FortiDocsAudit {
    address public owner;

    // ── Version Audit ──────────────────────────────────────────────
    struct VersionRecord {
        string  fileHash;      // SHA-256 hash of the document content
        string  previousCid;   // IPFS CID of the previous version
        string  newCid;        // IPFS CID of the new version
        address editor;        // wallet address of the editor
        uint256 version;       // version number (1, 2, 3, ...)
        uint256 timestamp;     // block timestamp
    }

    // ── Share Audit ────────────────────────────────────────────────
    struct ShareRecord {
        address recipient;     // wallet address of the recipient
        string  cid;           // IPFS CID of the shared document
        string  action;        // "SHARE", "REVOKE", etc.
        uint256 timestamp;     // block timestamp
    }

    VersionRecord[] public versionLogs;
    ShareRecord[]   public shareLogs;

    // ── Events ─────────────────────────────────────────────────────
    event VersionLogged(
        uint256 indexed logIndex,
        string  fileHash,
        string  previousCid,
        string  newCid,
        address indexed editor,
        uint256 version,
        uint256 timestamp
    );

    event ShareLogged(
        uint256 indexed logIndex,
        address indexed recipient,
        string  cid,
        string  action,
        uint256 timestamp
    );

    // ── Modifiers ──────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ── Core Functions ─────────────────────────────────────────────

    /**
     * @notice Log a new document version on-chain.
     * @param fileHash     SHA-256 hash of the document content
     * @param previousCid  IPFS CID of the previous version (empty for v1)
     * @param newCid       IPFS CID of the new version
     * @param editor       Wallet address of the user who edited
     * @param version      Version number
     */
    function logVersion(
        string calldata fileHash,
        string calldata previousCid,
        string calldata newCid,
        address editor,
        uint256 version
    ) external onlyOwner {
        uint256 idx = versionLogs.length;
        versionLogs.push(VersionRecord({
            fileHash:    fileHash,
            previousCid: previousCid,
            newCid:      newCid,
            editor:      editor,
            version:     version,
            timestamp:   block.timestamp
        }));

        emit VersionLogged(idx, fileHash, previousCid, newCid, editor, version, block.timestamp);
    }

    /**
     * @notice Log a share/revoke action on-chain.
     * @param recipient  Wallet address of the recipient
     * @param cid        IPFS CID of the shared document
     * @param action     Action type (e.g. "SHARE", "REVOKE")
     */
    function logShare(
        address recipient,
        string calldata cid,
        string calldata action
    ) external onlyOwner {
        uint256 idx = shareLogs.length;
        shareLogs.push(ShareRecord({
            recipient: recipient,
            cid:       cid,
            action:    action,
            timestamp: block.timestamp
        }));

        emit ShareLogged(idx, recipient, cid, action, block.timestamp);
    }

    // ── View Functions ─────────────────────────────────────────────

    /**
     * @notice Get total number of version log entries.
     */
    function getVersionLogCount() external view returns (uint256) {
        return versionLogs.length;
    }

    /**
     * @notice Get total number of share log entries.
     */
    function getShareLogCount() external view returns (uint256) {
        return shareLogs.length;
    }

    /**
     * @notice Get a specific version log entry by index.
     */
    function getVersionLog(uint256 index) external view returns (
        string memory fileHash,
        string memory previousCid,
        string memory newCid,
        address editor,
        uint256 version,
        uint256 timestamp
    ) {
        require(index < versionLogs.length, "Index out of bounds");
        VersionRecord storage v = versionLogs[index];
        return (v.fileHash, v.previousCid, v.newCid, v.editor, v.version, v.timestamp);
    }

    /**
     * @notice Get a specific share log entry by index.
     */
    function getShareLog(uint256 index) external view returns (
        address recipient,
        string memory cid,
        string memory action,
        uint256 timestamp
    ) {
        require(index < shareLogs.length, "Index out of bounds");
        ShareRecord storage s = shareLogs[index];
        return (s.recipient, s.cid, s.action, s.timestamp);
    }
}
