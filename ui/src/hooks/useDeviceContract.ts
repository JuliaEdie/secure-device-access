import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, DEVICE_MAINTENANCE_ABI } from '../config/contracts';
import { encryptString, decryptString, encryptedStringToBytes, bytesToEncryptedString } from '../utils/crypto';

export interface DeviceInfo {
  deviceId: string;
  name: string;
  deviceType: string;
  status: number; // 0: Operational, 1: Maintenance, 2: Critical
  lastMaintenance: bigint;
  nextCalibration: bigint;
}

export interface DeviceRecord {
  deviceId: string;
  name: string;
  deviceType: string;
  status: 'operational' | 'maintenance' | 'critical';
  lastMaintenance: string;
  nextCalibration: string;
  encryptedNotes: string;
  encryptedCalibration: string;
  decryptedNotes?: string;
  decryptedCalibration?: string;
}

export const useDeviceContract = () => {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Validate contract address
  const validateContractAddress = () => {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.trim() === '') {
      throw new Error('Contract address not configured. Please set VITE_CONTRACT_ADDRESS in your .env file.');
    }
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      throw new Error(`Invalid contract address: ${CONTRACT_ADDRESS}`);
    }
  };

  const getContract = async () => {
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }
    validateContractAddress();

    const provider = new ethers.BrowserProvider(walletClient);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DEVICE_MAINTENANCE_ABI, signer);
    return contract;
  };

  const getPublicContract = async () => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    validateContractAddress();
    
    const provider = new ethers.BrowserProvider(publicClient);
    return new ethers.Contract(CONTRACT_ADDRESS, DEVICE_MAINTENANCE_ABI, provider);
  };

  const checkAuthorization = async (): Promise<boolean> => {
    if (!address) return false;
    try {
      const contract = await getPublicContract();
      const isAuthorized = await contract.isAuthorized(address);
      return isAuthorized;
    } catch (error) {
      console.error('Error checking authorization:', error);
      return false;
    }
  };

  const registerDevice = async (
    deviceId: string,
    name: string,
    deviceType: string,
    status: number,
    notes: string,
    calibration: string
  ) => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected');
    }

    // Encrypt the data
    const encryptedNotes = await encryptString(notes, address, chainId);
    const encryptedCalibration = await encryptString(calibration, address, chainId);

    // Convert to bytes for contract
    const notesBytes = ethers.toUtf8Bytes(encryptedNotes);
    const calibrationBytes = ethers.toUtf8Bytes(encryptedCalibration);

    const contract = await getContract();
    const lastMaintenance = Math.floor(Date.now() / 1000);
    const nextCalibration = lastMaintenance + 30 * 24 * 60 * 60; // 30 days

    const tx = await contract.registerDevice(
      deviceId,
      name,
      deviceType,
      status,
      lastMaintenance,
      nextCalibration,
      notesBytes,
      calibrationBytes
    );

    await tx.wait();
    return tx.hash;
  };

  const updateMaintenance = async (
    deviceId: string,
    status: number,
    notes: string,
    calibration: string
  ) => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected');
    }

    // Encrypt the data
    const encryptedNotes = await encryptString(notes, address, chainId);
    const encryptedCalibration = await encryptString(calibration, address, chainId);

    // Convert to bytes for contract
    const notesBytes = ethers.toUtf8Bytes(encryptedNotes);
    const calibrationBytes = ethers.toUtf8Bytes(encryptedCalibration);

    const contract = await getContract();
    const lastMaintenance = Math.floor(Date.now() / 1000);
    const nextCalibration = lastMaintenance + 30 * 24 * 60 * 60; // 30 days

    const tx = await contract.updateMaintenance(
      deviceId,
      status,
      lastMaintenance,
      nextCalibration,
      notesBytes,
      calibrationBytes
    );

    await tx.wait();
    return tx.hash;
  };

  const getDeviceInfo = async (deviceId: string): Promise<DeviceInfo | null> => {
    try {
      validateContractAddress();
      const contract = await getPublicContract();
      const info = await contract.getDeviceInfo(deviceId);
      return {
        deviceId,
        name: info[0],
        deviceType: info[1],
        status: Number(info[2]),
        lastMaintenance: BigInt(info[3]),
        nextCalibration: BigInt(info[4]),
      };
    } catch (error: any) {
      // Check if it's a revert (device doesn't exist) - this is expected
      if (error?.code === 'CALL_EXCEPTION' || error?.code === 'UNPREDICTABLE_GAS_LIMIT') {
        // Device doesn't exist, return null silently
        return null;
      }
      // Don't log error if it's just missing contract address
      if (error instanceof Error && error.message.includes('Contract address not configured')) {
        console.warn('Contract address not configured. Please deploy the contract and set VITE_CONTRACT_ADDRESS.');
      } else {
        console.error('Error getting device info:', error);
      }
      return null;
    }
  };

  const getEncryptedRecords = async (deviceId: string): Promise<{
    encryptedNotes: string;
    encryptedCalibration: string;
  } | null> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      const contract = await getContract();
      const records = await contract.getEncryptedRecords(deviceId);
      
      // Convert bytes back to string
      const notesBytesArray = new Uint8Array(records[0]);
      const calibrationBytesArray = new Uint8Array(records[1]);
      const notesStr = bytesToEncryptedString(notesBytesArray);
      const calibrationStr = bytesToEncryptedString(calibrationBytesArray);

      return {
        encryptedNotes: notesStr,
        encryptedCalibration: calibrationStr,
      };
    } catch (error) {
      console.error('Error getting encrypted records:', error);
      return null;
    }
  };

  const decryptDeviceRecords = async (deviceId: string): Promise<{
    notes: string;
    calibration: string;
  } | null> => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get encrypted records from contract
      const encrypted = await getEncryptedRecords(deviceId);
      if (!encrypted) {
        return null;
      }

      // Decrypt the data
      const notes = await decryptString(encrypted.encryptedNotes, address, chainId);
      const calibration = await decryptString(encrypted.encryptedCalibration, address, chainId);

      return { notes, calibration };
    } catch (error) {
      console.error('Error decrypting records:', error);
      return null;
    }
  };

  const checkContractDeployed = async (): Promise<boolean> => {
    try {
      validateContractAddress();
      const contract = await getPublicContract();
      // Try to call owner() - if contract is deployed, this will succeed
      await contract.owner();
      return true;
    } catch (error: any) {
      // If contract doesn't exist at this address, we'll get a specific error
      if (error?.code === 'CALL_EXCEPTION' && error?.data === null) {
        return false; // Contract not deployed
      }
      // Other errors might mean contract exists but call failed
      return true; // Assume deployed if we can't determine
    }
  };

  /**
   * Get all device IDs from contract events
   * Uses viem's getLogs for more reliable event querying on local networks
   */
  const getAllDeviceIds = async (): Promise<string[]> => {
    try {
      validateContractAddress();
      if (!publicClient) {
        console.warn('Public client not available, returning empty device list');
        return [];
      }

      // Get current block number first to limit query range
      // RPC providers typically limit eth_getLogs to 1000 blocks per request
      const currentBlock = await publicClient.getBlockNumber();
      const MAX_BLOCKS_PER_QUERY = 1000n;
      const fromBlock = currentBlock > MAX_BLOCKS_PER_QUERY 
        ? currentBlock - MAX_BLOCKS_PER_QUERY 
        : 0n;

      console.log(`Querying DeviceRegistered events from block ${fromBlock} to ${currentBlock} (${currentBlock - fromBlock} blocks)`);

      // Try using viem's getLogs first (more reliable for local networks)
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS as `0x${string}`,
          event: {
            type: 'event',
            name: 'DeviceRegistered',
            inputs: [
              { name: 'deviceId', type: 'string', indexed: true },
              { name: 'name', type: 'string', indexed: false },
              { name: 'technician', type: 'address', indexed: true },
            ],
          },
          fromBlock: fromBlock,  // Limited range to avoid RPC limits
          toBlock: 'latest',
        });

        const deviceIds = new Set<string>();
        logs.forEach((log: any) => {
          try {
            if (log.args && log.args.deviceId) {
              const deviceId = log.args.deviceId;
              if (deviceId && typeof deviceId === 'string') {
                deviceIds.add(deviceId);
              }
            }
          } catch (e) {
            console.warn('Error parsing event log:', e);
          }
        });

        const deviceIdsArray = Array.from(deviceIds);
        console.log(`Found ${deviceIdsArray.length} registered devices from viem logs (blocks ${fromBlock} to ${currentBlock}):`, deviceIdsArray);
        return deviceIdsArray;
      } catch (viemError) {
        console.warn('Viem getLogs failed, trying ethers fallback:', viemError);
        
        // Fallback: Try using ethers with limited block range
        const provider = new ethers.BrowserProvider(publicClient);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, DEVICE_MAINTENANCE_ABI, provider);
        const filter = contract.filters.DeviceRegistered();
        
        // Use the same limited range (convert bigint to number)
        const fromBlockNumber = Number(fromBlock);

        try {
          const events = await contract.queryFilter(filter, fromBlockNumber);

          const deviceIds = new Set<string>();
        events.forEach((event: any) => {
          try {
            if (event.args && event.args.length > 0) {
              const deviceId = event.args[0];
              if (deviceId && typeof deviceId === 'string') {
                deviceIds.add(deviceId);
              }
            }
          } catch (e) {
            console.warn('Error parsing event:', e);
          }
        });

        const deviceIdsArray = Array.from(deviceIds);
        console.log(`Found ${deviceIdsArray.length} registered devices from ethers events (blocks ${fromBlockNumber} to latest):`, deviceIdsArray);
        return deviceIdsArray;
        } catch (ethersError) {
          console.error('Ethers fallback also failed:', ethersError);
          // Return empty array if both methods fail
          return [];
        }
      }
    } catch (error: any) {
      console.error('Error getting device IDs from events:', error);
      // Return empty array if all methods fail
      // User can manually add device IDs or refresh after registering
      return [];
    }
  };

  return {
    checkAuthorization,
    registerDevice,
    updateMaintenance,
    getDeviceInfo,
    getEncryptedRecords,
    decryptDeviceRecords,
    checkContractDeployed,
    getAllDeviceIds,
  };
};

