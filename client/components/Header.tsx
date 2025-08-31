import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, languageInfo } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, User, LogOut, Settings, Languages, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import WalletSelector from "./WalletSelector";
import PayoutMethods from "./PayoutMethods";
import DepositMethods from "./DepositMethods";

const Header: React.FC = () => {
  const { user, login, register, logout, connectWallet } = useAuth();
  const { language, setLanguage, t } = useLanguage();

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
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(loginForm);

    if (result.success) {
      setIsAuthDialogOpen(false);
      setLoginForm({ email: "", password: "" });
      toast.success("Successfully logged in!");
    } else {
      toast.error(result.error || "Login failed");
    }

    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    const result = await register({
      email: registerForm.email,
      password: registerForm.password,
    });

    if (result.success) {
      setIsAuthDialogOpen(false);
      setRegisterForm({ email: "", password: "", confirmPassword: "" });
      toast.success("Account created successfully!");
    } else {
      toast.error(result.error || "Registration failed");
    }

    setIsLoading(false);
  };

  const handleConnectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        if (accounts.length > 0) {
          const success = await connectWallet(accounts[0]);
          if (success) {
            toast.success("Wallet connected successfully!");
          } else {
            toast.error("Failed to connect wallet");
          }
        }
      } catch (error) {
        toast.error("Failed to connect MetaMask");
      }
    } else {
      toast.error("MetaMask is not installed");
    }
  };

  const handleWalletConnection = async (walletId: string, address: string) => {
    const success = await connectWallet(address);
    if (!success) {
      toast.error("Failed to connect wallet to account");
    }
  };

  return (
    <header className="bg-black shadow-lg border-b border-gray-800 relative pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 pt-2 sm:pt-0">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F402154b5f0d94c8e8de8b82354390da9%2F1efa9d49721f44139fbd3c83fab3a610?format=png"
                alt="World Jackpot Logo"
                className="h-24 w-auto cursor-pointer hover:opacity-90 transition-opacity duration-200 drop-shadow-2xl filter brightness-110 contrast-110 saturate-110 animate-pulse"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(218, 165, 32, 0.8)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 60px rgba(184, 134, 11, 0.3))',
                  animation: 'pulse 2s infinite'
                }}
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                to="/"
                className="text-white hover:text-black hover:bg-amber-500 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
              >
                {t('nav.tickets')}
              </Link>

              <Link
                to="/gewinnzahlen"
                className="text-white hover:text-black hover:bg-amber-500 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
              >
                {t('nav.winningNumbers')}
              </Link>
              {user && (
                <Link
                  to="/meine-scheine"
                  className="text-white hover:text-black hover:bg-amber-500 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                >
                  {t('nav.myTickets')}
                </Link>
              )}
              <Link
                to="/help"
                className="text-white hover:text-black hover:bg-amber-500 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
              >
                {t('nav.help')}
              </Link>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-black hover:bg-amber-500"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-white hover:text-black hover:bg-amber-500">
                  <Languages className="h-4 w-4" />
                  <span className="text-lg">{languageInfo[language].flag}</span>
                  <span className="text-xs uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                {Object.entries(languageInfo).map(([langCode, info]) => (
                  <DropdownMenuItem
                    key={langCode}
                    onClick={() => setLanguage(langCode as any)}
                    className="flex items-center space-x-2"
                  >
                    <span className="text-base">{info.flag}</span>
                    <span>{info.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {user ? (
              <div className="flex items-center space-x-4">
                {user.isAdmin && (
                  <Link to="/admin">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white"
                    >
                      <Settings className="h-4 w-4" />
                      <span>{t('nav.adminPanel')}</span>
                    </Button>
                  </Link>
                )}

                {/* User Account Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2 text-white hover:text-black hover:bg-amber-500 px-3 py-2"
                    >
                      <User className="h-5 w-5" />
                      <span className="hidden sm:inline text-sm">{user.email.split('@')[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-4">
                    {/* User Info Header */}
                    <div className="flex items-center space-x-3 pb-4 border-b">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          {user.isAdmin ? t('user.administrator') : t('user.member')}
                        </p>
                      </div>
                    </div>

                    {/* Balance Section */}
                    <div className="py-4 border-b">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">{t('user.currentBalance')}</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(user.balance)}
                        </span>
                      </div>

                      {/* Payment Actions */}
                      <div className="flex space-x-2">
                        <DepositMethods
                          userBalance={user.balance}
                          onDeposit={(transaction) => {
                            window.location.reload();
                          }}
                        />
                        <PayoutMethods
                          userBalance={user.balance}
                          onPayout={(transaction) => {
                            window.location.reload();
                          }}
                        />
                      </div>
                    </div>

                    {/* Wallet Section */}
                    <div className="py-4 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{t('user.walletConnection')}</span>
                        {user.walletAddress && (
                          <span className="text-xs text-green-600 font-medium">{t('user.connected')}</span>
                        )}
                      </div>

                      {user.walletAddress ? (
                        <div className="bg-gray-50 p-2 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">{t('user.connectedWallet')}</p>
                          <code className="text-xs font-mono bg-white p-1 rounded border">
                            {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-8)}
                          </code>
                        </div>
                      ) : (
                        <WalletSelector
                          onConnect={handleWalletConnection}
                          className="w-full"
                        />
                      )}
                    </div>

                    {/* Account Actions */}
                    <div className="pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                        className="w-full flex items-center justify-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t('user.logout')}</span>
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Dialog
                open={isAuthDialogOpen}
                onOpenChange={setIsAuthDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black">{t('nav.login')}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <VisuallyHidden>
                      <DialogTitle>{t('nav.login')}</DialogTitle>
                    </VisuallyHidden>
                    <div className="text-center mb-4">
                      <img
                        src="https://cdn.builder.io/api/v1/image/assets%2F402154b5f0d94c8e8de8b82354390da9%2F1efa9d49721f44139fbd3c83fab3a610?format=png"
                        alt="World Jackpot Logo"
                        className="h-20 w-auto mx-auto mb-3 drop-shadow-2xl filter brightness-110 contrast-110 saturate-110 animate-pulse"
                        style={{
                          filter: 'drop-shadow(0 0 20px rgba(218, 165, 32, 0.8)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 60px rgba(184, 134, 11, 0.3))',
                          animation: 'pulse 2s infinite'
                        }}
                      />
                      <h2 className="text-2xl font-bold mb-2">{t('nav.login')}</h2>
                      <p className="text-gray-600 text-sm">{t('auth.loginToPlay')}</p>
                    </div>
                  </DialogHeader>

                  <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                      <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="login">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">{t('auth.email')}</Label>
                          <Input
                            id="login-email"
                            type="email"
                            value={loginForm.email}
                            onChange={(e) =>
                              setLoginForm({
                                ...loginForm,
                                email: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">{t('auth.password')}</Label>
                          <Input
                            id="login-password"
                            type="password"
                            value={loginForm.password}
                            onChange={(e) =>
                              setLoginForm({
                                ...loginForm,
                                password: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? t('auth.loggingIn') : t('auth.login')}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="register">
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-email">{t('auth.email')}</Label>
                          <Input
                            id="register-email"
                            type="email"
                            value={registerForm.email}
                            onChange={(e) =>
                              setRegisterForm({
                                ...registerForm,
                                email: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-password">{t('auth.password')}</Label>
                          <Input
                            id="register-password"
                            type="password"
                            value={registerForm.password}
                            onChange={(e) =>
                              setRegisterForm({
                                ...registerForm,
                                password: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-confirm-password">
                            {t('auth.confirmPassword')}
                          </Label>
                          <Input
                            id="register-confirm-password"
                            type="password"
                            value={registerForm.confirmPassword}
                            onChange={(e) =>
                              setRegisterForm({
                                ...registerForm,
                                confirmPassword: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? t('auth.registering') : t('auth.register')}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black border-t border-gray-700 absolute top-full left-0 right-0 z-50 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block text-white hover:text-black hover:bg-amber-500 px-3 py-2 rounded-md text-base font-medium transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('nav.tickets')}
            </Link>
            <Link
              to="/gewinnzahlen"
              className="block text-white hover:text-black hover:bg-amber-500 px-3 py-2 rounded-md text-base font-medium transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('nav.winningNumbers')}
            </Link>
            {user && (
              <Link
                to="/meine-scheine"
                className="block text-white hover:text-black hover:bg-amber-500 px-3 py-2 rounded-md text-base font-medium transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('nav.myTickets')}
              </Link>
            )}
            <Link
              to="/help"
              className="block text-white hover:text-black hover:bg-amber-500 px-3 py-2 rounded-md text-base font-medium transition-all duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('nav.help')}
            </Link>

            {/* Mobile User Section */}
            <div className="border-t border-gray-700 pt-4 mt-4">
              {/* Language Selector */}
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Language:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{languageInfo[language].flag}</span>
                    <span className="text-xs uppercase text-white">{language}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Object.entries(languageInfo).slice(0, 6).map(([langCode, info]) => (
                    <Button
                      key={langCode}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLanguage(langCode as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`text-xs border-amber-400 text-white hover:bg-amber-500 hover:text-black ${language === langCode ? 'bg-amber-600 text-black' : 'bg-gray-800'}`}
                    >
                      <span className="mr-1">{info.flag}</span>
                      {langCode.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {user ? (
                <div className="space-y-4">
                  {user.isAdmin && (
                    <Link
                      to="/admin"
                      className="block text-white hover:text-black hover:bg-amber-500 px-3 py-2 rounded-md text-base font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 inline mr-2" />
                      {t('nav.adminPanel')}
                    </Link>
                  )}

                  {/* Mobile User Account Card */}
                  <div className="mx-3 bg-gray-800 rounded-lg p-4 border border-gray-700">
                    {/* User Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{user.email}</p>
                        <p className="text-gray-400 text-xs">
                          {user.isAdmin ? t('user.administrator') : t('user.member')}
                        </p>
                      </div>
                    </div>

                    {/* Balance Section */}
                    <div className="mb-4 pb-4 border-b border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-300 text-sm">{t('nav.balance')}:</span>
                        <span className="text-green-400 font-bold text-lg">
                          {formatCurrency(user.balance)}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <DepositMethods
                          userBalance={user.balance}
                          onDeposit={(transaction) => {
                            window.location.reload();
                          }}
                        />
                        <PayoutMethods
                          userBalance={user.balance}
                          onPayout={(transaction) => {
                            window.location.reload();
                          }}
                        />
                      </div>
                    </div>

                    {/* Wallet Section */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 text-sm">{t('user.walletConnection')}:</span>
                        {user.walletAddress && (
                          <span className="text-green-400 text-xs font-medium">{t('user.connected')}</span>
                        )}
                      </div>

                      {user.walletAddress ? (
                        <div className="bg-gray-700 p-2 rounded">
                          <code className="text-xs text-gray-300 font-mono">
                            {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-8)}
                          </code>
                        </div>
                      ) : (
                        <WalletSelector
                          onConnect={handleWalletConnection}
                          className="w-full"
                        />
                      )}
                    </div>

                    {/* Logout Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('user.logout')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2">
                  <Dialog
                    open={isAuthDialogOpen}
                    onOpenChange={setIsAuthDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {t('nav.login')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <VisuallyHidden>
                          <DialogTitle>{t('nav.login')}</DialogTitle>
                        </VisuallyHidden>
                        <div className="text-center mb-4">
                          <img
                            src="https://cdn.builder.io/api/v1/image/assets%2F402154b5f0d94c8e8de8b82354390da9%2F1efa9d49721f44139fbd3c83fab3a610?format=png"
                            alt="World Jackpot Logo"
                            className="h-20 w-auto mx-auto mb-3 drop-shadow-2xl filter brightness-110 contrast-110 saturate-110 animate-pulse"
                            style={{
                              filter: 'drop-shadow(0 0 20px rgba(218, 165, 32, 0.8)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 60px rgba(184, 134, 11, 0.3))',
                              animation: 'pulse 2s infinite'
                            }}
                          />
                          <h2 className="text-2xl font-bold mb-2">{t('nav.login')}</h2>
                          <p className="text-gray-600 text-sm">{t('auth.loginToPlay')}</p>
                        </div>
                      </DialogHeader>

                      <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                          <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                          <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="mobile-login-email">{t('auth.email')}</Label>
                              <Input
                                id="mobile-login-email"
                                type="email"
                                value={loginForm.email}
                                onChange={(e) =>
                                  setLoginForm({
                                    ...loginForm,
                                    email: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="mobile-login-password">{t('auth.password')}</Label>
                              <Input
                                id="mobile-login-password"
                                type="password"
                                value={loginForm.password}
                                onChange={(e) =>
                                  setLoginForm({
                                    ...loginForm,
                                    password: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={isLoading}
                            >
                              {isLoading ? t('auth.loggingIn') : t('auth.login')}
                            </Button>
                          </form>
                        </TabsContent>

                        <TabsContent value="register">
                          <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="mobile-register-email">{t('auth.email')}</Label>
                              <Input
                                id="mobile-register-email"
                                type="email"
                                value={registerForm.email}
                                onChange={(e) =>
                                  setRegisterForm({
                                    ...registerForm,
                                    email: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="mobile-register-password">{t('auth.password')}</Label>
                              <Input
                                id="mobile-register-password"
                                type="password"
                                value={registerForm.password}
                                onChange={(e) =>
                                  setRegisterForm({
                                    ...registerForm,
                                    password: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="mobile-register-confirm-password">
                                {t('auth.confirmPassword')}
                              </Label>
                              <Input
                                id="mobile-register-confirm-password"
                                type="password"
                                value={registerForm.confirmPassword}
                                onChange={(e) =>
                                  setRegisterForm({
                                    ...registerForm,
                                    confirmPassword: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={isLoading}
                            >
                              {isLoading ? t('auth.registering') : t('auth.register')}
                            </Button>
                          </form>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
