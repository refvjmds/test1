import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LotteryTicket, Drawing, ApiResponse, WINNING_CLASSES } from "@shared/types";
import { Ticket, Award, Calendar, User, Trophy, Star } from "lucide-react";

const MeineScheine: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [userTickets, setUserTickets] = useState<LotteryTicket[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [latestCompletedDrawing, setLatestCompletedDrawing] = useState<Drawing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {};

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      // Get current drawing info
      const drawingResponse = await fetch("/api/lottery/current-drawing");
      if (drawingResponse.ok) {
        const drawingData: ApiResponse<Drawing> = await drawingResponse.json();
        if (drawingData.success && drawingData.data) {
          setCurrentDrawing(drawingData.data);
        }
      }

      // Get latest completed drawing
      const latestDrawingResponse = await fetch("/api/lottery/latest-completed-drawing");
      if (latestDrawingResponse.ok) {
        const latestData: ApiResponse<Drawing> = await latestDrawingResponse.json();
        if (latestData.success && latestData.data) {
          setLatestCompletedDrawing(latestData.data);
        }
      }

      // Get user's real tickets
      const ticketsResponse = await fetch("/api/lottery/my-tickets", { headers });
      if (ticketsResponse.ok) {
        const ticketsData: ApiResponse<LotteryTicket[]> = await ticketsResponse.json();
        if (ticketsData.success && ticketsData.data) {
          setUserTickets(ticketsData.data);
        }
      }

      // No demo tickets fallback - only show real user tickets
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(getLocale(), {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getWinningClassText = (winningClass: number): string => {
    const classes = {
      1: "JACKPOT",
      2: "5+1",
      3: "5+0",
      4: "4+2",
      5: "4+1",
      6: "3+2",
      7: "4+0",
      8: "2+2",
      9: "3+1",
      10: "3+0",
      11: "1+2",
      12: "2+1",
    };
    return (
      classes[winningClass as keyof typeof classes] || `Klasse ${winningClass}`
    );
  };

  const getWinningClassInfo = (winClass: number) => {
    const classInfo = WINNING_CLASSES.find(wc => wc.class === winClass);
    return classInfo;
  };

  const compareTicketWithDrawing = (ticket: LotteryTicket, drawing: Drawing | null) => {
    if (!drawing || drawing.mainNumbers.length === 0) {
      return { mainMatches: 0, worldMatches: 0, matchingMainNumbers: [], matchingWorldNumbers: [] };
    }

    const matchingMainNumbers = ticket.mainNumbers.filter(num =>
      drawing.mainNumbers.includes(num)
    );
    const matchingWorldNumbers = ticket.worldNumbers.filter(num =>
      drawing.worldNumbers.includes(num)
    );

    return {
      mainMatches: matchingMainNumbers.length,
      worldMatches: matchingWorldNumbers.length,
      matchingMainNumbers,
      matchingWorldNumbers
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white rounded-t-3xl min-h-screen">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-4">
            {t('myTickets.title')}
          </h1>
          <p className="text-lg text-gray-700">
            {t('myTickets.subtitle')}
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t('myTickets.totalTickets')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userTickets.length}
                  </p>
                </div>
                <Ticket className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('myTickets.winners')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {userTickets.filter((t) => t.isWinner).length}
                  </p>
                </div>
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t('myTickets.totalStake')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(userTickets.length * 2)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-700" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t('myTickets.totalWinnings')}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      userTickets.reduce(
                        (sum, t) => sum + (t.winningAmount || 0),
                        0,
                      ),
                    )}
                  </p>
                </div>
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Login Check */}
        {!user && (
          <Card className="mb-8 bg-white border-2 border-black">
            <CardContent className="p-6 text-center">
              <User className="h-12 w-12 text-black mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">
                {t('winningNumbers.loginPrompt')}
              </h3>
              <p className="text-blue-700">
                {t('myTickets.noTicketsLogin')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ticket className="h-5 w-5" />
              <span>
                {user ? `${t('myTickets.ticketsFrom')} ${user.email}` : t('myTickets.title')}
              </span>
            </CardTitle>
            <p className="text-gray-600">
              {userTickets.length} {t('myTickets.ticketsTotal')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 space-y-2 sm:space-y-0">
                    <div>
                      <span className="font-semibold text-gray-900 block">
                        {t('myTickets.ticketNumber')}{ticket.id.slice(-6)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(ticket.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold">
                        {formatCurrency(ticket.cost)}
                      </span>
                      {ticket.isWinner ? (
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-yellow-600 animate-pulse">
                            <Trophy className="h-3 w-3 mr-1" />
                            {t('common.winningClass')} {ticket.winningClass}
                          </Badge>
                          <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-600">
                            <Star className="h-3 w-3 mr-1" />
                            {formatCurrency(ticket.winningAmount || 0)}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="secondary">{t('myTickets.noWin')}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-end space-y-3 sm:space-y-0 sm:space-x-4">
                      {/* Main Numbers */}
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-600 mb-1">
                          {t('common.mainNumbers')}
                        </span>
                        <div className="flex space-x-1">
                          {ticket.mainNumbers.map((number, index) => (
                            <div
                              key={index}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                                ticket.isWinner &&
                                currentDrawing?.mainNumbers.includes(number)
                                  ? "bg-green-500 text-white"
                                  : "bg-white text-black border-2 border-black"
                              }`}
                            >
                              {number}
                            </div>
                          ))}
                        </div>
                      </div>

                      <span className="text-base sm:text-lg font-bold text-gray-400 self-end pb-1">+</span>

                      {/* World Numbers */}
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-600 mb-1">
                          {t('common.worldNumbers')}
                        </span>
                        <div className="flex space-x-1">
                          {ticket.worldNumbers.map((number, index) => (
                            <div
                              key={index}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                                ticket.isWinner &&
                                currentDrawing?.worldNumbers.includes(number)
                                  ? "bg-green-500 text-white"
                                  : "bg-amber-300 text-black border-2 border-black"
                              }`}
                            >
                              {number}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Winning Info */}
                    {ticket.isWinner && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-700">
                          {t('myTickets.class')} {ticket.winningClass} (
                          {getWinningClassText(ticket.winningClass!)})
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          + {formatCurrency(ticket.winningAmount!)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {userTickets.length === 0 && (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('myTickets.noTickets')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {user
                    ? t('myTickets.noTicketsUser')
                    : t('myTickets.noTicketsLogin')}
                </p>
                {user && (
                  <Button onClick={() => (window.location.href = "/")}>
                    {t('myTickets.buyFirst')}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-300 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">
            📋 {t('myTickets.info.title')}
          </h3>
          <ul className="space-y-1 text-yellow-700 text-sm">
            <li>• {t('myTickets.info.cost')}</li>
            <li>• {t('myTickets.info.highlights')}</li>
            <li>• {t('myTickets.info.automatic')}</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F402154b5f0d94c8e8de8b82354390da9%2F1efa9d49721f44139fbd3c83fab3a610?format=webp&width=800"
              alt="World Jackpot Logo"
              className="h-32 w-auto mb-6 mx-auto drop-shadow-2xl filter brightness-110 contrast-110 saturate-110 animate-pulse"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(218, 165, 32, 0.8)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 60px rgba(184, 134, 11, 0.3))',
                animation: 'pulse 2s infinite'
              }}
            />
            <p className="text-gray-300 text-sm">{t('footer.yourChance')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MeineScheine;
