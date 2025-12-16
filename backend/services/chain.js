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

module.exports = { logShareOnChain };
