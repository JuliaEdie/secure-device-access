import '@rainbow-me/rainbowkit/styles.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Logo } from './Logo';

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-gradient-header backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
            <div className="hidden md:block">
              <h1 className="text-xl font-semibold text-white">Locked Logs, Trusted Techs Only</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ConnectButton 
              chainStatus="icon"
              showBalance={false}
            />
          </div>
        </div>
      </div>
    </header>
  );
};


