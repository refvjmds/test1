import React, { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawing, ApiResponse } from "@shared/types";
import { Calendar, Award, TrendingUp } from "lucide-react";

const Ziehung: React.FC = () => {
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
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayOverrides, setDisplayOverrides] = useState<{manualTitle?: string; manualDate?: string; manualTime?: string}>({});

  useEffect(() => {
    fetchCurrentDrawing();
    fetchDisplayOverrides();
  }, []);

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

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(getLocale()).format(num);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white rounded-t-3xl min-h-screen">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('drawing.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('drawing.subtitle')}
          </p>
        </div>

        {/* Current Jackpot */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">{t('drawing.currentJackpot')}</h2>
              <div className="text-5xl md:text-6xl font-bold text-yellow-300 mb-4">
                {currentDrawing
                  ? formatNumber(currentDrawing.jackpotAmount)
                  : "75.000.000"}{" "}
                $
              </div>
              <p className="text-lg opacity-90">
                {t('drawing.nextDrawing')}:{" "}
                {currentDrawing
                  ? formatDate(currentDrawing.date)
                  : displayOverrides.manualDate && displayOverrides.manualTime ? (
                      (() => {
                        const date = new Date(`${displayOverrides.manualDate}T${displayOverrides.manualTime}:00.000+02:00`);
                        const dayName = date.toLocaleDateString(language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'it-IT', { weekday: 'long' });
                        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                        return `${capitalizedDay}, ${displayOverrides.manualTime} Uhr`;
                      })()
                    ) : (
                      t('drawing.fridayTime')
                    )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Winning Numbers */}
        {currentDrawing && currentDrawing.mainNumbers.length > 0 ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Award className="h-6 w-6 text-yellow-600" />
                <span>{t('drawing.currentWinningNumbers')}</span>
              </CardTitle>
              <p className="text-gray-600">
                {t('drawing.drawnOn')} {formatDate(currentDrawing.date)}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="flex justify-center items-center space-x-6 flex-wrap mb-6">
                  {/* Main Numbers */}
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">
                      {t('drawing.mainNumbers')}
                    </h3>
                    <div className="flex space-x-3">
                      {currentDrawing.mainNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg"
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-3xl font-bold text-gray-400">+</div>

                  {/* World Numbers */}
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">
                      WorldZahlen
                    </h3>
                    <div className="flex space-x-3">
                      {currentDrawing.worldNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="w-16 h-16 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold text-xl shadow-lg"
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Winners by Class */}
                {Object.keys(currentDrawing.winnersByClass).length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">
                      {t('drawing.winnersPerClass')}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(currentDrawing.winnersByClass).map(
                        ([winClass, count]) => (
                          <div
                            key={winClass}
                            className="bg-gray-50 p-4 rounded-lg text-center"
                          >
                            <div className="font-bold text-lg text-blue-600">
                              Klasse {winClass}
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {count}
                            </div>
                            <div className="text-sm text-gray-600">
                              Gewinner
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
                <span>Nächste Ziehung</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎲</div>
                <h3 className="text-xl font-semibold mb-2">
                  {t('drawing.noDrawing')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('drawing.nextDrawingTime')}{" "}
                  <strong>
                    {displayOverrides.manualDate && displayOverrides.manualTime ? (
                      (() => {
                        const date = new Date(`${displayOverrides.manualDate}T${displayOverrides.manualTime}:00.000+02:00`);
                        const dayName = date.toLocaleDateString(language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'it-IT', { weekday: 'long' });
                        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                        return `${capitalizedDay}, ${displayOverrides.manualTime} Uhr`;
                      })()
                    ) : (
                      t('drawing.fridayTime')
                    )}
                  </strong>
                </p>
                <Badge
                  variant="outline"
                  className="text-blue-600 border-blue-200"
                >
                  {t('drawing.cutoffInfo')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prize Classes Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Gewinnklassen</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-bold text-yellow-800">
                  {t('drawing.class1')}
                </div>
                <div className="text-sm text-yellow-700">
                  {t('drawing.class1desc')}
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  {t('drawing.chance')} 1 : 139.838.160
                </div>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-bold text-blue-800">{t('drawing.class2')}</div>
                <div className="text-sm text-blue-700">
                  {t('drawing.class2desc')}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Chance: 1 : 6.991.908
                </div>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-bold text-green-800">{t('drawing.class3')}</div>
                <div className="text-sm text-green-700">
                  {t('drawing.class3desc')}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {t('drawing.chance')} 1 : 3.107.515
                </div>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="font-bold text-purple-800">{t('drawing.class4')}</div>
                <div className="text-sm text-purple-700">
                  {t('drawing.class4desc')}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {t('drawing.chance')} 1 : 621.503
                </div>
              </div>
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="font-bold text-indigo-800">{t('drawing.class5')}</div>
                <div className="text-sm text-indigo-700">
                  {t('drawing.class5desc')}
                </div>
                <div className="text-xs text-indigo-600 mt-1">
                  {t('drawing.chance')} 1 : 31.075
                </div>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="font-bold text-gray-800">Klassen 6-12</div>
                <div className="text-sm text-gray-700">
                  Weitere Gewinnklassen
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Verschiedene Kombinationen
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">
            📋 {t('drawing.info.title')}
          </h3>
          <ul className="space-y-1 text-blue-700 text-sm">
            <li>
              • {t('drawing.info.schedule')}
            </li>
            <li>• {t('drawing.info.cutoff')}</li>
            <li>• {t('drawing.info.automatic')}</li>
            <li>
              ��� {t('drawing.info.notification')}
            </li>
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
            <p className="text-gray-300 text-sm">{t('footer.liveDrawings')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Ziehung;
