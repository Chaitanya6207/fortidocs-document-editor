// backend/services/pinata.js
const pinataSDK = require('@pinata/sdk');
const fs = require('fs');
const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);

/**
 * Pin a file that is on disk (multer saves it to temp path)
 * returns { ipfsHash, ... }
 */
async function pinFileFromPath(filePath, originalName) {
  const readableStreamForFile = fs.createReadStream(filePath);
  const options = {
    pinataMetadata: { name: originalName },
    pinataOptions: { cidVersion: 1 }
  };
  const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
  // result.IpfsHash
  return result;
}

module.exports = { pinFileFromPath };
