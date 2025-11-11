// AES-256-GCM encryption using a key derived from wallet address + chain ID

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const n = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(n.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(n.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert string to ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert ArrayBuffer to string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Derive AES-256 key from wallet address and chain ID
 * Uses PBKDF2 with SHA-256 for key derivation
 */
async function deriveKeyFromAddress(address: string, chainId: number): Promise<CryptoKey> {
  // Normalize address (lowercase, remove 0x if present)
  let normalizedAddress = address.toLowerCase();
  if (normalizedAddress.startsWith('0x')) {
    normalizedAddress = normalizedAddress.slice(2);
  }

  // Combine address and chain ID for key material
  const keyMaterial = normalizedAddress + chainId.toString();
  const keyMaterialBuffer = stringToArrayBuffer(keyMaterial);

  // Import key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyMaterialBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key using PBKDF2
  const salt = stringToArrayBuffer('secure-device-maintenance-salt'); // Fixed salt for deterministic key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 1000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext Plain text to encrypt
 * @param address Wallet address
 * @param chainId Chain ID
 * @returns Encrypted data as hex string (format: iv:encryptedData)
 */
export async function encryptString(
  plaintext: string,
  address: string,
  chainId: number
): Promise<string> {
  try {
    const key = await deriveKeyFromAddress(address, chainId);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the content
    const plaintextBuffer = stringToArrayBuffer(plaintext);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      plaintextBuffer
    );

    // Combine IV and encrypted data
    const ivHex = bytesToHex(iv);
    const encryptedHex = bytesToHex(new Uint8Array(encrypted));

    // Return format: iv:encryptedData
    return `${ivHex}:${encryptedHex}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Encryption failed: ${(error as Error).message}`);
  }
}

/**
 * Decrypt a string using AES-256-GCM
 * @param encryptedData Encrypted data as hex string (format: iv:encryptedData)
 * @param address Wallet address
 * @param chainId Chain ID
 * @returns Decrypted plain text
 */
export async function decryptString(
  encryptedData: string,
  address: string,
  chainId: number
): Promise<string> {
  try {
    // Check if content is encrypted (contains colon)
    if (!encryptedData.includes(':')) {
      throw new Error('Invalid encrypted data format: missing IV separator');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format: expected iv:encryptedData');
    }

    const [ivHex, encryptedHex] = parts;

    // Convert hex back to Uint8Array
    const iv = hexToBytes(ivHex);
    const encryptedBytes = hexToBytes(encryptedHex);

    // Derive the same key
    const key = await deriveKeyFromAddress(address, chainId);

    // Decrypt the content
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedBytes
    );

    // Convert back to string
    return arrayBufferToString(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Decryption failed: ${(error as Error).message}`);
  }
}

/**
 * Convert encrypted string to bytes for contract storage
 * @param encryptedData Encrypted data as hex string
 * @returns Bytes array for contract
 */
export function encryptedStringToBytes(encryptedData: string): Uint8Array {
  // Remove the colon separator and convert to bytes
  const hexString = encryptedData.replace(':', '');
  return hexToBytes(hexString);
}

/**
 * Convert bytes from contract to encrypted string format
 * @param bytes Bytes from contract
 * @param ivLength Length of IV (default 12 for GCM)
 * @returns Encrypted data as hex string (format: iv:encryptedData)
 */
export function bytesToEncryptedString(bytes: Uint8Array, ivLength: number = 12): string {
  const iv = bytes.slice(0, ivLength);
  const encrypted = bytes.slice(ivLength);
  return `${bytesToHex(iv)}:${bytesToHex(encrypted)}`;
}


