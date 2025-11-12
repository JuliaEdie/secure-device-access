// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title Device Maintenance Logs Contract
/// @notice Securely stores encrypted maintenance records for medical devices
/// @dev Uses AES-256 encrypted data stored as bytes on-chain
contract DeviceMaintenance {
    /// @notice Device status enum
    enum DeviceStatus {
        Operational,
        Maintenance,
        Critical
    }

    /// @notice Device information structure
    struct Device {
        string name;
        string deviceType;
        DeviceStatus status;
        uint256 lastMaintenance;
        uint256 nextCalibration;
        bytes encryptedNotes;      // AES-256 encrypted repair notes
        bytes encryptedCalibration; // AES-256 encrypted calibration values
        bool exists;
    }

    /// @notice Mapping from device ID to device data
    mapping(string => Device) public devices;

    /// @notice Mapping from wallet address to authorization status
    mapping(address => bool) public authorizedTechnicians;

    /// @notice Owner of the contract (can authorize technicians)
    address public owner;

    /// @notice Event emitted when a device is registered
    event DeviceRegistered(string indexed deviceId, string name, address indexed technician);

    /// @notice Event emitted when device maintenance is updated
    event MaintenanceUpdated(
        string indexed deviceId,
        address indexed technician,
        uint256 timestamp
    );

    /// @notice Event emitted when a technician is authorized
    event TechnicianAuthorized(address indexed technician, address indexed by);

    /// @notice Event emitted when a technician is revoked
    event TechnicianRevoked(address indexed technician, address indexed by);

    /// @notice Modifier to restrict access to owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    /// @notice Modifier to restrict access to authorized technicians only
    modifier onlyAuthorized() {
        require(
            authorizedTechnicians[msg.sender] || msg.sender == owner,
            "Not authorized technician"
        );
        _;
    }

    /// @notice Constructor sets the contract owner
    constructor() {
        owner = msg.sender;
        authorizedTechnicians[msg.sender] = true;
    }

    /// @notice Register a new device
    /// @param deviceId Unique identifier for the device
    /// @param name Device name
    /// @param deviceType Type of device
    /// @param status Initial device status
    /// @param lastMaintenance Timestamp of last maintenance
    /// @param nextCalibration Timestamp of next calibration
    /// @param encryptedNotes AES-256 encrypted repair notes
    /// @param encryptedCalibration AES-256 encrypted calibration values
    function registerDevice(
        string memory deviceId,
        string memory name,
        string memory deviceType,
        DeviceStatus status,
        uint256 lastMaintenance,
        uint256 nextCalibration,
        bytes memory encryptedNotes,
        bytes memory encryptedCalibration
    ) external onlyAuthorized {
        require(!devices[deviceId].exists, "Device already exists");
        require(encryptedNotes.length > 0, "Encrypted notes cannot be empty");
        require(encryptedCalibration.length > 0, "Encrypted calibration cannot be empty");

        devices[deviceId] = Device({
            name: name,
            deviceType: deviceType,
            status: status,
            lastMaintenance: lastMaintenance,
            nextCalibration: nextCalibration,
            encryptedNotes: encryptedNotes,
            encryptedCalibration: encryptedCalibration,
            exists: true
        });

        emit DeviceRegistered(deviceId, name, msg.sender);
    }

    /// @notice Update device maintenance records
    /// @param deviceId Device identifier
    /// @param status Updated device status
    /// @param lastMaintenance Updated maintenance timestamp
    /// @param nextCalibration Updated calibration timestamp
    /// @param encryptedNotes Updated encrypted repair notes
    /// @param encryptedCalibration Updated encrypted calibration values
    function updateMaintenance(
        string memory deviceId,
        DeviceStatus status,
        uint256 lastMaintenance,
        uint256 nextCalibration,
        bytes memory encryptedNotes,
        bytes memory encryptedCalibration
    ) external onlyAuthorized {
        require(devices[deviceId].exists, "Device does not exist");
        require(encryptedNotes.length > 0, "Encrypted notes cannot be empty");
        require(encryptedCalibration.length > 0, "Encrypted calibration cannot be empty");

        devices[deviceId].status = status;
        devices[deviceId].lastMaintenance = lastMaintenance;
        devices[deviceId].nextCalibration = nextCalibration;
        devices[deviceId].encryptedNotes = encryptedNotes;
        devices[deviceId].encryptedCalibration = encryptedCalibration;

        emit MaintenanceUpdated(deviceId, msg.sender, block.timestamp);
    }

    /// @notice Get device information (public data only)
    /// @param deviceId Device identifier
    /// @return name Device name
    /// @return deviceType Type of device
    /// @return status Device status
    /// @return lastMaintenance Last maintenance timestamp
    /// @return nextCalibration Next calibration timestamp
    function getDeviceInfo(string memory deviceId)
        external
        view
        returns (
            string memory name,
            string memory deviceType,
            DeviceStatus status,
            uint256 lastMaintenance,
            uint256 nextCalibration
        )
    {
        require(devices[deviceId].exists, "Device does not exist");
        Device memory device = devices[deviceId];
        return (
            device.name,
            device.deviceType,
            device.status,
            device.lastMaintenance,
            device.nextCalibration
        );
    }

    /// @notice Get encrypted maintenance notes (for authorized technicians)
    /// @param deviceId Device identifier
    /// @return encryptedNotes Encrypted repair notes
    /// @return encryptedCalibration Encrypted calibration values
    function getEncryptedRecords(string memory deviceId)
        external
        view
        onlyAuthorized
        returns (bytes memory encryptedNotes, bytes memory encryptedCalibration)
    {
        require(devices[deviceId].exists, "Device does not exist");
        Device memory device = devices[deviceId];
        return (device.encryptedNotes, device.encryptedCalibration);
    }

    /// @notice Authorize a technician
    /// @param technician Address of the technician to authorize
    function authorizeTechnician(address technician) external onlyOwner {
        require(technician != address(0), "Invalid address");
        require(!authorizedTechnicians[technician], "Technician already authorized");
        authorizedTechnicians[technician] = true;
        emit TechnicianAuthorized(technician, msg.sender);
    }

    /// @notice Revoke technician authorization
    /// @param technician Address of the technician to revoke
    function revokeTechnician(address technician) external onlyOwner {
        require(authorizedTechnicians[technician], "Technician not authorized");
        authorizedTechnicians[technician] = false;
        emit TechnicianRevoked(technician, msg.sender);
    }

    /// @notice Check if an address is authorized
    /// @param technician Address to check
    /// @return True if authorized, false otherwise
    function isAuthorized(address technician) external view returns (bool) {
        return authorizedTechnicians[technician] || technician == owner;
    }
}


