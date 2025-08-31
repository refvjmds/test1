import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  downloadUrl?: string;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    description: 'The most popular Ethereum wallet'
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: 'https://walletconnect.org/walletconnect-logo.svg',
    description: 'Connect with 300+ wallets'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: 'https://www.coinbase.com/img/favicon.ico',
    description: 'Secure crypto wallet and DApp browser'
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: 'https://trustwallet.com/assets/images/media/assets/trust_platform.svg',
    description: 'Multi-coin wallet for mobile'
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: 'https://phantom.app/img/phantom-icon-purple.png',
    description: 'Solana & Ethereum wallet'
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: 'https://rainbow.me/favicon.png',
    description: 'Fun, simple, and secure'
  }
];

interface WalletSelectorProps {
  onConnect?: (walletId: string, address: string) => void;
  className?: string;
}

const WalletSelector: React.FC<WalletSelectorProps> = ({ onConnect, className = "" }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const handleWalletConnect = async (wallet: WalletOption) => {
    setIsConnecting(wallet.id);
    
    try {
      let provider;
      let accounts: string[] = [];

      switch (wallet.id) {
        case 'metamask':
          if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
            provider = window.ethereum;
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          } else {
            toast.error('MetaMask is not installed');
            window.open('https://metamask.io/download/', '_blank');
            return;
          }
          break;

        case 'walletconnect':
          // WalletConnect integration würde hier implementiert werden
          toast.info('WalletConnect integration coming soon');
          return;

        case 'coinbase':
          if (typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet) {
            provider = window.ethereum;
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          } else {
            toast.error('Coinbase Wallet is not installed');
            window.open('https://www.coinbase.com/wallet', '_blank');
            return;
          }
          break;

        case 'trust':
          if (typeof window.ethereum !== 'undefined' && window.ethereum.isTrust) {
            provider = window.ethereum;
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          } else {
            toast.error('Trust Wallet is not available');
            return;
          }
          break;

        case 'phantom':
          if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
            const response = await window.solana.connect();
            accounts = [response.publicKey.toString()];
          } else {
            toast.error('Phantom Wallet is not installed');
            window.open('https://phantom.app/', '_blank');
            return;
          }
          break;

        case 'rainbow':
          // Rainbow wallet detection
          if (typeof window.ethereum !== 'undefined') {
            provider = window.ethereum;
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          } else {
            toast.error('Rainbow Wallet is not available');
            return;
          }
          break;

        default:
          toast.error('Wallet not supported yet');
          return;
      }

      if (accounts.length > 0) {
        const address = accounts[0];
        toast.success(`${wallet.name} connected successfully!`);
        onConnect?.(wallet.id, address);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error(`Failed to connect ${wallet.name}`);
    } finally {
      setIsConnecting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center space-x-2 border-amber-400 bg-amber-500 text-black hover:bg-amber-600 hover:text-black ${className}`}
        >
          <Wallet className="h-4 w-4" />
          <span>{t('nav.connectWallet')}</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>{t('wallet.connectWallet')}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {t('wallet.chooseWallet')}
          </p>
          
          <div className="grid gap-3">
            {WALLET_OPTIONS.map((wallet) => (
              <Button
                key={wallet.id}
                variant="outline"
                className="flex items-center justify-start space-x-3 h-auto p-4 hover:bg-gray-50"
                onClick={() => handleWalletConnect(wallet)}
                disabled={isConnecting === wallet.id}
              >
                <img 
                  src={wallet.icon} 
                  alt={`${wallet.name} icon`} 
                  className="w-8 h-8 flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">{wallet.name}</div>
                  <div className="text-xs text-gray-500">{wallet.description}</div>
                </div>
                {isConnecting === wallet.id && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                )}
              </Button>
            ))}
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              Don't have a wallet? Download one from the options above.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletSelector;
