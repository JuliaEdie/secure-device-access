import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { DeviceMaintenance, DeviceMaintenance__factory } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  technician: HardhatEthersSigner;
  unauthorized: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("DeviceMaintenance")) as DeviceMaintenance__factory;
  const contract = (await factory.deploy()) as DeviceMaintenance;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("DeviceMaintenance", function () {
  let signers: Signers;
  let deviceMaintenance: DeviceMaintenance;
  let deviceMaintenanceAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      technician: ethSigners[1],
      unauthorized: ethSigners[2],
    };
  });

  beforeEach(async function () {
    ({ contract: deviceMaintenance, contractAddress: deviceMaintenanceAddress } = await deployFixture());
  });

  it("should deploy with owner as authorized", async function () {
    const isAuthorized = await deviceMaintenance.isAuthorized(signers.deployer.address);
    expect(isAuthorized).to.be.true;
  });

  it("should allow owner to authorize technician", async function () {
    const tx = await deviceMaintenance.authorizeTechnician(signers.technician.address);
    await tx.wait();

    const isAuthorized = await deviceMaintenance.isAuthorized(signers.technician.address);
    expect(isAuthorized).to.be.true;
  });

  it("should allow owner to revoke technician", async function () {
    // First authorize
    await (await deviceMaintenance.authorizeTechnician(signers.technician.address)).wait();
    
    // Then revoke
    const tx = await deviceMaintenance.revokeTechnician(signers.technician.address);
    await tx.wait();

    const isAuthorized = await deviceMaintenance.isAuthorized(signers.technician.address);
    expect(isAuthorized).to.be.false;
  });

  it("should register a device", async function () {
    const deviceId = "dev-001";
    const name = "MRI Scanner PRO-X200";
    const deviceType = "Magnetic Resonance Imaging";
    const status = 0; // Operational
    const lastMaintenance = Math.floor(Date.now() / 1000);
    const nextCalibration = lastMaintenance + 30 * 24 * 60 * 60; // 30 days later
    const encryptedNotes = ethers.toUtf8Bytes("encrypted-notes-data");
    const encryptedCalibration = ethers.toUtf8Bytes("encrypted-calibration-data");

    const tx = await deviceMaintenance.registerDevice(
      deviceId,
      name,
      deviceType,
      status,
      lastMaintenance,
      nextCalibration,
      encryptedNotes,
      encryptedCalibration
    );
    await tx.wait();

    const deviceInfo = await deviceMaintenance.getDeviceInfo(deviceId);
    expect(deviceInfo[0]).to.eq(name);
    expect(deviceInfo[1]).to.eq(deviceType);
    expect(deviceInfo[2]).to.eq(status);
  });

  it("should prevent unauthorized technician from registering device", async function () {
    const deviceId = "dev-002";
    const encryptedNotes = ethers.toUtf8Bytes("encrypted-notes");
    const encryptedCalibration = ethers.toUtf8Bytes("encrypted-calibration");

    await expect(
      deviceMaintenance
        .connect(signers.unauthorized)
        .registerDevice(
          deviceId,
          "Test Device",
          "Test Type",
          0,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000) + 86400,
          encryptedNotes,
          encryptedCalibration
        )
    ).to.be.revertedWith("Not authorized technician");
  });

  it("should update device maintenance", async function () {
    // First register a device
    const deviceId = "dev-003";
    const encryptedNotes = ethers.toUtf8Bytes("initial-notes");
    const encryptedCalibration = ethers.toUtf8Bytes("initial-calibration");

    await (
      await deviceMaintenance.registerDevice(
        deviceId,
        "Test Device",
        "Test Type",
        0,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400,
        encryptedNotes,
        encryptedCalibration
      )
    ).wait();

    // Update maintenance
    const newEncryptedNotes = ethers.toUtf8Bytes("updated-notes");
    const newEncryptedCalibration = ethers.toUtf8Bytes("updated-calibration");
    const newStatus = 1; // Maintenance
    const newLastMaintenance = Math.floor(Date.now() / 1000);
    const newNextCalibration = newLastMaintenance + 60 * 24 * 60 * 60; // 60 days later

    const tx = await deviceMaintenance.updateMaintenance(
      deviceId,
      newStatus,
      newLastMaintenance,
      newNextCalibration,
      newEncryptedNotes,
      newEncryptedCalibration
    );
    await tx.wait();

    const deviceInfo = await deviceMaintenance.getDeviceInfo(deviceId);
    expect(deviceInfo[2]).to.eq(newStatus);
    expect(deviceInfo[3]).to.eq(newLastMaintenance);
  });

  it("should get encrypted records for authorized technician", async function () {
    // Authorize technician
    await (await deviceMaintenance.authorizeTechnician(signers.technician.address)).wait();

    // Register device
    const deviceId = "dev-004";
    const encryptedNotes = ethers.toUtf8Bytes("secret-notes");
    const encryptedCalibration = ethers.toUtf8Bytes("secret-calibration");

    await (
      await deviceMaintenance.registerDevice(
        deviceId,
        "Test Device",
        "Test Type",
        0,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400,
        encryptedNotes,
        encryptedCalibration
      )
    ).wait();

    // Get encrypted records as authorized technician
    const records = await deviceMaintenance
      .connect(signers.technician)
      .getEncryptedRecords(deviceId);

    expect(ethers.toUtf8String(records[0])).to.eq("secret-notes");
    expect(ethers.toUtf8String(records[1])).to.eq("secret-calibration");
  });

  it("should prevent unauthorized access to encrypted records", async function () {
    // Register device
    const deviceId = "dev-005";
    const encryptedNotes = ethers.toUtf8Bytes("secret-notes");
    const encryptedCalibration = ethers.toUtf8Bytes("secret-calibration");

    await (
      await deviceMaintenance.registerDevice(
        deviceId,
        "Test Device",
        "Test Type",
        0,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 86400,
        encryptedNotes,
        encryptedCalibration
      )
    ).wait();

    // Try to get encrypted records as unauthorized user
    await expect(
      deviceMaintenance.connect(signers.unauthorized).getEncryptedRecords(deviceId)
    ).to.be.revertedWith("Not authorized technician");
  });
});


