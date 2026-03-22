/**
 * Query all records from the FortiDocsAudit smart contract.
 * Usage: npx hardhat run scripts/query.js --network ganache
 */
const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    console.log("No contract deployed. Run deploy.js first.");
    return;
  }

  const FortiDocsAudit = await hre.ethers.getContractAt("FortiDocsAudit", contractAddress);

  // ── Version Logs ─────────────────────────────────────────
  const versionCount = await FortiDocsAudit.getVersionLogCount();
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  📜 VERSION LOGS: ${versionCount} record(s)`);
  console.log(`══════════════════════════════════════════════\n`);

  for (let i = 0; i < versionCount; i++) {
    const v = await FortiDocsAudit.getVersionLog(i);
    console.log(`  Version Log #${i}`);
    console.log(`  ├─ File Hash   : ${v.fileHash.substring(0, 32)}…`);
    console.log(`  ├─ Previous CID: ${v.previousCid || "(none — first version)"}`);
    console.log(`  ├─ New CID     : ${v.newCid}`);
    console.log(`  ├─ Editor      : ${v.editor}`);
    console.log(`  ├─ Version     : ${v.version.toString()}`);
    console.log(`  └─ Timestamp   : ${new Date(Number(v.timestamp) * 1000).toLocaleString()}`);
    console.log();
  }

  // ── Share Logs ───────────────────────────────────────────
  const shareCount = await FortiDocsAudit.getShareLogCount();
  console.log(`══════════════════════════════════════════════`);
  console.log(`  🔗 SHARE LOGS: ${shareCount} record(s)`);
  console.log(`══════════════════════════════════════════════\n`);

  for (let i = 0; i < shareCount; i++) {
    const s = await FortiDocsAudit.getShareLog(i);
    console.log(`  Share Log #${i}`);
    console.log(`  ├─ Recipient : ${s.recipient}`);
    console.log(`  ├─ CID       : ${s.cid}`);
    console.log(`  ├─ Action    : ${s.action}`);
    console.log(`  └─ Timestamp : ${new Date(Number(s.timestamp) * 1000).toLocaleString()}`);
    console.log();
  }

  if (versionCount === 0n && shareCount === 0n) {
    console.log("  No records yet. Save or share a document to create blockchain entries.\n");
  }
}

main().catch(console.error);
