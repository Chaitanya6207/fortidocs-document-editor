// backend/services/chain.js
const { ethers } = require('ethers');

async function logShareOnChain(ownerPrivateKey, contractAddress, rpcUrl, recipientAddress, cid, action='SHARE') {
  if (!ownerPrivateKey || !contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    console.warn('Chain logging not configured (missing ownerPrivateKey or contractAddress)');
    return null;
  }
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(ownerPrivateKey, provider);
  const abi = ["function logShare(address recipient, string cid, string action) external"];
  const contract = new ethers.Contract(contractAddress, abi, wallet);
  const tx = await contract.logShare(recipientAddress, cid, action);
  const receipt = await tx.wait();
  return receipt;
}

/**
 * Log a new document version on the blockchain.
 * Records: fileHash, previousVersionHash, editor wallet, version number, timestamp.
 */
async function logVersionOnChain(ownerPrivateKey, contractAddress, rpcUrl, {
  fileHash,
  previousCid,
  editorWallet,
  version,
  cid,
}) {
  if (!ownerPrivateKey || !contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    console.warn('Chain logging not configured — skipping version log');
    return null;
  }
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(ownerPrivateKey, provider);
    const abi = [
      "function logVersion(string fileHash, string previousCid, string newCid, address editor, uint256 version) external"
    ];
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    const tx = await contract.logVersion(
      fileHash,
      previousCid || "",
      cid,
      editorWallet || ethers.constants.AddressZero,
      version
    );
    const receipt = await tx.wait();
    return receipt;
  } catch (err) {
    console.error('logVersionOnChain error:', err.message);
    return null;
  }
}

module.exports = { logShareOnChain, logVersionOnChain };
