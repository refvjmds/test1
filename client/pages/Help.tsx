import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DynamicDrawingInfo } from "@/components/DynamicDrawingInfo";
import {
  User,
  CreditCard,
  Gamepad2,
  ArrowRight,
  Check,
  AlertCircle,
  Wallet,
  UserPlus,
  LogIn,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Target
} from "lucide-react";

const Help: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              {t('help.title')}
            </h1>
            <p className="text-xl md:text-2xl text-blue-200 max-w-3xl mx-auto">
              {t('help.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <Tabs defaultValue="registration" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="registration" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{t('help.tabs.registration')}</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>{t('help.tabs.payments')}</span>
            </TabsTrigger>
            <TabsTrigger value="gameplay" className="flex items-center space-x-2">
              <Gamepad2 className="h-4 w-4" />
              <span>{t('help.tabs.gameplay')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Registration Tab */}
          <TabsContent value="registration" className="space-y-6">
            <Card >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-2xl">
                  <UserPlus className="h-6 w-6" />
                  <span>{t('help.registration.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-600">
                  {t('help.registration.description')}
                </p>

                {/* Registration Steps */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center space-x-2">
                    <UserPlus className="h-5 w-5" />
                    <span>{t('help.registration.howToRegister')}</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold">{t('help.registration.step1.title')}</h4>
                        <p className="text-gray-600">{t('help.registration.step1.description')}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold">{t('help.registration.step2.title')}</h4>
                        <p className="text-gray-600">{t('help.registration.step2.description')}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold">{t('help.registration.step3.title')}</h4>
                        <p className="text-gray-600">{t('help.registration.step3.description')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Login Steps */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center space-x-2">
                    <LogIn className="h-5 w-5" />
                    <span>{t('help.registration.howToLogin')}</span>
                  </h3>
                  
                  <div className="p-4 border border-gray-300 rounded-lg bg-white">
                    <h4 className="font-semibold mb-2 text-black">{t('help.registration.existingUsers')}</h4>
                    <p className="text-gray-700 text-sm">{t('help.registration.existingUsersDesc')}</p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-2xl">
                  <CreditCard className="h-6 w-6" />
                  <span>{t('help.payments.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-600">
                  {t('help.payments.description')}
                </p>

                {/* Deposit Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center space-x-2">
                    <ArrowUpFromLine className="h-5 w-5 text-green-600" />
                    <span>{t('help.payments.deposits.title')}</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>{t('help.payments.deposits.fiat.title')}</span>
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{t('help.payments.deposits.fiat.method1')}</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{t('help.payments.deposits.fiat.method2')}</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{t('help.payments.deposits.fiat.method3')}</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center space-x-2">
                        <Wallet className="h-4 w-4" />
                        <span>{t('help.payments.deposits.crypto.title')}</span>
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{t('help.payments.deposits.crypto.method1')}</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{t('help.payments.deposits.crypto.method2')}</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{t('help.payments.deposits.crypto.method3')}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">{t('help.payments.deposits.steps.title')}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                        <span className="text-sm">{t('help.payments.deposits.steps.step1')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                        <span className="text-sm">{t('help.payments.deposits.steps.step2')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                        <span className="text-sm">{t('help.payments.deposits.steps.step3')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">4</span>
                        <span className="text-sm">{t('help.payments.deposits.steps.step4')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Withdrawal Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center space-x-2">
                    <ArrowDownFromLine className="h-5 w-5 text-red-600" />
                    <span>{t('help.payments.withdrawals.title')}</span>
                  </h3>

                  <div className="space-y-3">
                    <h4 className="font-semibold">{t('help.payments.withdrawals.steps.title')}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                        <span className="text-sm">{t('help.payments.withdrawals.steps.step1')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                        <span className="text-sm">{t('help.payments.withdrawals.steps.step2')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                        <span className="text-sm">{t('help.payments.withdrawals.steps.step3')}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">4</span>
                        <span className="text-sm">{t('help.payments.withdrawals.steps.step4')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-800">{t('help.payments.withdrawals.note.title')}</h4>
                        <p className="text-blue-700 text-sm">{t('help.payments.withdrawals.note.description')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gameplay Tab */}
          <TabsContent value="gameplay" className="space-y-6">
            <Card >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-2xl">
                  <Target className="h-6 w-6" />
                  <span>{t('help.gameplay.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-600">
                  {t('help.gameplay.description')}
                </p>

                {/* How to Play */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{t('help.gameplay.howToPlay.title')}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <h4 className="font-semibold mb-2 text-blue-800">{t('help.gameplay.howToPlay.mainNumbers.title')}</h4>
                      <p className="text-blue-700 text-sm">{t('help.gameplay.howToPlay.mainNumbers.description')}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
                      <h4 className="font-semibold mb-2 text-amber-800">{t('help.gameplay.howToPlay.worldNumbers.title')}</h4>
                      <p className="text-amber-700 text-sm">{t('help.gameplay.howToPlay.worldNumbers.description')}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">{t('help.gameplay.playSteps.title')}</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                        <div>
                          <h5 className="font-semibold">{t('help.gameplay.playSteps.step1.title')}</h5>
                          <p className="text-gray-600 text-sm">{t('help.gameplay.playSteps.step1.description')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                        <div>
                          <h5 className="font-semibold">{t('help.gameplay.playSteps.step2.title')}</h5>
                          <p className="text-gray-600 text-sm">{t('help.gameplay.playSteps.step2.description')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                        <div>
                          <h5 className="font-semibold">{t('help.gameplay.playSteps.step3.title')}</h5>
                          <p className="text-gray-600 text-sm">{t('help.gameplay.playSteps.step3.description')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                        <div>
                          <h5 className="font-semibold">{t('help.gameplay.playSteps.step4.title')}</h5>
                          <DynamicDrawingInfo>
                            {({ step4Description, loading }) => (
                              <p className="text-gray-600 text-sm">
                                {loading ? t('help.gameplay.playSteps.step4.description') : step4Description}
                              </p>
                            )}
                          </DynamicDrawingInfo>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Prize Classes */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{t('help.gameplay.prizeClasses.title')}</h3>
                  <p className="text-gray-600">{t('help.gameplay.prizeClasses.description')}</p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left">{t('help.gameplay.prizeClasses.table.class')}</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">{t('help.gameplay.prizeClasses.table.matches')}</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">{t('help.gameplay.prizeClasses.table.odds')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-gradient-to-r from-yellow-100 to-yellow-200">
                          <td className="border border-gray-300 px-4 py-2 font-bold">1</td>
                          <td className="border border-gray-300 px-4 py-2">5 + 2</td>
                          <td className="border border-gray-300 px-4 py-2">1 : 140.000.000</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2 font-semibold">2</td>
                          <td className="border border-gray-300 px-4 py-2">5 + 1</td>
                          <td className="border border-gray-300 px-4 py-2">1 : 12.600.000</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2 font-semibold">3</td>
                          <td className="border border-gray-300 px-4 py-2">5 + 0</td>
                          <td className="border border-gray-300 px-4 py-2">1 : 2.300.000</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">4-12</td>
                          <td className="border border-gray-300 px-4 py-2">{t('help.gameplay.prizeClasses.table.otherClasses')}</td>
                          <td className="border border-gray-300 px-4 py-2">{t('help.gameplay.prizeClasses.table.betterOdds')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator />

                {/* Drawing Information */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{t('help.gameplay.drawings.title')}</h3>
                  <DynamicDrawingInfo>
                    {({ whenDescription, deadlineDescription, loading }) => (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg text-center">
                          <h4 className="font-semibold mb-2">{t('help.gameplay.drawings.when.title')}</h4>
                          <p className="text-gray-600 text-sm">
                            {loading ? t('help.gameplay.drawings.when.description') : whenDescription}
                          </p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <h4 className="font-semibold mb-2">{t('help.gameplay.drawings.deadline.title')}</h4>
                          <p className="text-gray-600 text-sm">
                            {loading ? t('help.gameplay.drawings.deadline.description') : deadlineDescription}
                          </p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <h4 className="font-semibold mb-2">{t('help.gameplay.drawings.results.title')}</h4>
                          <p className="text-gray-600 text-sm">{t('help.gameplay.drawings.results.description')}</p>
                        </div>
                      </div>
                    )}
                  </DynamicDrawingInfo>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Contact Section */}
      <section className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('help.contact.title')}
            </h2>
            <p className="text-gray-600 mb-8">
              {t('help.contact.description')}
            </p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              {t('help.contact.button')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Help;
