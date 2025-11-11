import { useState, useEffect } from 'react';
import { Lock, Unlock, Activity, Calendar, Wrench, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccount } from 'wagmi';
import { useDeviceContract, DeviceRecord } from '@/hooks/useDeviceContract';
import { toast } from 'sonner';

interface DeviceCardProps {
  device: DeviceRecord;
  onRefresh?: () => void;
}

export const DeviceCard = ({ device, onRefresh }: DeviceCardProps) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedNotes, setDecryptedNotes] = useState<string | null>(null);
  const [decryptedCalibration, setDecryptedCalibration] = useState<string | null>(null);
  const { isConnected, address } = useAccount();
  const { decryptDeviceRecords, checkAuthorization } = useDeviceContract();

  const statusColors = {
    operational: 'bg-accent/10 text-accent border-accent/20',
    maintenance: 'bg-secondary/10 text-secondary border-secondary/20',
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const handleDecrypt = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsDecrypting(true);
    try {
      // Check authorization
      const isAuthorized = await checkAuthorization();
      if (!isAuthorized) {
        toast.error('You are not authorized to decrypt these records');
        setIsDecrypting(false);
        return;
      }

      // Decrypt records
      const decrypted = await decryptDeviceRecords(device.deviceId);
      if (decrypted) {
        setDecryptedNotes(decrypted.notes);
        setDecryptedCalibration(decrypted.calibration);
        setIsUnlocked(true);
        toast.success('Records decrypted successfully');
      } else {
        toast.error('Failed to decrypt records');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setDecryptedNotes(null);
    setDecryptedCalibration(null);
  };

  // Reset when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setIsUnlocked(false);
      setDecryptedNotes(null);
      setDecryptedCalibration(null);
    }
  }, [isConnected]);

  return (
    <Card className="p-6 hover:shadow-card-hover transition-all duration-300 bg-gradient-card border-border/50">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">{device.name}</h3>
            <p className="text-sm text-muted-foreground">{device.deviceType}</p>
          </div>
          <Badge className={statusColors[device.status]} variant="outline">
            <Activity className="w-3 h-3 mr-1" />
            {device.status}
          </Badge>
        </div>

        {/* Public Info */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last Maintenance:</span>
            <span className="text-foreground font-medium">{device.lastMaintenance}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Next Calibration:</span>
            <span className="text-foreground font-medium">{device.nextCalibration}</span>
          </div>
        </div>

        {/* Encrypted Section */}
        <div className="space-y-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Maintenance Records</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={isUnlocked ? handleLock : handleDecrypt}
              disabled={!isConnected || isDecrypting}
              className={`h-8 px-3 ${
                isUnlocked 
                  ? 'text-accent hover:text-accent/80' 
                  : 'text-locked-gray hover:text-foreground'
              } ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
            >
              {isDecrypting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  <span className="text-xs">Decrypting...</span>
                </>
              ) : isUnlocked ? (
                <>
                  <Unlock className="w-4 h-4 mr-1" />
                  <span className="text-xs">Unlocked</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-1" />
                  <span className="text-xs">Locked</span>
                </>
              )}
            </Button>
          </div>

          {/* Encrypted Data Display */}
          <div className="space-y-2">
            <div className="bg-muted/30 rounded-md p-3 border border-border/30">
              <p className="text-xs font-medium text-muted-foreground mb-1">Repair Notes:</p>
              <p className={`text-sm font-mono break-words ${
                isUnlocked && decryptedNotes ? 'text-foreground' : 'text-locked-gray blur-sm select-none'
              }`}>
                {isUnlocked && decryptedNotes ? decryptedNotes : device.encryptedNotes}
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-md p-3 border border-border/30">
              <p className="text-xs font-medium text-muted-foreground mb-1">Calibration Values:</p>
              <p className={`text-sm font-mono break-words ${
                isUnlocked && decryptedCalibration ? 'text-foreground' : 'text-locked-gray blur-sm select-none'
              }`}>
                {isUnlocked && decryptedCalibration ? decryptedCalibration : device.encryptedCalibration}
              </p>
            </div>
          </div>

          {!isConnected && (
            <p className="text-xs text-destructive italic">
              Connect wallet to decrypt maintenance records
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};


