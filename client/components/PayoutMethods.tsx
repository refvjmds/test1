import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Banknote, Wallet, ArrowDownToLine, CheckCircle, AlertCircle, Clock } from 'lucide-react';
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

interface PayoutMethodsProps {
  userBalance: number;
  onPayout?: (transaction: Transaction) => void;
}

const PayoutMethods: React.FC<PayoutMethodsProps> = ({ userBalance, onPayout }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
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
          toast.success(`Withdrawal completed! $${transaction.amountReceived} sent to your ${transaction.method.name}`);
          onPayout?.(transaction);
          setIsOpen(false);
          setCurrentTransaction(null);
        } else if (transaction.status === 'failed') {
          toast.error('Withdrawal failed. Your balance has been restored.');
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

  const validateWithdrawalDetails = (): boolean => {
    if (!selectedMethod) return false;

    switch (selectedMethod.id) {
      case 'bank_transfer':
        if (!details.iban || details.iban.length < 15) {
          toast.error('Valid IBAN is required');
          return false;
        }
        if (!details.account_holder) {
          toast.error('Account holder name is required');
          return false;
        }
        break;
      case 'paypal':
        if (!details.paypal_email || !details.paypal_email.includes('@')) {
          toast.error('Valid PayPal email is required');
          return false;
        }
        break;
      case 'credit_card':
        if (!details.card_number || details.card_number.length < 16) {
          toast.error('Valid card number is required');
          return false;
        }
        break;
      case 'bitcoin':
      case 'ethereum':
      case 'usdt':
        if (!details.crypto_address) {
          toast.error('Crypto wallet address is required');
          return false;
        }
        // Validate address format
        if (selectedMethod.id === 'bitcoin' && !details.crypto_address.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,59}$/)) {
          toast.error('Invalid Bitcoin address format');
          return false;
        }
        if ((selectedMethod.id === 'ethereum' || selectedMethod.id === 'usdt') && !details.crypto_address.match(/^0x[a-fA-F0-9]{40}$/)) {
          toast.error('Invalid Ethereum address format');
          return false;
        }
        break;
    }

    return true;
  };

  const handlePayout = async () => {
    if (!selectedMethod || !amount) return;

    const payoutAmount = parseFloat(amount);
    if (payoutAmount < selectedMethod.minAmount) {
      toast.error(`Minimum amount is $${selectedMethod.minAmount}`);
      return;
    }

    if (payoutAmount > selectedMethod.maxAmount) {
      toast.error(`Maximum amount is $${selectedMethod.maxAmount}`);
      return;
    }

    if (payoutAmount > userBalance) {
      toast.error('Insufficient balance');
      return;
    }

    // Validate required fields
    if (!validateWithdrawalDetails()) {
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          methodId: selectedMethod.id,
          amount: payoutAmount,
          details
        })
      });

      const data = await response.json();

      if (data.success) {
        const transaction = data.data;
        setCurrentTransaction(transaction);
        toast.success('Withdrawal initiated! Processing...');

        // Clear form but keep dialog open to show progress
        setAmount('');
        setDetails({});
      } else {
        toast.error(data.error || 'Failed to initiate withdrawal');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to process withdrawal');
    } finally {
      setIsProcessing(false);
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
          return 'Preparing withdrawal...';
        case 'processing':
          return 'Processing withdrawal...';
        case 'completed':
          return 'Withdrawal completed!';
        case 'failed':
          return 'Withdrawal failed';
        default:
          return 'Unknown status';
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>Withdrawal Status</span>
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
            <div>
              <span className="text-gray-600">You'll receive:</span>
              <div className="font-bold text-green-600">${currentTransaction.amountReceived?.toFixed(2)}</div>
            </div>
          </div>

          {currentTransaction.details.txHash && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <Label className="text-sm font-medium">Transaction Hash:</Label>
              <div className="text-xs bg-white p-2 rounded border mt-1 font-mono">
                {currentTransaction.details.txHash}
              </div>
            </div>
          )}

          {currentTransaction.status === 'processing' && (
            <div className="text-center">
              <div className="animate-pulse text-sm text-blue-600">
                Please wait while we process your withdrawal...
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderMethodDetails = () => {
    if (!selectedMethod) return null;

    switch (selectedMethod.id) {
      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                placeholder="DE89 3704 0044 0532 0130 00"
                value={details.iban || ''}
                onChange={(e) => handleDetailsChange('iban', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="account_holder">Account Holder Name</Label>
              <Input
                id="account_holder"
                placeholder="John Doe"
                value={details.account_holder || ''}
                onChange={(e) => handleDetailsChange('account_holder', e.target.value)}
              />
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

      case 'visa':
      case 'mastercard':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="card_number">Card Number</Label>
              <Input
                id="card_number"
                placeholder="**** **** **** 1234"
                value={details.card_number || ''}
                onChange={(e) => handleDetailsChange('card_number', e.target.value)}
              />
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
        return (
          <div>
            <Label htmlFor="crypto_address">Wallet Address</Label>
            <Input
              id="crypto_address"
              placeholder="0x... or bc1..."
              value={details.crypto_address || ''}
              onChange={(e) => handleDetailsChange('crypto_address', e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center space-x-2"
          disabled={userBalance <= 0}
        >
          <ArrowDownToLine className="h-4 w-4" />
          <span>{t('payment.withdraw')}</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ArrowDownToLine className="h-5 w-5" />
            <span>{t('payment.withdrawFunds')}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Available Balance: <strong>${userBalance.toFixed(2)}</strong>
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
                      max={Math.min(selectedMethod.maxAmount, userBalance)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Min: ${selectedMethod.minAmount} • Max: ${Math.min(selectedMethod.maxAmount, userBalance).toFixed(2)}
                      {amount && (
                        <> • Fees: ${calculateFees(parseFloat(amount), selectedMethod).toFixed(2)} •
                        You'll receive: ${(parseFloat(amount) - calculateFees(parseFloat(amount), selectedMethod)).toFixed(2)}</>
                      )}
                    </p>
                  </div>

                  {renderMethodDetails()}

                  <Button 
                    onClick={handlePayout}
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
                        Confirm Withdrawal
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

export default PayoutMethods;
