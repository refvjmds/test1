import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Bitcoin, Refresh } from 'lucide-react';

interface BitcoinStatus {
  service: {
    houseWallet: string;
    payoutWallet: string;
    network: string;
    pendingTransactions: number;
    confirmedTransactions: number;
  };
  houseWallet: {
    address: string;
    balance: number;
    balanceSat: number;
    unconfirmed: number;
  };
  payoutWallet: {
    address: string;
    balance: number;
    balanceSat: number;
    unconfirmed: number;
  };
  btcPrice: number;
  pendingTransactions: Array<{
    id: string;
    from: string;
    to: string;
    amount: number;
    status: string;
    timestamp: string;
  }>;
  confirmedTransactions: Array<{
    id: string;
    from: string;
    to: string;
    amount: number;
    status: string;
    timestamp: string;
    txHash?: string;
  }>;
}

const BitcoinDashboard: React.FC = () => {
  const [bitcoinStatus, setBitcoinStatus] = useState<BitcoinStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchBitcoinStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchBitcoinStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBitcoinStatus = async () => {
    try {
      const response = await fetch('/api/payments/bitcoin/status', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setBitcoinStatus(data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching Bitcoin status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBTC = (amount: number): string => {
    return `${amount.toFixed(8)} BTC`;
  };

  const formatUSD = (amount: number): string => {
    return `$${amount.toLocaleString()}`;
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bitcoin className="h-5 w-5" />
            <span>Bitcoin Dashboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bitcoinStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bitcoin className="h-5 w-5" />
            <span>Bitcoin Dashboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load Bitcoin status</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bitcoin className="h-5 w-5 text-orange-600" />
              <span>Bitcoin Dashboard</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {bitcoinStatus.service.network}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBitcoinStatus}
                className="flex items-center space-x-1"
              >
                <Refresh className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Price and Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Bitcoin Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatUSD(bitcoinStatus.btcPrice)}
            </div>
            <p className="text-sm text-gray-500">USD per BTC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {bitcoinStatus.service.pendingTransactions}
            </div>
            <p className="text-sm text-gray-500">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Confirmed Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {bitcoinStatus.service.confirmedTransactions}
            </div>
            <p className="text-sm text-gray-500">Successfully processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* House Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              <span>House Wallet (60% Revenue)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Address:</p>
              <code className="text-xs bg-gray-100 p-1 rounded">
                {bitcoinStatus.houseWallet.address}
              </code>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Balance (BTC):</p>
                <p className="font-bold">{formatBTC(bitcoinStatus.houseWallet.balance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Value (USD):</p>
                <p className="font-bold text-blue-600">
                  {formatUSD(bitcoinStatus.houseWallet.balance * bitcoinStatus.btcPrice)}
                </p>
              </div>
            </div>
            {bitcoinStatus.houseWallet.unconfirmed > 0 && (
              <div>
                <p className="text-sm text-gray-500">Unconfirmed:</p>
                <p className="text-yellow-600">{formatBTC(bitcoinStatus.houseWallet.unconfirmed)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <span>Payout Wallet (Winner Payouts)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Address:</p>
              <code className="text-xs bg-gray-100 p-1 rounded">
                {bitcoinStatus.payoutWallet.address}
              </code>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Balance (BTC):</p>
                <p className="font-bold">{formatBTC(bitcoinStatus.payoutWallet.balance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Value (USD):</p>
                <p className="font-bold text-green-600">
                  {formatUSD(bitcoinStatus.payoutWallet.balance * bitcoinStatus.btcPrice)}
                </p>
              </div>
            </div>
            {bitcoinStatus.payoutWallet.unconfirmed > 0 && (
              <div>
                <p className="text-sm text-gray-500">Unconfirmed:</p>
                <p className="text-yellow-600">{formatBTC(bitcoinStatus.payoutWallet.unconfirmed)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Pending Transactions */}
            {bitcoinStatus.pendingTransactions.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-yellow-700 mb-2">Pending</h4>
                {bitcoinStatus.pendingTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ArrowUpRight className="h-4 w-4 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium">{formatAddress(tx.to)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatBTC(tx.amount)}</p>
                      <Badge className={getStatusColor(tx.status)}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Confirmed Transactions */}
            {bitcoinStatus.confirmedTransactions.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-green-700 mb-2">Confirmed</h4>
                {bitcoinStatus.confirmedTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">{formatAddress(tx.to)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </p>
                        {tx.txHash && (
                          <p className="text-xs text-gray-400 font-mono">
                            {tx.txHash.slice(0, 16)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatBTC(tx.amount)}</p>
                      <Badge className={getStatusColor(tx.status)}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bitcoinStatus.pendingTransactions.length === 0 && bitcoinStatus.confirmedTransactions.length === 0 && (
              <p className="text-center text-gray-500 py-8">No transactions yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BitcoinDashboard;
