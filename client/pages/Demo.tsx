import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Demo: React.FC = () => {
  const { user, login } = useAuth();
  const { language } = useLanguage();

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
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [demoStep, setDemoStep] = useState(1);

  useEffect(() => {
    // Auto-login as admin if not already logged in
    if (!user && !isAutoLoggingIn) {
      autoLoginAsAdmin();
    }
  }, [user]);

  const autoLoginAsAdmin = async () => {
    setIsAutoLoggingIn(true);
    try {
      const result = await login({
        email: "Admin@world.com",
        password: "Admin25!",
      });

      if (result.success) {
        toast.success("Automatisch als Admin angemeldet!");
      } else {
        toast.error("Auto-Login fehlgeschlagen");
      }
    } catch (error) {
      console.error("Auto-login error:", error);
      toast.error("Auto-Login fehlgeschlagen");
    } finally {
      setIsAutoLoggingIn(false);
    }
  };

  const performDemoDrawing = async () => {
    try {
      const response = await fetch("/api/demo/perform-drawing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manualNumbers: {
            mainNumbers: [7, 14, 21, 35, 42],
            worldNumbers: [3, 9],
          },
        }),
      });

      const data = response.ok
        ? await response.json()
        : { success: false, error: "Request failed" };

      if (data.success) {
        toast.success("Demo-Ziehung durchgeführt!");
        setDemoStep(2);
        // Reload page to show results
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(
          "Demo-Ziehung fehlgeschlagen: " +
            (data.error || "Unbekannter Fehler"),
        );
      }
    } catch (error) {
      console.error("Demo drawing error:", error);
      toast.error("Demo-Ziehung fehlgeschlagen");
    }
  };

  const updateDemoJackpot = async (amount = 10000000) => {
    try {
      console.log("🚀 Starting jackpot update with amount:", amount);

      const requestBody = {
        newAmount: Number(amount),
        isSimulated: true,
      };

      console.log("📤 Request body:", requestBody);

      const response = await fetch("/api/demo/update-jackpot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response status:", response.status);

      const data = response.ok
        ? await response.json()
        : { success: false, error: `HTTP ${response.status}` };
      console.log("📊 Response data:", data);

      if (data.success) {
        toast.success(
          `Jackpot auf ${(amount / 1000000).toFixed(1)} Millionen geändert!`,
        );
        setDemoStep(3);
        // Reload page to show updated jackpot
        setTimeout(() => window.location.reload(), 1000);
      } else {
        console.error("❌ Server error:", data.error);
        toast.error(
          "Jackpot-Update fehlgeschlagen: " + (data.error || "Server-Fehler"),
        );
      }
    } catch (error) {
      console.error("💥 Jackpot update error:", error);
      toast.error(
        `Jackpot-Update fehlgeschlagen: ${error.message || "Netzwerk-Fehler"}`,
      );
    }
  };

  if (isAutoLoggingIn) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Automatische Admin-Anmeldung...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 bg-white rounded-t-3xl min-h-screen">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">
                Admin-Anmeldung fehlgeschlagen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Die automatische Admin-Anmeldung ist fehlgeschlagen.
              </p>
              <Button onClick={autoLoginAsAdmin}>Erneut versuchen</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-12 bg-white rounded-t-3xl min-h-screen">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">
            🎯 WorldJackpot Admin Demo
          </h1>
          <p className="text-lg text-gray-700">
            Sie sind als Administrator angemeldet: <strong>{user.email}</strong>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Guthaben: {formatCurrency(user.balance)}
          </p>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">
                ⚡ Sofort-Aktionen (ohne Reihenfolge)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  onClick={() => updateDemoJackpot(10000000)}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  💰 10 Mio. $
                </Button>
                <Button
                  onClick={() => updateDemoJackpot(50000000)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-black"
                >
                  �� 50 Mio. $
                </Button>
                <Button
                  onClick={performDemoDrawing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  🎲 Demo-Ziehung
                </Button>
                <Button
                  onClick={() => (window.location.href = "/admin")}
                  className="bg-yellow-700 hover:bg-yellow-800 text-white"
                >
                  🔧 Admin-Panel
                </Button>
              </div>
              <p className="text-green-700 text-sm mt-3">
                Klicken Sie auf eine beliebige Aktion - alle funktionieren
                sofort!
              </p>
            </CardContent>
          </Card>

          {/* Step 1: Drawing Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <span>Demo-Ziehung durchführen</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Führen Sie eine Demo-Ziehung mit vordefinierten Zahlen durch:
                <br />
                <strong>Hauptzahlen:</strong> 7, 14, 21, 35, 42
                <br />
                <strong>WorldZahlen:</strong> 3, 9
              </p>
              <Button
                onClick={performDemoDrawing}
                className="bg-green-600 hover:bg-green-700"
                disabled={demoStep > 1}
              >
                {demoStep > 1
                  ? "✅ Demo-Ziehung durchgeführt"
                  : "🎲 Demo-Ziehung starten"}
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Jackpot Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <span>Jackpot ändern</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                {t('admin.jackpotChangeInfo')}
              </p>
              <Button
                onClick={updateDemoJackpot}
                className="bg-yellow-600 hover:bg-yellow-700"
                disabled={demoStep > 2}
              >
                {demoStep > 2
                  ? "✅ Jackpot geändert"
                  : "💰 Jackpot auf 10 Mio. setzen"}
              </Button>
            </CardContent>
          </Card>

          {/* Step 3: Access Admin Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <span>Admin-Panel besuchen</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Besuchen Sie das vollständige Admin-Panel für erweiterte
                Kontrollen. Sie sehen dort Live-Statistiken, können weitere
                Ziehungen durchführen und alle Einstellungen verwalten.
              </p>
              <div className="space-x-4">
                <Button
                  onClick={() => (window.location.href = "/admin")}
                  className="bg-red-600 hover:bg-red-700"
                >
                  🔧 Zum Admin-Panel
                </Button>
                <Button
                  onClick={() => (window.location.href = "/")}
                  variant="outline"
                >
                  🏠 Zur Hauptseite
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">
                📋 Was Sie jetzt tun können:
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-blue-700">
                <li>
                  • Gehen Sie zum <strong>Admin-Panel</strong> für vollständige
                  Kontrolle
                </li>
                <li>
                  • Besuchen Sie die <strong>Hauptseite</strong> um die
                  Änderungen zu sehen
                </li>
                <li>• Führen Sie weitere Ziehungen mit eigenen Zahlen durch</li>
                <li>• Ändern Sie den Jackpot beliebig oft</li>
                <li>• Überwachen Sie Benutzer und Ticket-Verkäufe</li>
              </ul>
            </CardContent>
          </Card>
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
            <p className="text-gray-300 text-sm">{t('footer.demoArea')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Demo;
