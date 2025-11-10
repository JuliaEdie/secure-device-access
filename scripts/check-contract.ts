import hre from "hardhat";

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  console.log("Checking contract deployment...");
  console.log("Contract Address:", contractAddress);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Checking with account:", deployer.address);
  
  // Check if there's code at this address
  const code = await hre.ethers.provider.getCode(contractAddress);
  
  if (code === "0x") {
    console.log("❌ Contract NOT deployed at this address");
    console.log("Please deploy the contract first:");
    console.log("  npx hardhat deploy --network localhost");
  } else {
    console.log("✅ Contract IS deployed at this address");
    
    // Try to get the owner
    try {
      const DeviceMaintenance = await hre.ethers.getContractFactory("DeviceMaintenance");
      const contract = DeviceMaintenance.attach(contractAddress);
      const owner = await contract.owner();
      console.log("Contract Owner:", owner);
      
      // Check if deployer is authorized
      const isAuthorized = await contract.isAuthorized(deployer.address);
      console.log(`Is ${deployer.address} authorized?`, isAuthorized);
    } catch (error) {
      console.error("Error calling contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

