// backend/services/pinata.js
// Pin files to Pinata using direct HTTP API with axios + form-data.
// Works with all Node versions and avoids @pinata/sdk issues.

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

if (!PINATA_API_KEY || !PINATA_API_SECRET) {
  console.warn("⚠️ Pinata API keys are missing in .env");
}

/**
 * Upload (pin) a local file to Pinata
 * @param {string} filePath - Location of the file saved by multer
 * @param {string} originalName - Original filename
 * @returns {Promise<{ IpfsHash: string, raw: object }>}
 */
async function pinFileFromPath(filePath, originalName) {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), {
    filename: originalName || path.basename(filePath),
  });

  // Metadata (optional)
  const metadata = {
    name: originalName || path.basename(filePath),
  };

  form.append("pinataMetadata", JSON.stringify(metadata));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const headers = {
    ...form.getHeaders(),
    pinata_api_key: PINATA_API_KEY,
    pinata_secret_api_key: PINATA_API_SECRET,
  };

  try {
    const response = await axios.post(url, form, {
      headers,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000, // 2 minutes
    });

    // Pinata returns: { IpfsHash, PinSize, Timestamp }
    return {
      IpfsHash: response.data.IpfsHash,
      raw: response.data,
    };
  } catch (error) {
    console.error("❌ Pinata upload failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", error.response.data);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

module.exports = { pinFileFromPath };
