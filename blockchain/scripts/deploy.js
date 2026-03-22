const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying FortiDocsAudit contract...\n");

  const FortiDocsAudit = await hre.ethers.getContractFactory("FortiDocsAudit");
  const contract = await FortiDocsAudit.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`FortiDocsAudit deployed to: ${address}`);
  console.log(`Owner: ${(await hre.ethers.provider.getSigner()).address}\n`);

  // Update CONTRACT_ADDRESS in backend/.env
  const envPath = path.resolve(__dirname, "../../backend/.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${address}`
    );
    fs.writeFileSync(envPath, envContent);
    console.log(`Updated backend/.env with CONTRACT_ADDRESS=${address}`);
  } else {
    console.log(`\nManually set in backend/.env:`);
    console.log(`CONTRACT_ADDRESS=${address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
