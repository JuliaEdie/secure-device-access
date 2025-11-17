import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { DeviceCard } from '@/components/DeviceCard';
import { AdminPanel } from '@/components/AdminPanel';
import { StatusFooter } from '@/components/StatusFooter';
import { Shield, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useDeviceContract, DeviceRecord } from '@/hooks/useDeviceContract';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CONTRACT_ADDRESS } from '@/config/contracts';

const Index = () => {
  const { isConnected } = useAccount();
  const { getDeviceInfo, getEncryptedRecords, checkContractDeployed, getAllDeviceIds } = useDeviceContract();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isContractDeployed, setIsContractDeployed] = useState<boolean | null>(null);
  const [manualDeviceId, setManualDeviceId] = useState('');
  const [manualDeviceIds, setManualDeviceIds] = useState<string[]>([]);
  
  const isContractConfigured = CONTRACT_ADDRESS && CONTRACT_ADDRESS.trim() !== '';

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      // Get all device IDs from contract events
      const eventDeviceIds = await getAllDeviceIds();
      
      // Combine event-based IDs with manually added IDs
      const allDeviceIds = Array.from(new Set([...eventDeviceIds, ...manualDeviceIds]));
      
      // Cache device IDs for faster subsequent loads
      if (eventDeviceIds.length > 0) {
        setManualDeviceIds(eventDeviceIds);
      }
      
      if (allDeviceIds.length === 0) {
        setDevices([]);
        setIsLoading(false);
        return;
      }

      const devicePromises = allDeviceIds.map(async (deviceId) => {
        try {
          const info = await getDeviceInfo(deviceId);
          if (!info) return null;

          // Get encrypted records (will fail if not authorized, but we can still show device info)
          let encryptedNotes = '';
          let encryptedCalibration = '';
          try {
            const records = await getEncryptedRecords(deviceId);
            if (records) {
              encryptedNotes = records.encryptedNotes;
              encryptedCalibration = records.encryptedCalibration;
            }
          } catch (error) {
            // Not authorized or device doesn't have records yet
            encryptedNotes = '0x...';
            encryptedCalibration = '0x...';
          }

          const statusMap: Record<number, 'operational' | 'maintenance' | 'critical'> = {
            0: 'operational',
            1: 'maintenance',
            2: 'critical',
          };

          const formatDate = (timestamp: bigint) => {
            return new Date(Number(timestamp) * 1000).toLocaleDateString();
          };

          return {
            deviceId: info.deviceId,
            name: info.name,
            deviceType: info.deviceType,
            status: statusMap[info.status] || 'operational',
            lastMaintenance: formatDate(info.lastMaintenance),
            nextCalibration: formatDate(info.nextCalibration),
            encryptedNotes,
            encryptedCalibration,
          } as DeviceRecord;
        } catch (error: any) {
          // Silently ignore "device doesn't exist" errors
          if (error?.code !== 'CALL_EXCEPTION' && error?.code !== 'UNPREDICTABLE_GAS_LIMIT') {
            console.error(`Error loading device ${deviceId}:`, error);
          }
          return null;
        }
      });

      const loadedDevices = (await Promise.all(devicePromises)).filter(
        (d): d is DeviceRecord => d !== null
      );
      setDevices(loadedDevices);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkDeployment = async () => {
      if (isContractConfigured) {
        const deployed = await checkContractDeployed();
        setIsContractDeployed(deployed);
        if (deployed) {
          loadDevices();
        }
      }
    };
    checkDeployment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isContractConfigured]);

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">Device Maintenance Logs</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Securely manage hospital equipment maintenance records with blockchain-verified technician access. 
            Connect your wallet to decrypt sensitive calibration data and repair notes.
          </p>
          {!isContractConfigured && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-xl mx-auto">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Contract address not configured
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please deploy the contract and set VITE_CONTRACT_ADDRESS in your .env file
                  </p>
                </div>
              </div>
            </div>
          )}
          {isContractConfigured && isContractDeployed === false && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-xl mx-auto">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Contract not deployed at this address
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contract address: {CONTRACT_ADDRESS}
                    <br />
                    Please deploy the DeviceMaintenance contract to this address first.
                  </p>
                </div>
              </div>
            </div>
          )}
          {!isConnected && isContractConfigured && (
            <div className="mt-4 p-4 bg-secondary/10 border border-secondary/20 rounded-lg max-w-xl mx-auto">
              <p className="text-sm text-secondary font-medium">
                🔒 Wallet connection required to access encrypted maintenance records
              </p>
            </div>
          )}
        </div>

        {/* Tabs for Devices and Admin */}
        <Tabs defaultValue="devices" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="devices">
              <Shield className="w-4 h-4 mr-2" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="admin">
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            {/* Manual Device ID Input */}
            <div className="mb-4 p-4 bg-secondary/10 border border-secondary/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                If devices don't appear automatically, you can manually add a device ID:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter device ID (e.g., dev-ibm-2000-001)"
                  value={manualDeviceId}
                  onChange={(e) => setManualDeviceId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && manualDeviceId.trim()) {
                      const newIds = [...manualDeviceIds, manualDeviceId.trim()];
                      setManualDeviceIds(Array.from(new Set(newIds)));
                      setManualDeviceId('');
                      loadDevices();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (manualDeviceId.trim()) {
                      const newIds = [...manualDeviceIds, manualDeviceId.trim()];
                      setManualDeviceIds(Array.from(new Set(newIds)));
                      setManualDeviceId('');
                      loadDevices();
                    }
                  }}
                  disabled={!manualDeviceId.trim()}
                >
                  Add
                </Button>
              </div>
              {manualDeviceIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {manualDeviceIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-background border border-input rounded text-xs"
                    >
                      {id}
                      <button
                        onClick={() => {
                          setManualDeviceIds(manualDeviceIds.filter((d) => d !== id));
                          loadDevices();
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDevices}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Device Grid */}
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading devices...</p>
              </div>
            ) : isContractDeployed === false ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Contract not deployed. Please deploy the contract first.</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No devices found. Register devices to get started.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Contract is deployed at: {CONTRACT_ADDRESS}
                  <br />
                  Go to the Admin tab to register devices.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {devices.map((device) => (
                    <DeviceCard key={device.deviceId} device={device} onRefresh={loadDevices} />
                  ))}
                </div>

                {/* Info Section */}
                <div className="mt-12 text-center text-sm text-muted-foreground">
                  <p>Showing {devices.length} registered medical devices</p>
                  <p className="mt-1">Maintenance records encrypted with AES-256-GCM</p>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="admin">
            <AdminPanel onDeviceRegistered={loadDevices} />
          </TabsContent>
        </Tabs>
      </main>

      <StatusFooter />
    </div>
  );
};

export default Index;

