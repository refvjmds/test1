import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Banknote, Wallet, ArrowUpFromLine, CheckCircle, AlertCircle, Clock, Copy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  type: 'fiat' | 'crypto';
  name: string;
  icon: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  fees: {
    fixed: number;
    percentage: number;
  };
  processingTime: string;
  enabled: boolean;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  method: PaymentMethod;
  amount: number;
  amountReceived?: number;
  fees: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  details: Record<string, any>;
}

interface DepositMethodsProps {
  userBalance: number;
  onDeposit?: (transaction: Transaction) => void;
}

const DepositMethods: React.FC<DepositMethodsProps> = () => {
  const { t } = useLanguage();
  return null;
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [btcPrice, setBtcPrice] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
      fetchBitcoinPrice();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentTransaction && currentTransaction.status === 'processing') {
      interval = setInterval(() => {
        checkTransactionStatus(currentTransaction.id);
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTransaction]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payments/methods');
      const data = await response.json();
      if (data.success) {
        setPaymentMethods(data.data);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    }
  };

  const fetchBitcoinPrice = async () => {
    try {
      const response = await fetch('/api/payments/bitcoin/price');
      const data = await response.json();
      if (data.success) {
        setBtcPrice(data.data.price);
      }
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error);
    }
  };

  const checkTransactionStatus = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/payments/transaction/${transactionId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        const transaction = data.data;
        setCurrentTransaction(transaction);
        
        if (transaction.status === 'completed') {
          toast.success(`Deposit completed! +$${transaction.amountReceived} added to your balance`);
          onDeposit?.(transaction);
          setIsOpen(false);
          setCurrentTransaction(null);
        } else if (transaction.status === 'failed') {
          toast.error('Deposit failed. Please try again.');
          setCurrentTransaction(null);
        }
      }
    } catch (error) {
      console.error('Error checking transaction status:', error);
    }
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setAmount('');
    setDetails({});
    setCurrentTransaction(null);
  };

  const handleDetailsChange = (field: string, value: string) => {
    setDetails(prev => ({ ...prev, [field]: value }));
  };

  const calculateFees = (amount: number, method: PaymentMethod): number => {
    return method.fees.fixed + (amount * method.fees.percentage / 100);
  };

  const handleDeposit = async () => {
    if (!selectedMethod || !amount) return;

    const depositAmount = parseFloat(amount);
    if (depositAmount < selectedMethod.minAmount) {
      toast.error(`Minimum amount is $${selectedMethod.minAmount}`);
      return;
    }

    if (depositAmount > selectedMethod.maxAmount) {
      toast.error(`Maximum amount is $${selectedMethod.maxAmount}`);
      return;
    }

    // Validate required fields
    if (!validateDepositDetails()) {
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          methodId: selectedMethod.id,
          amount: depositAmount,
          details
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const transaction = data.data;
        setCurrentTransaction(transaction);
        toast.success('Deposit initiated! Processing...');
        
        // Clear form but keep dialog open to show progress
        setAmount('');
        setDetails({});
      } else {
        toast.error(data.error || 'Failed to initiate deposit');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Failed to process deposit');
    } finally {
      setIsProcessing(false);
    }
  };

  const validateDepositDetails = (): boolean => {
    if (!selectedMethod) return false;

    switch (selectedMethod.id) {
      case 'bank_transfer':
        if (!details.accountHolder) {
          toast.error('Account holder name is required');
          return false;
        }
        break;
      case 'paypal':
        if (!details.paypalEmail || !details.paypalEmail.includes('@')) {
          toast.error('Valid PayPal email is required');
          return false;
        }
        break;
      case 'credit_card':
        if (!details.cardNumber || details.cardNumber.length < 16) {
          toast.error('Valid card number is required');
          return false;
        }
        if (!details.cardHolder) {
          toast.error('Cardholder name is required');
          return false;
        }
        break;
      case 'bitcoin':
      case 'ethereum':
      case 'usdt':
      case 'usdc':
      case 'litecoin':
      case 'binancecoin':
        // For crypto, no additional validation needed for deposit
        break;
    }

    return true;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const renderMethodDetails = () => {
    if (!selectedMethod) return null;

    switch (selectedMethod.id) {
      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="account_holder">Account Holder Name</Label>
              <Input
                id="account_holder"
                placeholder="Your full name"
                value={details.account_holder || ''}
                onChange={(e) => handleDetailsChange('account_holder', e.target.value)}
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Bank Transfer Instructions:</strong><br/>
                1. Transfer the exact amount to our bank account<br/>
                2. Use your email as payment reference<br/>
                3. Processing time: 1-3 business days
              </p>
            </div>
          </div>
        );

      case 'paypal':
        return (
          <div>
            <Label htmlFor="paypal_email">PayPal Email</Label>
            <Input
              id="paypal_email"
              type="email"
              placeholder="your@email.com"
              value={details.paypal_email || ''}
              onChange={(e) => handleDetailsChange('paypal_email', e.target.value)}
            />
          </div>
        );

      case 'credit_card':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="card_number">Card Number</Label>
              <Input
                id="card_number"
                placeholder="1234 5678 9012 3456"
                value={details.card_number || ''}
                onChange={(e) => handleDetailsChange('card_number', e.target.value)}
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={details.expiry || ''}
                  onChange={(e) => handleDetailsChange('expiry', e.target.value)}
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={details.cvv || ''}
                  onChange={(e) => handleDetailsChange('cvv', e.target.value)}
                  maxLength={4}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="card_holder">Cardholder Name</Label>
              <Input
                id="card_holder"
                placeholder="John Doe"
                value={details.card_holder || ''}
                onChange={(e) => handleDetailsChange('card_holder', e.target.value)}
              />
            </div>
          </div>
        );

      case 'bitcoin':
      case 'ethereum':
      case 'usdt':
      case 'usdc':
      case 'litecoin':
      case 'binancecoin':
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Crypto Deposit Instructions:</strong><br/>
                1. Send exactly the specified amount to the provided address<br/>
                2. Wait for blockchain confirmation<br/>
                3. Your balance will be updated automatically
              </p>
            </div>
            {btcPrice > 0 && selectedMethod.id === 'bitcoin' && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-700">
                  Current BTC Price: <strong>${btcPrice.toLocaleString()}</strong><br/>
                  BTC Amount: <strong>{(parseFloat(amount || '0') / btcPrice).toFixed(8)} BTC</strong>
                </p>
              </div>
            )}
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-blue-700">
                <strong>Network:</strong> {
                  selectedMethod.id === 'bitcoin' ? 'Bitcoin Network' :
                  selectedMethod.id === 'litecoin' ? 'Litecoin Network' :
                  selectedMethod.id === 'binancecoin' ? 'BNB Smart Chain' :
                  selectedMethod.id === 'ethereum' ? 'Ethereum Network' :
                  selectedMethod.id === 'usdt' ? 'Ethereum Network (ERC-20)' :
                  selectedMethod.id === 'usdc' ? 'Ethereum Network (ERC-20)' :
                  'Blockchain Network'
                }
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderTransactionProgress = () => {
    if (!currentTransaction) return null;

    const getStatusIcon = () => {
      switch (currentTransaction.status) {
        case 'pending':
        case 'processing':
          return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
        case 'completed':
          return <CheckCircle className="h-5 w-5 text-green-600" />;
        case 'failed':
          return <AlertCircle className="h-5 w-5 text-red-600" />;
        default:
          return <Clock className="h-5 w-5 text-gray-600" />;
      }
    };

    const getStatusText = () => {
      switch (currentTransaction.status) {
        case 'pending':
          return 'Waiting for payment...';
        case 'processing':
          return 'Processing payment...';
        case 'completed':
          return 'Payment completed!';
        case 'failed':
          return 'Payment failed';
        default:
          return 'Unknown status';
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>Transaction Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Amount:</span>
              <div className="font-bold">${currentTransaction.amount}</div>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <div className="font-bold">{getStatusText()}</div>
            </div>
            <div>
              <span className="text-gray-600">Method:</span>
              <div>{currentTransaction.method.name}</div>
            </div>
            <div>
              <span className="text-gray-600">Fees:</span>
              <div>${currentTransaction.fees.toFixed(2)}</div>
            </div>
          </div>

          {currentTransaction.details.depositAddress && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <Label className="text-sm font-medium">Deposit Address:</Label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="flex-1 text-xs bg-white p-2 rounded border">
                  {currentTransaction.details.depositAddress}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(currentTransaction.details.depositAddress)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentTransaction.status === 'processing' && (
            <div className="text-center">
              <div className="animate-pulse text-sm text-blue-600">
                Please wait while we process your payment...
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <ArrowUpFromLine className="h-4 w-4" />
          <span>{t('payment.deposit')}</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ArrowUpFromLine className="h-5 w-5" />
            <span>{t('payment.addFunds')}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              {t('user.currentBalance')}: <strong>${userBalance.toFixed(2)}</strong>
            </p>
          </div>

          {currentTransaction ? (
            renderTransactionProgress()
          ) : !selectedMethod ? (
            <Tabs defaultValue="fiat" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fiat" className="flex items-center space-x-2">
                  <Banknote className="h-4 w-4" />
                  <span>Fiat Currency</span>
                </TabsTrigger>
                <TabsTrigger value="crypto" className="flex items-center space-x-2">
                  <Wallet className="h-4 w-4" />
                  <span>Cryptocurrency</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="fiat" className="space-y-3">
                {paymentMethods.filter(m => m.type === 'fiat').map((method) => (
                  <Card key={method.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleMethodSelect(method)}>
                    <CardContent className="flex items-center space-x-4 p-4">
                      <div className="w-12 h-12 flex items-center justify-center">
                        {method.icon.startsWith('http') ? (
                          <img src={method.icon} alt={method.name} className="w-8 h-8" />
                        ) : (
                          <span className="text-2xl">{method.icon}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{method.name}</h3>
                        <p className="text-sm text-gray-600">{method.description}</p>
                        <p className="text-xs text-gray-500">
                          Min: ${method.minAmount} • Max: ${method.maxAmount} •
                          Fees: ${method.fees.fixed} + {method.fees.percentage}% • 
                          {method.processingTime}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="crypto" className="space-y-3">
                {paymentMethods.filter(m => m.type === 'crypto').map((method) => (
                  <Card key={method.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleMethodSelect(method)}>
                    <CardContent className="flex items-center space-x-4 p-4">
                      <div className="w-12 h-12 flex items-center justify-center">
                        <img src={method.icon} alt={method.name} className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{method.name}</h3>
                        <p className="text-sm text-gray-600">{method.description}</p>
                        <p className="text-xs text-gray-500">
                          Min: ${method.minAmount} • Max: ${method.maxAmount} • 
                          Fees: {method.fees.percentage}% • {method.processingTime}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedMethod(null)}
                      className="p-1"
                    >
                      ←
                    </Button>
                    <span>{selectedMethod.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={selectedMethod.minAmount}
                      max={selectedMethod.maxAmount}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Min: ${selectedMethod.minAmount} • Max: ${selectedMethod.maxAmount}
                      {amount && (
                        <> • Fees: ${calculateFees(parseFloat(amount), selectedMethod).toFixed(2)}</>
                      )}
                    </p>
                  </div>

                  {renderMethodDetails()}

                  <Button 
                    onClick={handleDeposit}
                    disabled={!amount || parseFloat(amount) < selectedMethod.minAmount || isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Deposit
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositMethods;
