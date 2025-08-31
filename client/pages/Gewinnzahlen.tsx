import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawing, ApiResponse, LotteryTicket, WINNING_CLASSES } from "@shared/types";
import { Calendar, Award, Ticket, User, Trophy, Star } from "lucide-react";

const Gewinnzahlen: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [latestCompletedDrawing, setLatestCompletedDrawing] = useState<Drawing | null>(null);
  const [currentDrawingTickets, setCurrentDrawingTickets] = useState<LotteryTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayOverrides, setDisplayOverrides] = useState<{manualTitle?: string; manualDate?: string; manualTime?: string}>({});
  const [nextDrawingTime, setNextDrawingTime] = useState<Date | null>(null);

  useEffect(() => {
    fetchCurrentDrawing();
    fetchLatestCompletedDrawing();
    fetchDisplayOverrides();
    fetchAutoDrawingStatus();
    if (user) {
      fetchCurrentDrawingTickets();
    }
  }, [user]);

  const fetchCurrentDrawing = async () => {
    try {
      const response = await fetch("/api/lottery/current-drawing");
      if (response.ok) {
        const data: ApiResponse<Drawing> = await response.json();
        if (data.success && data.data) {
          setCurrentDrawing(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching current drawing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLatestCompletedDrawing = async () => {
    try {
      const response = await fetch("/api/lottery/latest-completed-drawing");
      if (response.ok) {
        const data: ApiResponse<Drawing> = await response.json();
        if (data.success && data.data) {
          setLatestCompletedDrawing(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching latest completed drawing:", error);
    }
  };

  const fetchCurrentDrawingTickets = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {};

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/current-drawing-tickets", { headers });
      if (response.ok) {
        const data: ApiResponse<LotteryTicket[]> = await response.json();
        if (data.success && data.data) {
          setCurrentDrawingTickets(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching current drawing tickets:", error);
    }
  };

  const fetchDisplayOverrides = async () => {
    try {
      const response = await fetch("/api/display-overrides");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDisplayOverrides(data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching display overrides:", error);
    }
  };

  const fetchAutoDrawingStatus = async () => {
    try {
      const response = await fetch("/api/auto-drawing/status");
      if (response.ok) {
        const data: ApiResponse<any> = await response.json();
        if (data.success && data.data && data.data.nextScheduledTime) {
          setNextDrawingTime(new Date(data.data.nextScheduledTime));
        }
      }
    } catch (error) {
      console.error("Error fetching auto-drawing status:", error);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("de-DE").format(num);
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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getWinningClassInfo = (winClass: number) => {
    const classInfo = WINNING_CLASSES.find(wc => wc.class === winClass);
    return classInfo;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section with Beach Background */}
      <section
        className="relative h-64 md:h-80 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4)), url('https://cdn.builder.io/api/v1/image/assets%2Fe1428730c9e4420aae65084be1d74260%2Fc66d1046e30948b5b74bc0c69df616b1?format=png')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-amber-700/80"></div>

        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-2xl">
              {t('winningNumbers.title')}
            </h1>
            <p className="text-lg md:text-xl drop-shadow-lg">
              {t('winningNumbers.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white rounded-t-3xl min-h-screen">


        {/* Current Jackpot */}
        <Card className="mb-8 bg-black border-2 border-amber-400">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4 text-amber-400">{t('winningNumbers.currentJackpot')}</h2>
              <div className="text-5xl md:text-6xl font-bold text-white mb-4">
                {currentDrawing
                  ? formatNumber(currentDrawing.jackpotAmount)
                  : "75.000.000"}{" "}
                {t('common.euro')}
              </div>
              <p className="text-lg text-gray-200 mb-2">
                {displayOverrides.manualTitle || t('hero.nextChance')}
              </p>
              <p className="text-2xl md:text-3xl font-bold text-white">
                {displayOverrides.manualDate && displayOverrides.manualTime
                  ? `${new Date(displayOverrides.manualDate).toLocaleDateString(getLocale(), {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })} ${t('format.timeAt', { time: displayOverrides.manualTime })}`
                  : nextDrawingTime
                  ? new Date(nextDrawingTime).toLocaleDateString(getLocale(), {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }) + " " + t('format.timeAt', { time: "21:00" })
                  : currentDrawing
                  ? formatDate(currentDrawing.date)
                  : displayOverrides.manualDate && displayOverrides.manualTime ? (
                      (() => {
                        const date = new Date(`${displayOverrides.manualDate}T${displayOverrides.manualTime}:00.000+02:00`);
                        const dayName = date.toLocaleDateString(language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'it-IT', { weekday: 'long' });
                        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                        return `${capitalizedDay}, ${displayOverrides.manualTime} Uhr`;
                      })()
                    ) : (
                      t('common.fridayTime')
                    )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Winning Numbers */}
        {latestCompletedDrawing && latestCompletedDrawing.mainNumbers.length > 0 ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Award className="h-6 w-6 text-amber-600" />
                <span>{t('winningNumbers.currentWinningNumbers')}</span>
              </CardTitle>
              <p className="text-gray-600">
                {t('winningNumbers.drawnOn')} {formatDate(latestCompletedDrawing.date)}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-6 mb-6">
                  {/* Main Numbers */}
                  <div className="flex flex-col items-center">
                    <h3 className="text-base md:text-lg font-semibold mb-3 text-gray-800">
                      {t('winningNumbers.mainNumbers')}
                    </h3>
                    <div className="flex space-x-2 md:space-x-3">
                      {latestCompletedDrawing.mainNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 text-black border-2 border-black rounded-full flex items-center justify-center font-bold text-lg md:text-xl shadow-lg"
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-2xl md:text-3xl font-bold text-gray-400">+</div>

                  {/* World Numbers */}
                  <div className="flex flex-col items-center">
                    <h3 className="text-base md:text-lg font-semibold mb-3 text-gray-800">
                      World
                    </h3>
                    <div className="flex space-x-2 md:space-x-3">
                      {latestCompletedDrawing.worldNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="w-12 h-12 md:w-16 md:h-16 bg-amber-300 text-black border-2 border-black rounded-full flex items-center justify-center font-bold text-lg md:text-xl shadow-lg"
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Winners by Class */}
                {Object.keys(latestCompletedDrawing.winnersByClass).length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">
                      {t('winningNumbers.winnersByClass')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                      {Object.entries(latestCompletedDrawing.winnersByClass).map(
                        ([winClass, count]) => (
                          <div
                            key={winClass}
                            className="bg-gray-50 p-4 rounded-lg text-center"
                          >
                            <div className="font-bold text-lg text-black">
                              {t('winningNumbers.class')} {winClass}
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {count}
                            </div>
                            <div className="text-sm text-gray-600">
                              {t('winningNumbers.winners')}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>{t('winningNumbers.nextDrawing')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎲</div>
                <h3 className="text-xl font-semibold mb-2">
                  {t('winningNumbers.noDrawing')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('winningNumbers.nextDrawingTime')}{" "}
                  <strong>
                    {displayOverrides.manualDate && displayOverrides.manualTime ? (
                      (() => {
                        const date = new Date(`${displayOverrides.manualDate}T${displayOverrides.manualTime}:00.000+02:00`);
                        const dayName = date.toLocaleDateString(language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'it-IT', { weekday: 'long' });
                        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                        return `${capitalizedDay}, ${displayOverrides.manualTime} Uhr`;
                      })()
                    ) : (
                      t('winningNumbers.fridayTime')
                    )}
                  </strong>
                </p>
                <Badge
                  variant="outline"
                  className="text-black border-black"
                >
                  {t('winningNumbers.cutoffTime')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Drawing Tickets */}
        {user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ticket className="h-5 w-5 text-black" />
                <span>{t('winningNumbers.myTicketsForDrawing')}</span>
              </CardTitle>
              <p className="text-gray-600">
                {currentDrawingTickets.length > 0
                  ? `${currentDrawingTickets.length} ${t('winningNumbers.ticketsForNext')}`
                  : t('winningNumbers.noTicketsForDrawing')
                }
              </p>
            </CardHeader>
            <CardContent>
              {currentDrawingTickets.length > 0 ? (
                <div className="space-y-4">
                  {currentDrawingTickets.map((ticket) => {
                    const isWinner = ticket.isWinner && ticket.winningClass;
                    const winClassInfo = isWinner ? getWinningClassInfo(ticket.winningClass!) : null;

                    // Only allow animation for tickets from completed drawings (not waiting tickets)
                    const isFromCompletedDrawing = ticket.drawingId !== currentDrawing?.id;
                    const shouldAnimate = isWinner && isFromCompletedDrawing;

                    return (
                    <div
                      key={ticket.id}
                      className={`p-4 border rounded-lg transition-all duration-300 ${
                        shouldAnimate
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400 shadow-lg animate-pulse'
                          : ticket.drawingId === currentDrawing?.id
                          ? 'bg-gradient-to-r from-yellow-25 to-amber-25 border-yellow-200 hover:bg-yellow-50'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-semibold text-gray-900">
                            {t('myTickets.ticketNumber')}{ticket.id.slice(-6)}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            {new Date(ticket.createdAt).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                          {/* Show which drawing this ticket belongs to */}
                          {ticket.drawingId === currentDrawing?.id ? (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                              {t('winningNumbers.upcomingDrawing')}
                            </span>
                          ) : (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {t('winningNumbers.pastDrawing')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-green-600">
                            {new Intl.NumberFormat("de-DE", {
                              style: "currency",
                              currency: "USD",
                            }).format(ticket.cost)}
                          </span>
                          {isWinner && isFromCompletedDrawing ? (
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-yellow-600 animate-pulse">
                                <Trophy className="h-3 w-3 mr-1" />
                                {t('common.winningClass')} {ticket.winningClass}
                              </Badge>
                              <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-600">
                                <Star className="h-3 w-3 mr-1" />
                                {new Intl.NumberFormat("de-DE", {
                                  style: "currency",
                                  currency: "USD",
                                }).format(ticket.winningAmount || 0)}
                              </Badge>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className={
                                ticket.drawingId === currentDrawing?.id
                                  ? "text-yellow-800 border-yellow-400 bg-yellow-50 font-medium"
                                  : "text-blue-700 border-blue-300 bg-blue-50 font-medium"
                              }
                            >
                              {ticket.drawingId === currentDrawing?.id
                                ? t('winningNumbers.waiting')
                                : t('winningNumbers.active')
                              }
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Main Numbers */}
                        <div className="flex flex-col items-start space-y-2">
                          <span className="text-sm font-medium text-gray-600">
                            {t('myTickets.mainNumbers')}
                          </span>
                          <div className="flex space-x-1">
                            {ticket.mainNumbers.map((number, index) => {
                              // Only highlight numbers for tickets from completed drawings
                              const isFromCompletedDrawing = ticket.drawingId !== currentDrawing?.id;
                              const isMatch = isFromCompletedDrawing && latestCompletedDrawing && latestCompletedDrawing.mainNumbers.includes(number);
                              const isWaitingTicket = ticket.drawingId === currentDrawing?.id;

                              return (
                                <div
                                  key={index}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-all duration-300 ${
                                    isMatch
                                      ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-black border-yellow-600 shadow-lg animate-bounce'
                                      : isWaitingTicket
                                      ? 'bg-yellow-100 text-black border-yellow-400'
                                      : 'bg-gray-100 text-black border-black'
                                  }`}
                                >
                                  {number}
                                </div>
                              );
                            })}
                          </div>
                        </div>


                        <span className="text-lg font-bold text-gray-400 self-end pb-2">+</span>

                        {/* World Numbers */}
                        <div className="flex flex-col items-start space-y-2">
                          <span className="text-sm font-medium text-gray-600">
                            {t('myTickets.worldNumbers')}
                          </span>
                          <div className="flex space-x-1">
                            {ticket.worldNumbers.map((number, index) => {
                              // Only highlight numbers for tickets from completed drawings
                              const isFromCompletedDrawing = ticket.drawingId !== currentDrawing?.id;
                              const isMatch = isFromCompletedDrawing && latestCompletedDrawing && latestCompletedDrawing.worldNumbers.includes(number);
                              const isWaitingTicket = ticket.drawingId === currentDrawing?.id;

                              return (
                                <div
                                  key={index}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-all duration-300 ${
                                    isMatch
                                      ? 'bg-gradient-to-br from-amber-300 to-orange-400 text-black border-amber-600 shadow-lg animate-bounce'
                                      : isWaitingTicket
                                      ? 'bg-yellow-200 text-black border-yellow-400'
                                      : 'bg-amber-200 text-black border-black'
                                  }`}
                                >
                                  {number}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Win Details */}
                      {isWinner && isFromCompletedDrawing && winClassInfo && (
                        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border border-yellow-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Trophy className="h-5 w-5 text-amber-600" />
                              <span className="font-semibold text-amber-800">
                                {t('common.winningClass')} {ticket.winningClass}: {winClassInfo.requirement}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg text-green-700">
                                {new Intl.NumberFormat("de-DE", {
                                  style: "currency",
                                  currency: "USD",
                                }).format(ticket.winningAmount || 0)}
                              </div>
                              <div className="text-xs text-gray-600">
                                {t('prizes.winningChance', { odds: winClassInfo.odds })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('winningNumbers.noTicketsForDrawing')}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t('winningNumbers.noTicketsForNext')}
                  </p>
                  <button
                    onClick={() => (window.location.href = "/")}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    {t('winningNumbers.buyTicket')}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Login Prompt */}
        {!user && (
          <Card className="mb-8 bg-amber-500 border-amber-400">
            <CardContent className="p-6 text-center">
              <User className="h-12 w-12 text-black mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">
                {t('winningNumbers.loginPrompt')}
              </h3>
              <p className="text-black mb-4">
                {t('winningNumbers.loginToSeeTickets')}
              </p>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                {t('winningNumbers.toLogin')}
              </button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F402154b5f0d94c8e8de8b82354390da9%2F1efa9d49721f44139fbd3c83fab3a610?format=png"
              alt="World Jackpot Logo"
              className="h-32 w-auto mb-6 mx-auto drop-shadow-2xl filter brightness-110 contrast-110 saturate-110 animate-pulse"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(218, 165, 32, 0.8)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 60px rgba(184, 134, 11, 0.3))',
                animation: 'pulse 2s infinite'
              }}
            />
            <p className="text-gray-300 text-sm">{t('footer.winningResults')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Gewinnzahlen;
