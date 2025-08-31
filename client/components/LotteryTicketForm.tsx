import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ApiResponse, TicketPurchaseRequest, CouponValidationResponse } from "@shared/types";
import { toast } from "sonner";
import { Trash2, Plus, Shuffle, Tag, Zap } from "lucide-react";

interface LotteryTicketFormProps {
  onTicketPurchased: () => void;
}

interface TicketData {
  id: string;
  mainNumbers: number[];
  worldNumbers: number[];
}

const LotteryTicketForm: React.FC<LotteryTicketFormProps> = ({
  onTicketPurchased,
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const getLocale = (): string => {
    const localeMap: Record<string, string> = {
      'de': 'de-DE',
      'en': 'en-US',
      'fr': 'fr-FR',
      'es': 'es-ES',
      'it': 'it-IT'
    };
    return localeMap[language] || 'en-US';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };
  const [tickets, setTickets] = useState<TicketData[]>([
    { id: "1", mainNumbers: [], worldNumbers: [] },
  ]);
  const [ticketPrice, setTicketPrice] = useState<number>(2);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quicktipp1kEnabled, setQuicktipp1kEnabled] = useState(false);
  const [salesAllowed, setSalesAllowed] = useState(true);
  const [salesMessage, setSalesMessage] = useState("");
  const [timeUntilDrawing, setTimeUntilDrawing] = useState(0);

  // MetaMask + ETH state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [ethBalance, setEthBalance] = useState<number>(0);
  const [cryptoConfig, setCryptoConfig] = useState<{ asset: 'ETH'; ethUsdPrice: number; chain: 'op-sepolia' | 'op-mainnet'; chainName: string; chainIdHex: string; depositWallet: string; decimals: number; rpcUrl: string } | null>(null);

  // Normalize any error-like value into a user-friendly string
  const toErrMsg = (err: any): string => {
    if (!err) return t('form.submitError');
    if (typeof err === 'string') return err;
    const msg = (err as any)?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    try {
      return JSON.stringify(err);
    } catch {
      // ignore
    }
    try {
      return String(err);
    } catch {
      // ignore
    }
    return t('form.submitError');
  };

  React.useEffect(() => {
    fetchQuicktippStatus();
    fetchSalesStatus();
    fetchCryptoConfig();
    (async () => {
      try {
        const r = await fetch('/api/lottery/price');
        const j = await r.json();
        if (j?.success && j?.data?.price != null) setTicketPrice(Number(j.data.price));
      } catch {}
    })();

    // Check sales status every minute
    const interval = setInterval(fetchSalesStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchQuicktippStatus = async () => {
    try {
      const response = await fetch("/api/lottery/quicktipp-status");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setQuicktipp1kEnabled(data.data.quicktipp1kEnabled);
        }
      }
    } catch (error) {
      console.error("Error fetching quicktipp status:", error);
    }
  };

  const fetchCryptoConfig = async () => {
    try {
      const resp = await fetch('/api/crypto/config');
      const data = await resp.json();
      if (data.success && data.data) {
        setCryptoConfig({
          asset: data.data.asset,
          ethUsdPrice: data.data.ethUsdPrice,
          chain: data.data.chain,
          chainName: data.data.chainName || (data.data.chainIdHex === '0xa' ? 'Optimism' : 'Optimism Sepolia'),
          chainIdHex: data.data.chainIdHex,
          depositWallet: data.data.depositWallet,
          decimals: data.data.decimals,
          rpcUrl: data.data.rpcUrl,
        });
      }
    } catch (e) {
      console.error('Error loading crypto config:', e);
    }
  };

  const fetchSalesStatus = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {};

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/sales-status", { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSalesAllowed(data.data.allowed);
          setSalesMessage(data.data.message || "");
          setTimeUntilDrawing(data.data.timeUntilDrawing || 0);

          // Log exemption status for debugging
          if (data.data.exemptUser) {
            // User is exempt from sales stop
          }
        }
      }
    } catch (error) {
      console.error("Error fetching sales status:", error);
    }
  };

  const generateRandomNumbers = (
    min: number,
    max: number,
    count: number,
    exclude: number[] = [],
  ): number[] => {
    const numbers: number[] = [];
    while (numbers.length < count) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!numbers.includes(num) && !exclude.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  };

  const addTicket = () => {
    const newTicket: TicketData = {
      id: Date.now().toString(),
      mainNumbers: [],
      worldNumbers: [],
    };
    setTickets([...tickets, newTicket]);
  };

  const removeTicket = (ticketId: string) => {
    if (tickets.length === 1) {
      setTickets([{ id: "1", mainNumbers: [], worldNumbers: [] }]);
    } else {
      setTickets(tickets.filter((t) => t.id !== ticketId));
    }
  };

  const updateTicketNumbers = (
    ticketId: string,
    type: "main" | "world",
    numbers: number[],
  ) => {
    setTickets(
      tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              [type === "main" ? "mainNumbers" : "worldNumbers"]: numbers,
            }
          : ticket,
      ),
    );
  };

  const quickPick = (ticketId: string) => {
    const mainNumbers = generateRandomNumbers(1, 50, 5);
    const worldNumbers = generateRandomNumbers(1, 12, 2);

    setTickets(
      tickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, mainNumbers, worldNumbers }
          : ticket,
      ),
    );
  };

  const quickPickMultiple = (count: number) => {
    // Clear existing tickets and create multiple quicktipp tickets
    const newTickets: TicketData[] = [];
    
    for (let i = 0; i < count; i++) {
      const mainNumbers = generateRandomNumbers(1, 50, 5);
      const worldNumbers = generateRandomNumbers(1, 12, 2);
      
      newTickets.push({
        id: `quicktipp-${Date.now()}-${i}`,
        mainNumbers,
        worldNumbers,
      });
    }
    
    setTickets(newTickets);
    toast.success(t('form.quicktippGenerated', { count }));
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponDiscount(0);
      return;
    }

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: couponCode,
          ticketCount: getValidTickets().length,
        }),
      });

      const data: ApiResponse<CouponValidationResponse> = await response.json();

      if (data.success && data.data && data.data.isValid) {
        setCouponDiscount(data.data.discount);
        toast.success(t('form.couponApplied', { discount: data.data.discount }));
      } else {
        setCouponDiscount(0);
        toast.error(data.data?.message || t('form.invalidCouponCode'));
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      setCouponDiscount(0);
      toast.error(t('form.couponCheckError'));
    }
  };

  const isTicketComplete = (ticket: TicketData): boolean => {
    return ticket.mainNumbers.length === 5 && ticket.worldNumbers.length === 2;
  };

  const getValidTickets = (): TicketData[] => {
    return tickets.filter(isTicketComplete);
  };

  const getBaseTicketCost = (): number => {
    return getValidTickets().length * ticketPrice;
  };

  const getTotalCost = (): number => {
    const baseCost = getBaseTicketCost();
    if (couponDiscount > 0) {
      return baseCost * (1 - couponDiscount / 100);
    }
    return baseCost;
  };

  const toWei = (amount: number) => {
    const s = amount.toFixed(18);
    const [i, fRaw] = s.split('.');
    const f = (fRaw || '').padEnd(18, '0').slice(0, 18);
    return BigInt(i) * 10n ** 18n + BigInt(f);
  };

  const getEthBalance = async (addr: string) => {
    if (!cryptoConfig || !(window as any).ethereum) return 0;
    try {
      const result = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [addr, 'latest']
      });
      const bn = BigInt(result);
      const num = Number(bn) / 1e18;
      return Number.isFinite(num) ? num : 0;
    } catch (e) {
      console.error('getEthBalance error:', e);
      return 0;
    }
  };

  const ensureChain = async () => {
    if (!cryptoConfig || !(window as any).ethereum) return false;
    const ethereum = (window as any).ethereum;
    const current = await ethereum.request({ method: 'eth_chainId' });
    if (current === cryptoConfig.chainIdHex) return true;
    try {
      await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cryptoConfig.chainIdHex }] });
      return true;
    } catch (switchErr: any) {
      if (switchErr?.code === 4902) {
        // Add chain
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: cryptoConfig.chainIdHex,
            chainName: cryptoConfig.chainName || 'Optimism',
            rpcUrls: [cryptoConfig.rpcUrl],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
          }]
        });
        return true;
      }
      return false;
    }
  };

  const connectWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      toast.error('MetaMask nicht gefunden');
      return;
    }
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const addr = accounts[0];
    setWalletAddress(addr);
    const ok = await ensureChain();
    setChainOk(ok);
    const bal = await getEthBalance(addr);
    setEthBalance(bal);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t('form.loginRequired'));
      return;
    }

    // Check if sales are allowed before proceeding
    if (!salesAllowed) {
      toast.error(salesMessage || t('form.salesNotAllowed'));
      return;
    }

    const validTickets = getValidTickets();

    if (validTickets.length === 0) {
      toast.error(t('form.completeTicketError'));
      return;
    }

    const totalCost = getTotalCost();

    setIsSubmitting(true);

    try {
      // 1) Try server-side purchase first (handles FREE coupons without MetaMask)
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;

      const basePayload: any = {
        tickets: validTickets.map((ticket) => ({
          mainNumbers: ticket.mainNumbers,
          worldNumbers: ticket.worldNumbers,
        })),
        couponCode: couponCode.trim() || undefined
      };

      let resp = await fetch('/api/lottery/purchase-tickets-eth', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(basePayload)
      });

      let data: ApiResponse = resp.ok ? await resp.json() : { success: false, error: 'Request failed' };

      // 2) If server-first attempt failed and a payment is required (totalCost > 0), perform MetaMask transfer and retry
      if (!data.success && totalCost > 0) {
        if (!cryptoConfig) {
          toast.error('Konfiguration fehlt');
          return;
        }
        // Require MetaMask + chain only for paid flow
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          toast.error('MetaMask nicht gefunden');
          return;
        }
        // Resolve sender locally to avoid state race conditions
        let sender = walletAddress;
        if (!sender) {
          const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
          sender = accounts?.[0];
          if (!sender) {
            toast.error('Wallet konnte nicht verbunden werden');
            return;
          }
          setWalletAddress(sender);
        }
        const okChain = chainOk || await ensureChain();
        setChainOk(okChain);
        if (!okChain) {
          toast.error('Bitte auf Optimism Sepolia wechseln');
          return;
        }
        // Fetch live ETH/USD from server (CoinMarketCap)
        const priceResp = await fetch('/api/crypto/eth-usd');
        const priceJson = priceResp.ok ? await priceResp.json() : { success: false };
        if (!priceJson.success || !priceJson.data?.price) {
          toast.error('Preis konnte nicht geladen werden');
          return;
        }
        const priceUsd: number = Number(priceJson.data.price);
        if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
          toast.error('Ungültiger ETH-Preis');
          return;
        }
        // Compute wei = ceil((USD / priceUsd) * 1e18) using BigInt to avoid precision loss
        const usdScaled = BigInt(Math.round(totalCost * 1e6));
        const priceScaled = BigInt(Math.round(priceUsd * 1e6));
        const numerator = usdScaled * (10n ** 18n);
        const wei = (numerator + priceScaled - 1n) / priceScaled;
        const txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: sender,
            to: cryptoConfig.depositWallet,
            value: '0x' + wei.toString(16)
          }]
        });

        const paidPayload = {
          ...basePayload,
          payment: { chain: cryptoConfig.chain, txHash, sender }
        };

        resp = await fetch('/api/lottery/purchase-tickets-eth', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(paidPayload)
        });
        data = resp.ok ? await resp.json() : { success: false, error: 'Request failed' };
      }

      if (data.success) {
        toast.success(
          t('form.submitSuccess', { count: validTickets.length }),
        );
        setTickets([{ id: "1", mainNumbers: [], worldNumbers: [] }]);
        setCouponCode("");
        setCouponDiscount(0);
        onTicketPurchased();
        // Refresh ETH balance if wallet connected
        if (walletAddress && cryptoConfig) {
          const bal = await getEthBalance(walletAddress);
          setEthBalance(bal);
        }
      } else {
        if ((data as any).salesBlocked) fetchSalesStatus();
        const errMsg = toErrMsg((data as any).error);
        toast.error(errMsg);
      }
    } catch (error: any) {
      console.error("Error purchasing tickets:", error);
      const errMsg = toErrMsg(error);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const NumberSelector: React.FC<{
    title: string;
    selectedNumbers: number[];
    onNumbersChange: (numbers: number[]) => void;
    min: number;
    max: number;
    count: number;
    color: string;
  }> = ({
    title,
    selectedNumbers,
    onNumbersChange,
    min,
    max,
    count,
    color,
  }) => {
    const toggleNumber = (number: number) => {
      const newNumbers = selectedNumbers.includes(number)
        ? selectedNumbers.filter((n) => n !== number)
        : selectedNumbers.length < count
          ? [...selectedNumbers, number].sort((a, b) => a - b)
          : selectedNumbers;

      onNumbersChange(newNumbers);
    };

    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return (
      <div>
        <h4 className="font-semibold mb-3 text-gray-800">{title}</h4>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {numbers.map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => toggleNumber(number)}
              className={`w-10 h-10 rounded-full border-2 font-bold text-sm transition-all duration-200 ${
                selectedNumbers.includes(number)
                  ? `${color} border-transparent shadow-md`
                  : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
              }`}
            >
              {number}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-600">
          {t('form.selectedCount', { selected: selectedNumbers.length, total: count })}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-600 mb-4">
            {t('form.loginPromptUnauth')}
          </p>
          <p className="text-sm text-gray-500">
            {t('form.accountBenefitUnauth')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatTimeUntilDrawing = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Sales Cutoff Warning */}
      {!salesAllowed && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="text-red-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800">
                  🚫 {t('form.salesStopActive')}
                </h3>
                <p className="text-red-700 mt-1">
                  {salesMessage}
                </p>
                {timeUntilDrawing > 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    {t('form.drawingIn')}: {formatTimeUntilDrawing(timeUntilDrawing)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quicktipp Options */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>{t('form.quicktippOptions')}</span>
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => quickPickMultiple(1)}
              disabled={!salesAllowed}
              className="flex items-center space-x-2 h-12"
            >
              <Shuffle className="h-4 w-4" />
              <span>1x Quicktipp</span>
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => quickPickMultiple(5)}
              disabled={!salesAllowed}
              className="flex items-center space-x-2 h-12 bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <Shuffle className="h-4 w-4" />
              <span>5x Quicktipp</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => quickPickMultiple(10)}
              disabled={!salesAllowed}
              className="flex items-center space-x-2 h-12 bg-green-50 hover:bg-green-100 border-green-200"
            >
              <Shuffle className="h-4 w-4" />
              <span>10x Quicktipp</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => quickPickMultiple(20)}
              disabled={!salesAllowed}
              className="flex items-center space-x-2 h-12 bg-purple-50 hover:bg-purple-100 border-purple-200"
            >
              <Shuffle className="h-4 w-4" />
              <span>20x Quicktipp</span>
            </Button>
          </div>

          {quicktipp1kEnabled && (
            <div className="space-y-3 mb-4">
              <h4 className="font-semibold text-gray-800">🔒 Admin Quicktipps</h4>

              {quicktipp1kEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => quickPickMultiple(1000)}
                  disabled={!salesAllowed}
                  className="w-full flex items-center justify-center space-x-2 h-12 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-300 text-green-800 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Shuffle className="h-5 w-5" />
                  <span>1.000x Quicktipp</span>
                  <span className="text-xs bg-green-200 px-2 py-1 rounded">ADMIN</span>
                </Button>
              )}

            </div>
          )}
          
          <p className="text-sm text-gray-600">
            {t('form.quicktippGenerates')}
          </p>
        </CardContent>
      </Card>

      {/* Individual Tickets */}
      {tickets.map((ticket, index) => (
        <Card key={ticket.id} className="relative">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t('form.ticketNumber', { number: index + 1 })}</h3>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickPick(ticket.id)}
                  disabled={!salesAllowed}
                  className="flex items-center space-x-1"
                >
                  <Shuffle className="h-4 w-4" />
                  <span>{t('form.quicktipp')}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTicket(ticket.id)}
                  disabled={!salesAllowed}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <NumberSelector
                title={t('form.fiveMainNumbers50')}
                selectedNumbers={ticket.mainNumbers}
                onNumbersChange={(numbers) =>
                  updateTicketNumbers(ticket.id, "main", numbers)
                }
                min={1}
                max={50}
                count={5}
                color="bg-blue-600 text-white"
              />

              <NumberSelector
                title={t('form.twoWorldNumbers12')}
                selectedNumbers={ticket.worldNumbers}
                onNumbersChange={(numbers) =>
                  updateTicketNumbers(ticket.id, "world", numbers)
                }
                min={1}
                max={12}
                count={2}
                color="bg-yellow-500 text-black"
              />
            </div>

            {isTicketComplete(ticket) && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-green-800 font-semibold">
                    {t('form.ticketComplete')}
                  </span>
                  <span className="text-green-800 font-bold">{formatCurrency(ticketPrice)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add Ticket & Summary */}
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          onClick={addTicket}
          disabled={!salesAllowed}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{t('form.addAnotherTicket')}</span>
        </Button>

        <div className="text-right">
          <div className="text-sm text-gray-600">
            {t('form.validTicketsOf', { valid: getValidTickets().length, total: tickets.length })}
          </div>
          <div className="text-lg font-bold">
            {t('form.totalCost').replace('{cost}$', formatCurrency(getTotalCost()))}
          </div>
        </div>
      </div>

      {/* Coupon Section */}
      {getValidTickets().length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <Label htmlFor="coupon" className="text-sm font-medium flex items-center space-x-2">
                <Tag className="h-4 w-4" />
                <span>{t('form.couponCode')}</span>
              </Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={t('form.enterCouponCode')}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={validateCoupon}
                  disabled={!couponCode.trim()}
                >
                  {t('form.check')}
                </Button>
              </div>
              {couponDiscount > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Gutschein angewendet: {couponDiscount}% Rabatt
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {getValidTickets().length > 0 && (
        <>
          <Separator />
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>Wallet: {walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : 'nicht verbunden'}</p>
              <p>Dein Guthaben: {ethBalance.toFixed(5)} ETH</p>
              {couponDiscount > 0 && (
                <p className="text-green-600">
                  {t('form.savedByCoupon')}: {formatCurrency(getBaseTicketCost() - getTotalCost())}
                </p>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !salesAllowed}
              size="lg"
              className={salesAllowed ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}
            >
              {!salesAllowed
                ? t('form.salesStopped')
                : isSubmitting
                ? t('form.purchasing')
                : t('form.submitTickets', { count: getValidTickets().length }) + ` (${formatCurrency(getTotalCost())})`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default LotteryTicketForm;
