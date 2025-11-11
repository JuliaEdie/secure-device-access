import { useAccount } from 'wagmi';
import { Shield, Wifi } from 'lucide-react';

export const StatusFooter = () => {
  const { isConnected, address } = useAccount();

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-accent animate-pulse' : 'bg-muted-foreground'
              }`} />
              <span className="text-muted-foreground">
                {isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
              </span>
            </div>
            
            {isConnected && address && (
              <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                <Shield className="w-3 h-3" />
                <span className="font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wifi className="w-3 h-3" />
            <span>System Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
};


