// Contract configuration
// Update these addresses after deployment

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export const DEVICE_MAINTENANCE_ABI = [
  'function registerDevice(string memory deviceId, string memory name, string memory deviceType, uint8 status, uint256 lastMaintenance, uint256 nextCalibration, bytes memory encryptedNotes, bytes memory encryptedCalibration) external',
  'function updateMaintenance(string memory deviceId, uint8 status, uint256 lastMaintenance, uint256 nextCalibration, bytes memory encryptedNotes, bytes memory encryptedCalibration) external',
  'function getDeviceInfo(string memory deviceId) external view returns (string memory name, string memory deviceType, uint8 status, uint256 lastMaintenance, uint256 nextCalibration)',
  'function getEncryptedRecords(string memory deviceId) external view returns (bytes memory encryptedNotes, bytes memory encryptedCalibration)',
  'function authorizeTechnician(address technician) external',
  'function revokeTechnician(address technician) external',
  'function isAuthorized(address technician) external view returns (bool)',
  'function owner() external view returns (address)',
  'event DeviceRegistered(string indexed deviceId, string name, address indexed technician)',
  'event MaintenanceUpdated(string indexed deviceId, address indexed technician, uint256 timestamp)',
  'event TechnicianAuthorized(address indexed technician, address indexed by)',
  'event TechnicianRevoked(address indexed technician, address indexed by)',
] as const;

