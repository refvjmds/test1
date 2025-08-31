import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import LotteryTicketForm from "@/components/LotteryTicketForm";
import { Drawing, LotteryTicket, ApiResponse, WINNING_CLASSES } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, TrendingUp, Award, Timer } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";

const Index: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [latestCompletedDrawing, setLatestCompletedDrawing] = useState<Drawing | null>(null);
  const [userTickets, setUserTickets] = useState<LotteryTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawingHistory, setDrawingHistory] = useState<Drawing[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [nextDrawingTime, setNextDrawingTime] = useState<Date | null>(null);
  const [currentWinners, setCurrentWinners] = useState<Record<number, number>>({});
  const [displayOverrides, setDisplayOverrides] = useState<{manualTitle?: string; manualDate?: string; manualTime?: string}>({});
  const [lastDrawingId, setLastDrawingId] = useState<string | null>(null);
  const [currentPrizeAmounts, setCurrentPrizeAmounts] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchCurrentDrawing();
    fetchLatestCompletedDrawing();
    fetchDrawingHistory();
    fetchAutoDrawingStatus();
    fetchDisplayOverrides();
    fetchCurrentPrizeAmounts();
  }, [user]);

  // Separate effect for fetching user tickets when currentDrawing changes
  useEffect(() => {
    if (user && currentDrawing) {
      fetchUserTickets();
    }
  }, [user, currentDrawing]);

  useEffect(() => {
    fetchCurrentWinners();
  }, [latestCompletedDrawing]);

  const fetchCurrentDrawing = async () => {
    try {
      const response = await fetch("/api/lottery/current-drawing");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Check if this is a new drawing (different ID from last known drawing)
          if (lastDrawingId && lastDrawingId !== data.data.id) {
            // New drawing detected - reset main page tickets display
            setUserTickets([]);
            console.log("New drawing detected - clearing main page tickets display");
          }

          setCurrentDrawing(data.data);
          setLastDrawingId(data.data.id);
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

  const fetchUserTickets = async () => {
    try {
      // Only fetch and display tickets if we have a current drawing context
      if (!currentDrawing) {
        return;
      }

      const token = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch("/api/lottery/my-tickets", {
        headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Filter tickets to only show those for the current drawing
          const currentDrawingTickets = data.data.filter((ticket: any) =>
            ticket.drawingId === currentDrawing.id
          );
          setUserTickets(currentDrawingTickets);
        }
      }
    } catch (error) {
      console.error("Error fetching user tickets:", error);
    }
  };

  const fetchDrawingHistory = async () => {
    try {
      const response = await fetch("/api/lottery/drawing-history");
      if (response.ok) {
        const data: ApiResponse<Drawing[]> = await response.json();
        if (data.success && data.data) {
          setDrawingHistory(data.data);
          // Set the most recent completed drawing as default
          const completedDrawings = data.data.filter(d => d.mainNumbers.length > 0);
          if (completedDrawings.length > 0) {
            setSelectedDrawing(completedDrawings[0]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching drawing history:", error);
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

  const fetchCurrentWinners = async () => {
    try {
      if (latestCompletedDrawing && latestCompletedDrawing.winnersByClass) {
        setCurrentWinners(latestCompletedDrawing.winnersByClass);
      }
    } catch (error) {
      console.error("Error setting current winners:", error);
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

  const fetchCurrentPrizeAmounts = async () => {
    try {
      // First try to get actual winning amounts from the latest completed drawing
      const actualResponse = await fetch("/api/lottery/actual-winning-amounts");
      if (actualResponse.ok) {
        const actualData = await actualResponse.json();
        if (actualData.success && actualData.data && actualData.data.actualAmounts) {
          // Merge actual amounts with fallback minimum prizes
          const prizeAmounts: Record<number, number> = {};

          // Fill with minimum prizes first
          WINNING_CLASSES.forEach(winClass => {
            prizeAmounts[winClass.class] = winClass.minPrize;
          });

          // Override with actual amounts where available
          Object.entries(actualData.data.actualAmounts).forEach(([classStr, amount]) => {
            prizeAmounts[parseInt(classStr)] = amount as number;
          });

          setCurrentPrizeAmounts(prizeAmounts);
          console.log("📊 Using actual winning amounts from latest drawing:", prizeAmounts);
          return;
        }
      }

      // Fallback to current prize amounts API
      const response = await fetch("/api/lottery/current-prize-amounts");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.prizeAmounts) {
          setCurrentPrizeAmounts(data.data.prizeAmounts);
          console.log("📊 Using fallback prize amounts:", data.data.prizeAmounts);
        }
      }
    } catch (error) {
      console.error("Error fetching current prize amounts:", error);
    }
  };

  const getAvailableYears = (): string[] => {
    const years = new Set<string>();
    drawingHistory.forEach(drawing => {
      const year = new Date(drawing.date).getFullYear().toString();
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  };

  const getDrawingsForYear = (year: string): Drawing[] => {
    return drawingHistory
      .filter(drawing => {
        const drawingYear = new Date(drawing.date).getFullYear().toString();
        return drawingYear === year && drawing.mainNumbers.length > 0; // Only completed drawings
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const scrollToTicketForm = () => {
    const ticketFormElement = document.getElementById('ticket-form-section');
    if (ticketFormElement) {
      ticketFormElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
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

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(getLocale()).format(num);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(getLocale(), {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-white">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-black">
      <Header />

      {/* Hero Section with Beach Background */}
      <section
        className="relative min-h-[15vh] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4)), url('https://cdn.builder.io/api/v1/image/assets%2Fe1428730c9e4420aae65084be1d74260%2F0dfb6978725945aea8707f626f6f76b6?format=png')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-amber-700/80"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-2">
          {/* Logo Section */}
          <div className="text-center mb-0 relative z-20">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F402154b5f0d94c8e8de8b82354390da9%2F1efa9d49721f44139fbd3c83fab3a610?format=png"
              alt="World Jackpot Logo"
              className="h-64 md:h-80 lg:h-96 xl:h-[28rem] w-auto mx-auto drop-shadow-2xl filter brightness-110 contrast-110 saturate-110 transform hover:scale-105 transition-transform duration-300"
              style={{
                filter: 'drop-shadow(0 0 30px rgba(218, 165, 32, 0.9)) drop-shadow(0 0 60px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 90px rgba(184, 134, 11, 0.4))'
              }}
            />
          </div>

          {/* Jackpot Display - Separate Box */}
          <div className="flex justify-center mb-0 relative z-10" style={{marginTop: '-10px'}}>
            <div className="bg-black/80 backdrop-blur-sm rounded-3xl p-6 md:p-8 border-4 border-amber-400 shadow-2xl">
              <div className="text-center">
                <div className="text-sm md:text-base text-amber-400 font-semibold mb-2">
                  {t('hero.currentJackpot')}
                </div>
                <div className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-2 tracking-tight">
                  {currentDrawing
                    ? formatNumber(currentDrawing.jackpotAmount)
                    : "75.000.000"}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-amber-400">
                  {t('common.euro')}
                </div>
                <div className="text-xs md:text-sm text-gray-200 mt-2">
                  {t('hero.winningChance')}
                </div>
              </div>
            </div>
          </div>

          {/* Next Drawing Info */}
          <div className="text-center text-white mb-1">
            <p className="text-lg md:text-xl font-semibold mb-2">
              {displayOverrides.manualTitle || t('hero.nextChance')}
            </p>
            <p className="text-2xl md:text-3xl font-bold mb-4">
              {nextDrawingTime
                ? `${new Date(nextDrawingTime).toLocaleDateString(getLocale(), {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })} ${t('format.timeAt', { time: displayOverrides.manualTime || "21:00" })}`
                : displayOverrides.manualDate && displayOverrides.manualTime
                ? `${new Date(displayOverrides.manualDate).toLocaleDateString(getLocale(), {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })} ${t('format.timeAt', { time: displayOverrides.manualTime })}`
                : t('common.fridayTime')}
            </p>

            {/* Countdown Timer */}
            {nextDrawingTime && (
              <CountdownTimer
                targetDate={nextDrawingTime}
                onExpired={() => {
                  // Refresh the page data when countdown expires
                  fetchCurrentDrawing();
                  fetchAutoDrawingStatus();
                }}
                className="text-white"
              />
            )}
          </div>

          {/* Play Button */}
          <div className="text-center mb-2">
            <Button
              size="lg"
              onClick={scrollToTicketForm}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xl px-12 py-6 rounded-full shadow-2xl border-2 border-amber-300 transform hover:scale-105 transition-all duration-200"
            >
              {t('hero.playNow')}
            </Button>
          </div>
        </div>
      </section>

      {/* Winning Numbers Section */}
      <section className="bg-gradient-to-r from-amber-600 to-yellow-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
              {t('hero.worldJackpot')}
            </h2>
            <h3 className="text-2xl md:text-3xl font-bold text-black mb-8">
              {t('nav.winningNumbers')}
            </h3>

            {/* Date Selectors */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
              <select
                className="bg-white rounded-full px-6 py-3 text-black font-semibold border-none shadow-lg"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  const drawingsInYear = getDrawingsForYear(e.target.value);
                  if (drawingsInYear.length > 0) {
                    setSelectedDrawing(drawingsInYear[0]);
                  }
                }}
              >
                {getAvailableYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                className="bg-white rounded-full px-6 py-3 text-black font-semibold border-none shadow-lg"
                value={selectedDrawing?.id || ""}
                onChange={(e) => {
                  const drawing = drawingHistory.find(d => d.id === e.target.value);
                  setSelectedDrawing(drawing || null);
                }}
              >
                {getDrawingsForYear(selectedYear).map(drawing => (
                  <option key={drawing.id} value={drawing.id}>
                    {formatDate(drawing.date)}
                  </option>
                ))}
              </select>
            </div>

            {/* Winning Numbers Display */}
            {selectedDrawing && selectedDrawing.mainNumbers.length > 0 && (
              <div className="flex justify-center items-center space-x-4 flex-wrap gap-4">
                <div className="flex space-x-2">
                  {selectedDrawing.mainNumbers.map((number, index) => (
                    <div
                      key={index}
                      className="w-12 h-12 md:w-16 md:h-16 bg-white text-black rounded-full flex items-center justify-center font-bold text-lg md:text-xl border-2 border-black shadow-lg"
                    >
                      {number}
                    </div>
                  ))}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-black">+</div>
                <div className="flex space-x-2">
                  {selectedDrawing.worldNumbers.map((number, index) => (
                    <div
                      key={index}
                      className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-b from-amber-200 to-amber-400 text-black rounded-full flex items-center justify-center font-bold text-lg md:text-xl border-2 border-black shadow-lg"
                    >
                      {number}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white rounded-t-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Lottery Ticket Form */}
          <div id="ticket-form-section" className="lg:col-span-2 order-2 lg:order-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{t('form.title')}</CardTitle>
                <p className="text-gray-600">
                  {t('form.description')}
                </p>
              </CardHeader>
              <CardContent>
                <LotteryTicketForm onTicketPurchased={fetchUserTickets} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 md:space-y-6 order-1 lg:order-2">
            {/* User Stats */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>{t('sidebar.myStats')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>{t('nav.balance')}:</span>
                    <span className="font-bold text-green-600">
                      ${user.balance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('sidebar.activeTickets')}:</span>
                    <span className="font-bold">{userTickets.length}</span>
                  </div>
                  <Separator />
                  <div className="text-sm text-gray-600">
                    <p>{t('sidebar.costPerTicket')}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* How to Play */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>{t('sidebar.howToPlay')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <p>{t('sidebar.step1')}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <p>{t('sidebar.step2')}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <p>{t('sidebar.step3')}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <p>{t('sidebar.step4')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Next Drawing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Timer className="h-5 w-5" />
                  <span>{t('sidebar.nextDrawing')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {displayOverrides.manualDate && displayOverrides.manualTime
                      ? `${new Date(displayOverrides.manualDate).toLocaleDateString(getLocale(), {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}`
                      : nextDrawingTime
                      ? formatDate(nextDrawingTime.toISOString())
                      : currentDrawing
                      ? formatDate(currentDrawing.date)
                      : t('sidebar.todayDefault')}
                  </div>
                  <p className="text-sm text-gray-600">
                    {displayOverrides.manualTime
                      ? (() => {
                          const [hours, minutes] = displayOverrides.manualTime.split(':');
                          const cutoffHour = parseInt(hours) - 1;
                          return t('drawing.cutoffDynamic', { time: `${cutoffHour.toString().padStart(2, '0')}:${minutes}` });
                        })()
                      : t('sidebar.cutoffTime')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Combined Winning Classes & Current Winners */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>{t('sidebar.winningClasses')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-4 gap-2 font-bold border-b pb-2 text-xs">
                    <span>{t('sidebar.class')}</span>
                    <span>{t('sidebar.correct')}</span>
                    <span>{t('sidebar.winners')}</span>
                    <span>{t('sidebar.prize')}</span>
                  </div>
                  {WINNING_CLASSES.map((winClass) => {
                    const winnersCount = currentWinners[winClass.class] || 0;
                    const prizeAmount = currentPrizeAmounts[winClass.class] || winClass.minPrize;
                    const hasWinners = winnersCount > 0;

                    return (
                      <div
                        key={winClass.class}
                        className={`grid grid-cols-4 gap-2 items-center ${hasWinners ? 'bg-green-50 rounded p-2 border border-green-200' : ''}`}
                      >
                        <span className={`font-semibold ${hasWinners ? 'text-green-800' : ''}`}>
                          {winClass.class}
                        </span>
                        <span className={`${hasWinners ? 'text-green-700' : 'text-gray-600'}`}>
                          {winClass.requirement}
                        </span>
                        <span className={`font-bold ${hasWinners ? 'text-green-600' : 'text-gray-400'}`}>
                          {hasWinners ? `${winnersCount}x` : '-'}
                        </span>
                        <span className={`font-bold ${hasWinners ? 'text-blue-600' : 'text-gray-400'}`}>
                          {hasWinners ? `$${formatNumber(prizeAmount)}` : '-'}
                        </span>
                      </div>
                    );
                  })}

                  {Object.keys(currentWinners).length > 0 && (
                    <div className="pt-3 border-t">
                      <div className="text-xs text-gray-500 mb-2">
                        {t('sidebar.totalClasses', { count: WINNING_CLASSES.length })}
                      </div>
                      <div className="bg-amber-50 p-3 rounded border border-amber-200">
                        <div className="font-bold text-amber-800 text-sm">
                          💰 {t('sidebar.totalPayout')}: {Object.entries(currentWinners)
                            .reduce((total, [winClass, count]) => {
                              const prizeAmount = currentPrizeAmounts[parseInt(winClass)] || 0;
                              return total + (prizeAmount * count);
                            }, 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-amber-700 mt-1">
                          Gewinner: {Object.values(currentWinners).reduce((total, count) => total + count, 0)}x
                        </div>
                      </div>
                    </div>
                  )}

                  {Object.keys(currentWinners).length === 0 && (
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      {t('sidebar.totalClasses', { count: WINNING_CLASSES.length })} • {t('sidebar.noWinnersInDrawing')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* User Tickets - Only show for current drawing, resets after each drawing */}
        {user && userTickets.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>{t('myTickets.title')} - {t('common.currentDrawing')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userTickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">
                        {t('myTickets.ticketNumber')}{ticket.id.slice(-6)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex space-x-1">
                        {ticket.mainNumbers.map((number, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold"
                          >
                            {number}
                          </div>
                        ))}
                      </div>
                      <span className="text-lg">+</span>
                      <div className="flex space-x-1">
                        {ticket.worldNumbers.map((number, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-bold"
                          >
                            {number}
                          </div>
                        ))}
                      </div>
                      <div className="ml-auto">
                        <span className="font-bold">
                          ${ticket.cost.toFixed(2)}
                        </span>
                        {ticket.isWinner && (
                          <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                            {t('myTickets.winner')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-12 mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F402154b5f0d94c8e8de8b82354390da9%2F1efa9d49721f44139fbd3c83fab3a610?format=png"
                alt="World Jackpot Logo"
                className="h-32 w-auto mb-6 drop-shadow-2xl filter brightness-110 contrast-110 saturate-110 animate-pulse"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(218, 165, 32, 0.8)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.5)) drop-shadow(0 0 60px rgba(184, 134, 11, 0.3))',
                  animation: 'pulse 2s infinite'
                }}
              />
              <p className="text-gray-300 text-sm">
                {t('footer.subtitle')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('footer.gameInfo')}</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>{t('footer.gameRules')}</li>
                <li>{t('footer.prizeClasses')}</li>
                <li>{t('footer.drawingTimes')}</li>
                <li>{t('footer.winningNumbers')}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('footer.service')}</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>{t('footer.customerService')}</li>
                <li>{t('footer.faq')}</li>
                <li>{t('footer.contact')}</li>
                <li>{t('nav.help')}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('footer.legal')}</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>{t('footer.imprint')}</li>
                <li>{t('footer.privacy')}</li>
                <li>{t('footer.terms')}</li>
                <li>{t('footer.protection')}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-600 mt-8 pt-8 text-center text-sm text-gray-300">
            <p>{t('footer.rights')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
