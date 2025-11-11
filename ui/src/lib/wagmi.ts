import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base, sepolia, hardhat } from 'wagmi/chains';

// Get WalletConnect Project ID from environment or use a default for local development
// For production, get your Project ID from https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!WALLETCONNECT_PROJECT_ID) {
  console.warn('⚠️ VITE_WALLETCONNECT_PROJECT_ID not set. WalletConnect features may be limited.');
  console.warn('   Get your Project ID from: https://cloud.walletconnect.com');
}

export const config = getDefaultConfig({
  appName: 'Secure Device Maintenance Logs',
  projectId: WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000', // Temporary placeholder
  chains: [hardhat, sepolia, mainnet, polygon, optimism, arbitrum, base],
  ssr: false,
});

