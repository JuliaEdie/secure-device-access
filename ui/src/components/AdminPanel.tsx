import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useDeviceContract } from '@/hooks/useDeviceContract';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, PlusCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CONTRACT_ADDRESS } from '@/config/contracts';
import { ethers } from 'ethers';
import { DEVICE_MAINTENANCE_ABI } from '@/config/contracts';
import { usePublicClient } from 'wagmi';

interface AdminPanelProps {
  onDeviceRegistered?: () => void;
}

export const AdminPanel = ({ onDeviceRegistered }: AdminPanelProps) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { checkAuthorization, registerDevice, checkContractDeployed } = useDeviceContract();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isContractDeployed, setIsContractDeployed] = useState<boolean | null>(null);

  // Device registration form
  const [deviceForm, setDeviceForm] = useState({
    deviceId: '',
    name: '',
    deviceType: '',
    status: '0', // 0: Operational, 1: Maintenance, 2: Critical
    notes: '',
    calibration: '',
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Technician authorization
  const [technicianAddress, setTechnicianAddress] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Check authorization and owner status
  useEffect(() => {
    const checkStatus = async () => {
      if (!isConnected || !address) {
        setIsAuthorized(null);
        setIsOwner(false);
        return;
      }

      setIsChecking(true);
      try {
        const deployed = await checkContractDeployed();
        setIsContractDeployed(deployed);

      if (deployed) {
        const authorized = await checkAuthorization();
        setIsAuthorized(authorized);

        // Check if user is owner
        if (publicClient) {
          try {
            const provider = new ethers.BrowserProvider(publicClient);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, DEVICE_MAINTENANCE_ABI, provider);
            const owner = await contract.owner();
            setIsOwner(owner.toLowerCase() === address?.toLowerCase());
          } catch (error) {
            console.error('Error checking owner:', error);
          }
        }
      }
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  const handleAuthorizeTechnician = async () => {
    if (!technicianAddress || !ethers.isAddress(technicianAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    setIsAuthorizing(true);
    try {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      const provider = new ethers.BrowserProvider(publicClient);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DEVICE_MAINTENANCE_ABI, signer);
      
      const tx = await contract.authorizeTechnician(technicianAddress);
      await tx.wait();
      
      toast.success(`Technician ${technicianAddress.slice(0, 6)}...${technicianAddress.slice(-4)} authorized successfully`);
      setTechnicianAddress('');
    } catch (error: any) {
      console.error('Error authorizing technician:', error);
      toast.error(`Failed to authorize: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRegisterDevice = async () => {
    if (!deviceForm.deviceId || !deviceForm.name || !deviceForm.deviceType || !deviceForm.notes || !deviceForm.calibration) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsRegistering(true);
    try {
      await registerDevice(
        deviceForm.deviceId,
        deviceForm.name,
        deviceForm.deviceType,
        parseInt(deviceForm.status),
        deviceForm.notes,
        deviceForm.calibration
      );

      toast.success(`Device ${deviceForm.deviceId} registered successfully`);
      setDeviceForm({
        deviceId: '',
        name: '',
        deviceType: '',
        status: '0',
        notes: '',
        calibration: '',
      });
      // Notify parent to refresh device list
      if (onDeviceRegistered) {
        onDeviceRegistered();
      }
    } catch (error: any) {
      console.error('Error registering device:', error);
      toast.error(`Failed to register device: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Connect your wallet to access admin functions</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isChecking) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Checking permissions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isContractDeployed === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Contract not deployed</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please deploy the contract first: <code className="text-xs">npx hardhat deploy --network localhost</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isAuthorized === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Access Denied</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are not authorized to access admin functions. Please contact the contract owner to get authorized.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Your address: {address}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Admin Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Wallet Address:</span>
            <code className="text-xs">{address}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Authorization Status:</span>
            {isAuthorized ? (
              <Badge className="bg-accent/10 text-accent">
                <CheckCircle className="w-3 h-3 mr-1" />
                Authorized
              </Badge>
            ) : (
              <Badge variant="outline">
                <XCircle className="w-3 h-3 mr-1" />
                Not Authorized
              </Badge>
            )}
          </div>
          {isOwner && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role:</span>
              <Badge className="bg-primary/10 text-primary">
                <Shield className="w-3 h-3 mr-1" />
                Owner
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authorize Technician (Owner Only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Authorize Technician
            </CardTitle>
            <CardDescription>Grant access to a technician wallet address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="technician-address">Technician Wallet Address</Label>
              <Input
                id="technician-address"
                placeholder="0x..."
                value={technicianAddress}
                onChange={(e) => setTechnicianAddress(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAuthorizeTechnician}
              disabled={!technicianAddress || isAuthorizing}
              className="w-full"
            >
              {isAuthorizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authorizing...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Authorize Technician
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Register Device */}
      {isAuthorized && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              Register New Device
            </CardTitle>
            <CardDescription>Add a new medical device to the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="device-id">Device ID *</Label>
                <Input
                  id="device-id"
                  placeholder="dev-001"
                  value={deviceForm.deviceId}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device-status">Status *</Label>
                <Select
                  value={deviceForm.status}
                  onValueChange={(value) => setDeviceForm({ ...deviceForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Operational</SelectItem>
                    <SelectItem value="1">Maintenance</SelectItem>
                    <SelectItem value="2">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name *</Label>
              <Input
                id="device-name"
                placeholder="MRI Scanner PRO-X200"
                value={deviceForm.name}
                onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-type">Device Type *</Label>
              <Input
                id="device-type"
                placeholder="Magnetic Resonance Imaging"
                value={deviceForm.deviceType}
                onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repair-notes">Repair Notes *</Label>
              <Textarea
                id="repair-notes"
                placeholder="Replaced main coil unit. Gradient calibration completed..."
                value={deviceForm.notes}
                onChange={(e) => setDeviceForm({ ...deviceForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calibration">Calibration Values *</Label>
              <Textarea
                id="calibration"
                placeholder="Field Strength: 3.0T ±0.001T | SNR: 98.2..."
                value={deviceForm.calibration}
                onChange={(e) => setDeviceForm({ ...deviceForm, calibration: e.target.value })}
                rows={3}
              />
            </div>

            <Button
              onClick={handleRegisterDevice}
              disabled={isRegistering}
              className="w-full"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Register Device
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

