import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedDeviceMaintenance = await deploy("DeviceMaintenance", {
    from: deployer,
    log: true,
  });

  console.log(`DeviceMaintenance contract: `, deployedDeviceMaintenance.address);
};
export default func;
func.id = "deploy_deviceMaintenance"; // id required to prevent reexecution
func.tags = ["DeviceMaintenance"];


