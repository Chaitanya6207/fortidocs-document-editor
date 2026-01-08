const axios = require("axios");

const pinJSONToIPFS = async (json) => {
  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    json,
    {
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
    }
  );

  return res.data.IpfsHash;
};

module.exports = { pinJSONToIPFS };
 