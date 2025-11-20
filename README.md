# Secure Device Maintenance Logs

**Locked Logs, Trusted Techs Only**

A blockchain-secured hospital equipment maintenance log system with AES-256-GCM encryption. Technicians use their Web3 wallet as a "biometric key" to encrypt and decrypt sensitive maintenance records and calibration data.

## 🌐 Live Demo

- **Vercel Deployment**: [https://secure-device-maintenance.vercel.app/](https://secure-device-maintenance.vercel.app/)
- **GitHub Repository**: [https://github.com/JuliaEdie/secure-device-access.git](https://github.com/JuliaEdie/secure-device-access.git)

## 📹 Demo Video

Watch the demo video to see the system in action: [secure-device-maintenance.mp4](./secure-device-maintenance.mp4)

## 📋 Overview

This project implements an end-to-end encrypted maintenance log system for medical devices where:

- **Technicians** sign with their wallet to generate AES-256 symmetric keys
- **Frontend** encrypts repair notes and calibration values using wallet address + chain ID
- **Encrypted data** is stored on-chain (as bytes)
- **Only authorized technicians** with the same wallet can decrypt and view plaintext records

## 🔄 MVP Core Flow (5 Steps)

1. **Technician** → Wallet signature generates AES-256 key
2. **Frontend** encrypts (repair notes & calibration values)
3. **Encrypted data** → Stored on-chain or backend
4. **Admin** authorizes wallet address
5. **Technician** connects same wallet → Frontend decrypts → View real maintenance records

## 🛠️ Technology Stack

### Smart Contracts
- **Solidity** ^0.8.27
- **Hardhat** for development and testing
- **FHEVM** template for reference

### Frontend
- **React** + **TypeScript** + **Vite**
- **RainbowKit** + **Wagmi** for Web3 integration
- **AES-256-GCM** encryption using Web Crypto API
- **shadcn-ui** + **Tailwind CSS** for UI

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with SHA-256
- **Key Material**: Wallet address + Chain ID + Salt
- **Storage**: Encrypted bytes on-chain

## 📁 Project Structure

```
secure-device-maintenance/
├── contracts/              # Smart contracts
│   └── DeviceMaintenance.sol    # Main contract
├── deploy/                 # Deployment scripts
│   └── deploy.ts
├── test/                   # Test files
│   └── DeviceMaintenance.ts
├── tasks/                  # Hardhat tasks
│   └── accounts.ts
├── scripts/                # Utility scripts
│   └── check-contract.ts
├── ui/                     # Frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utilities (crypto)
│   │   ├── config/         # Configuration
│   │   └── lib/            # Libraries
│   └── public/             # Static assets
└── hardhat.config.ts       # Hardhat configuration
```

## 🚀 Setup

### Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- Hardhat node (for local testing)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/JuliaEdie/secure-device-access.git
   cd secure-device-access
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd ui && npm install
   ```

3. **Set up environment variables**

   ```bash
   # For Hardhat (optional, for testnet deployment)
   export PRIVATE_KEY=your_private_key
   export INFURA_API_KEY=your_infura_key

   # For Frontend (create ui/.env)
   VITE_CONTRACT_ADDRESS=your_contract_address
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

4. **Compile contracts**

   ```bash
   npm run compile
   ```

5. **Run tests**

   ```bash
   npm run test
   ```

## 📍 Contract Addresses

### Local Network (Hardhat)
- **Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Network**: Hardhat Local (Chain ID: 31337)
- **Usage**: Development and testing

### Sepolia Testnet
- **Address**: `0xfFabB2Effd9Dc369db03F4C997A94Aa24b0793F5`
- **Network**: Sepolia Testnet (Chain ID: 11155111)
- **Explorer**: [View on Etherscan](https://sepolia.etherscan.io/address/0xfFabB2Effd9Dc369db03F4C997A94Aa24b0793F5)
- **Usage**: Testnet testing and demonstration

## 🚢 Deployment

### Local Network

1. Start Hardhat node:
   ```bash
   npx hardhat node
   ```

2. Deploy contracts:
   ```bash
   npx hardhat deploy --network localhost
   ```

3. Update `ui/.env` with deployed address:
   ```env
   VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```

4. Start frontend:
   ```bash
   cd ui && npm run dev
   ```

### Sepolia Testnet

1. Set environment variables:
   ```bash
   export PRIVATE_KEY=your_private_key
   export INFURA_API_KEY=your_infura_key
   ```

2. Deploy to Sepolia:
   ```bash
   npx hardhat deploy --network sepolia
   ```

3. Update frontend config with deployed address:
   ```env
   VITE_CONTRACT_ADDRESS=0xfFabB2Effd9Dc369db03F4C997A94Aa24b0793F5
   ```

## 💻 Usage

### For Administrators

1. Deploy the contract (becomes owner automatically)
2. Authorize technicians via Admin Panel:
   - Connect wallet as owner
   - Navigate to Admin tab
   - Enter technician wallet address
   - Click "Authorize Technician"

### For Technicians

1. Connect wallet (RainbowKit) - must be authorized
2. Register or update device maintenance records:
   - Navigate to Admin tab
   - Fill in device information
   - Repair notes and calibration values are automatically encrypted
   - Submit transaction
3. View encrypted records:
   - Navigate to Devices tab
   - Click "Unlock Records" on device card
   - Records are decrypted in browser using wallet key

## 🔐 Encryption & Decryption Logic

### Key Derivation Process

The encryption key is deterministically derived from the wallet address and chain ID:

```typescript
// Key Material: wallet address (lowercase, no 0x) + chain ID
const keyMaterial = address.toLowerCase().replace('0x', '') + chainId.toString();

// PBKDF2 Key Derivation
const key = await crypto.subtle.deriveKey(
  {
    name: 'PBKDF2',
    salt: 'secure-device-maintenance-salt',  // Fixed salt
    iterations: 100000,                      // High iteration count for security
    hash: 'SHA-256',
  },
  baseKey,
  { name: 'AES-GCM', length: 256 },         // AES-256-GCM
  false,
  ['encrypt', 'decrypt']
);
```

**Key Properties**:
- **Deterministic**: Same address + chain ID = same key
- **Secure**: PBKDF2 with 100,000 iterations
- **Unique**: Different addresses or chains = different keys

### Encryption Flow

```typescript
// 1. Derive key from wallet address + chain ID
const key = await deriveKeyFromAddress(address, chainId);

// 2. Generate random IV (12 bytes for GCM)
const iv = crypto.getRandomValues(new Uint8Array(12));

// 3. Encrypt plaintext
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: iv },
  key,
  plaintextBuffer
);

// 4. Format: iv:encryptedData (hex strings)
return `${ivHex}:${encryptedHex}`;
```

**Encryption Format**:
- **Input**: Plain text string (repair notes or calibration values)
- **Output**: `iv:encryptedData` (hex strings separated by colon)
- **Storage**: Converted to bytes for on-chain storage

### Decryption Flow

```typescript
// 1. Parse encrypted data (format: iv:encryptedData)
const [ivHex, encryptedHex] = encryptedData.split(':');

// 2. Derive same key (same address + chain ID)
const key = await deriveKeyFromAddress(address, chainId);

// 3. Decrypt
const decrypted = await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv: hexToBytes(ivHex) },
  key,
  hexToBytes(encryptedHex)
);

// 4. Convert back to string
return arrayBufferToString(decrypted);
```

**Decryption Requirements**:
- Same wallet address (used for encryption)
- Same chain ID
- Authorization check (on-chain `onlyAuthorized` modifier)
- Decryption happens 100% in browser (zero-knowledge to server)

## 📜 Smart Contract

### DeviceMaintenance.sol

The main contract manages device registration, maintenance updates, and technician authorization.

**Key Features**:
- Device registration with encrypted data
- Maintenance record updates
- Technician authorization management
- Access control via `onlyOwner` and `onlyAuthorized` modifiers

**Core Functions**:

```solidity
// Register a new device (authorized technicians only)
function registerDevice(
    string memory deviceId,
    string memory name,
    string memory deviceType,
    DeviceStatus status,
    uint256 lastMaintenance,
    uint256 nextCalibration,
    bytes memory encryptedNotes,
    bytes memory encryptedCalibration
) external onlyAuthorized;

// Update device maintenance (authorized technicians only)
function updateMaintenance(
    string memory deviceId,
    DeviceStatus status,
    uint256 lastMaintenance,
    uint256 nextCalibration,
    bytes memory encryptedNotes,
    bytes memory encryptedCalibration
) external onlyAuthorized;

// Get device public information (anyone can call)
function getDeviceInfo(string memory deviceId)
    external view returns (
        string memory name,
        string memory deviceType,
        DeviceStatus status,
        uint256 lastMaintenance,
        uint256 nextCalibration
    );

// Get encrypted records (authorized technicians only)
function getEncryptedRecords(string memory deviceId)
    external view onlyAuthorized returns (
        bytes memory encryptedNotes,
        bytes memory encryptedCalibration
    );

// Authorization management (owner only)
function authorizeTechnician(address technician) external onlyOwner;
function revokeTechnician(address technician) external onlyOwner;
function isAuthorized(address technician) external view returns (bool);
```

**Full Contract Code**: See [contracts/DeviceMaintenance.sol](./contracts/DeviceMaintenance.sol)

## 🧪 Testing

### Local Tests

```bash
npm run test
```

### Sepolia Tests

```bash
npm run test:sepolia
```

### Check Contract Deployment

```bash
npm run check:contract
```

## ✨ Features

- ✅ Wallet-based authentication (RainbowKit)
- ✅ AES-256-GCM encryption/decryption
- ✅ On-chain encrypted storage
- ✅ Authorization management (owner can authorize technicians)
- ✅ Real-time decryption in browser
- ✅ Modern UI with shadcn-ui components
- ✅ Event-based device discovery
- ✅ Manual device ID input (fallback)
- ✅ Responsive design

## 🔒 Security Notes

- **Encryption keys** are derived deterministically from wallet address + chain ID
- **Same wallet on same chain** = same key (allows decryption)
- **Authorization** is enforced on-chain via `onlyAuthorized` modifier
- **All decryption** happens client-side (zero-knowledge to server)
- **Encrypted data** stored as bytes on-chain (not readable without key)
- **PBKDF2** with 100,000 iterations provides strong key derivation
- **AES-256-GCM** provides authenticated encryption

## 📝 Development Notes

### Event Query Limitations

The system queries `DeviceRegistered` events to discover devices. RPC providers typically limit `eth_getLogs` to 1000 blocks per request. The implementation:

- Queries only the last 1000 blocks by default
- Falls back to manual device ID input if event query fails
- For newly deployed contracts, this covers all events

### Environment Variables

**Backend (Hardhat)**:
- `PRIVATE_KEY`: Private key for testnet deployment (optional)
- `INFURA_API_KEY`: Infura API key for RPC access (optional)

**Frontend (Vite)**:
- `VITE_CONTRACT_ADDRESS`: Deployed contract address (required)
- `VITE_WALLETCONNECT_PROJECT_ID`: WalletConnect project ID (optional)

## 📄 License

MIT

## 🙏 Acknowledgments

- Based on [fhevm-hardhat-template](https://github.com/zama-ai/fhevm-hardhat-template)
- Uses [RainbowKit](https://rainbowkit.com/) for wallet integration
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Built with [Hardhat](https://hardhat.org/) and [Vite](https://vitejs.dev/)

## 📞 Support

For issues, questions, or contributions, please open an issue on [GitHub](https://github.com/JuliaEdie/secure-device-access/issues).

---

**Repository**: [https://github.com/JuliaEdie/secure-device-access.git](https://github.com/JuliaEdie/secure-device-access.git)  
**Live Demo**: [https://secure-device-maintenance.vercel.app/](https://secure-device-maintenance.vercel.app/)

