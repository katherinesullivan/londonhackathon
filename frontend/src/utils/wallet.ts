export interface WalletInfo {
  address: string;
  chainId: number;
  isConnected: boolean;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class WalletManager {
  private static instance: WalletManager;
  private listeners: ((wallet: WalletInfo | null) => void)[] = [];

  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  async connectWallet(): Promise<WalletInfo | null> {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return null;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        return null;
      }

      // Get chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      const walletInfo: WalletInfo = {
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        isConnected: true,
      };

      this.notifyListeners(walletInfo);
      return walletInfo;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return null;
    }
  }

  async disconnectWallet(): Promise<void> {
    this.notifyListeners(null);
  }

  async getCurrentWallet(): Promise<WalletInfo | null> {
    if (!window.ethereum) {
      return null;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts.length === 0) {
        return null;
      }

      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      return {
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        isConnected: true,
      };
    } catch (error) {
      console.error('Failed to get current wallet:', error);
      return null;
    }
  }

  onWalletChange(callback: (wallet: WalletInfo | null) => void): () => void {
    this.listeners.push(callback);

    // Set up ethereum event listeners
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          callback(null);
        } else {
          this.getCurrentWallet().then(callback);
        }
      };

      const handleChainChanged = () => {
        this.getCurrentWallet().then(callback);
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Return cleanup function
      return () => {
        this.listeners = this.listeners.filter(l => l !== callback);
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(wallet: WalletInfo | null): void {
    this.listeners.forEach(listener => listener(wallet));
  }

  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  async switchToChain(chainId: number): Promise<boolean> {
    if (!window.ethereum) {
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (error: any) {
      // Chain doesn't exist, try to add it
      if (error.code === 4902) {
        // This would require chain configuration, for now just return false
        console.log('Chain not found in wallet');
      }
      return false;
    }
  }
} 