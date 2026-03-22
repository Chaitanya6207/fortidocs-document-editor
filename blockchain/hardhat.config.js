require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../backend/.env" });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      url: process.env.RPC_URL || "http://127.0.0.1:7545",
      accounts: process.env.OWNER_PRIVATE_KEY
        ? [process.env.OWNER_PRIVATE_KEY]
        : [],
    },
  },
};
