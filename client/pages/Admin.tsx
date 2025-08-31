import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Zap,
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  Play,
  Edit,
  Award,
  BarChart3,
  Clock,
  Brain,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Tag,
  Plus,
  Trash2,
  Power,
  Crown,
  UserPlus,
  UserMinus,
  Globe,
  Shield,
  Search,
} from "lucide-react";
import {
  AdminStats,
  Drawing,
  LotteryTicket,
  ApiResponse,
  JackpotUpdateRequest,
} from "@shared/types";
import { toast } from "sonner";

const Admin: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [latestCompletedDrawing, setLatestCompletedDrawing] = useState<Drawing | null>(null);
  const [allTickets, setAllTickets] = useState<LotteryTicket[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [jackpotUpdateAmount, setJackpotUpdateAmount] = useState("");
  const [isJackpotDialogOpen, setIsJackpotDialogOpen] = useState(false);
  const [manualNumbers, setManualNumbers] = useState({
    main: "",
    world: "",
  });
  const [intelligentDrawingEnabled, setIntelligentDrawingEnabled] = useState(true);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<any>(null);
  const [autoDrawingEnabled, setAutoDrawingEnabled] = useState(true);
  const [nextDrawingTime, setNextDrawingTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [manualDateOverride, setManualDateOverride] = useState("");
  const [manualTimeOverride, setManualTimeOverride] = useState("");
  const [manualTitleOverride, setManualTitleOverride] = useState("");
  const [quicktipp1kEnabled, setQuicktipp1kEnabled] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCoupon, setNewCoupon] = useState({
    discountPercent: 10,
    minTickets: 1,
    maxTickets: 100,
    usageLimit: 50,
    customCode: "", // Custom coupon code
  });
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isDelegatingAdmin, setIsDelegatingAdmin] = useState(false);
  const [pendingJackpotWinners, setPendingJackpotWinners] = useState<LotteryTicket[]>([]);
  const [drawingPreview, setDrawingPreview] = useState<any>(null);
  const [showPreviewMode, setShowPreviewMode] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [manualSalesStopEnabled, setManualSalesStopEnabled] = useState(false);
  const [salesExemptions, setSalesExemptions] = useState<string[]>([]);
  const [newExemptionEmail, setNewExemptionEmail] = useState("");

  // Ticket price state
  const [ticketPriceAdmin, setTicketPriceAdmin] = useState<string>("");

  // Geoblocking state
  const [geoblockingData, setGeoblockingData] = useState<any>(null);
  const [geoblockingLoading, setGeoblockingLoading] = useState(false);
  const [searchCountry, setSearchCountry] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());

  // Redirect if not admin
  if (!user || !user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchAdminData();
    fetchGeoblockingData();
    (async () => {
      try {
        const r = await fetch('/api/lottery/price');
        const j = await r.json();
        if (j?.success && j?.data?.price != null) setTicketPriceAdmin(String(j.data.price));
      } catch {}
    })();
    const interval = setInterval(fetchAdminData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async (retryCount = 0) => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {};

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      // First batch - essential data
      const [statsResponse, drawingResponse, latestDrawingResponse] = await Promise.all([
        fetch("/api/demo/admin-stats", { headers }).catch(err => {
          console.warn("Failed to fetch admin stats:", err);
          return { ok: false };
        }),
        fetch("/api/lottery/current-drawing", { headers }).catch(err => {
          console.warn("Failed to fetch current drawing:", err);
          return { ok: false };
        }),
        fetch("/api/lottery/latest-completed-drawing").catch(err => {
          console.warn("Failed to fetch latest drawing:", err);
          return { ok: false };
        }),
      ]);

      // Second batch - additional data
      const [ticketsResponse, autoDrawingResponse] = await Promise.all([
        fetch("/api/demo/all-tickets", { headers }).catch(err => {
          console.warn("Failed to fetch tickets:", err);
          return { ok: false };
        }),
        fetch("/api/auto-drawing/status").catch(err => {
          console.warn("Failed to fetch auto-drawing status:", err);
          return { ok: false };
        }),
      ]);

      // Third batch - jackpot winners and manual sales stop status (optional)
      let jackpotWinnersResponse, manualSalesResponse;
      try {
        [jackpotWinnersResponse, manualSalesResponse] = await Promise.all([
          fetch("/api/lottery/pending-jackpot-winners", { headers }),
          fetch("/api/lottery/manual-sales-stop-status", { headers })
        ]);
      } catch (err) {
        console.warn("Failed to fetch additional admin data:", err);
        jackpotWinnersResponse = { ok: false };
        manualSalesResponse = { ok: false };
      }

      // Parse responses with better error handling
      const statsData: ApiResponse<AdminStats> = statsResponse.ok
        ? await statsResponse.json().catch(() => ({ success: false }))
        : { success: false };
      const drawingData: ApiResponse<Drawing> = drawingResponse.ok
        ? await drawingResponse.json().catch(() => ({ success: false }))
        : { success: false };
      const latestDrawingData: ApiResponse<Drawing> = latestDrawingResponse.ok
        ? await latestDrawingResponse.json().catch(() => ({ success: false }))
        : { success: false };
      const ticketsData: ApiResponse<LotteryTicket[]> = ticketsResponse.ok
        ? await ticketsResponse.json().catch(() => ({ success: false }))
        : { success: false };
      const autoDrawingData: ApiResponse<any> = autoDrawingResponse.ok
        ? await autoDrawingResponse.json().catch(() => ({ success: false }))
        : { success: false };
      const jackpotWinnersData: ApiResponse<LotteryTicket[]> = jackpotWinnersResponse.ok
        ? await jackpotWinnersResponse.json().catch(() => ({ success: false }))
        : { success: false };
      const manualSalesData: ApiResponse<any> = manualSalesResponse.ok
        ? await manualSalesResponse.json().catch(() => ({ success: false }))
        : { success: false };

      if (statsData.success && statsData.data) {
        setStats(statsData.data);
        setQuicktipp1kEnabled(statsData.data.quicktipp1kEnabled || false);
      }

      if (drawingData.success && drawingData.data) {
        setCurrentDrawing(drawingData.data);
        setJackpotUpdateAmount(drawingData.data.jackpotAmount.toString());
      }

      if (latestDrawingData.success && latestDrawingData.data) {
        setLatestCompletedDrawing(latestDrawingData.data);
      }

      if (ticketsData.success && ticketsData.data) {
        setAllTickets(ticketsData.data);
      }

      if (autoDrawingData.success && autoDrawingData.data) {
        setAutoDrawingEnabled(autoDrawingData.data.enabled);
        if (autoDrawingData.data.nextScheduledTime) {
          setNextDrawingTime(new Date(autoDrawingData.data.nextScheduledTime));
        }
        setCountdown(autoDrawingData.data.countdown);
      }

      if (jackpotWinnersData.success && jackpotWinnersData.data) {
        setPendingJackpotWinners(jackpotWinnersData.data);
      } else {
        // Clear pending jackpot winners if fetch failed
        setPendingJackpotWinners([]);
      }

      if (manualSalesData.success && manualSalesData.data) {
        setManualSalesStopEnabled(manualSalesData.data.manualSalesStopEnabled || false);
      }

      // Fetch sales exemptions
      try {
        const exemptionsResponse = await fetch("/api/lottery/sales-exemptions", { headers });
        if (exemptionsResponse.ok) {
          const exemptionsData = await exemptionsResponse.json();
          if (exemptionsData.success && exemptionsData.data) {
            setSalesExemptions(exemptionsData.data);
          }
        }
      } catch (error) {
        console.warn("Error fetching sales exemptions:", error);
      }

      // Fetch display overrides
      try {
        const overridesResponse = await fetch("/api/display-overrides");
        if (overridesResponse.ok) {
          const overridesData = await overridesResponse.json();
          if (overridesData.success && overridesData.data) {
            setManualTitleOverride(overridesData.data.manualTitle || "");
            setManualDateOverride(overridesData.data.manualDate || "");
            setManualTimeOverride(overridesData.data.manualTime || "");
          }
        }
      } catch (error) {
        console.warn("Error fetching display overrides:", error);
      }

      // Fetch coupons
      try {
        const couponsResponse = await fetch("/api/coupons/all", { headers });
        if (couponsResponse.ok) {
          const couponsData = await couponsResponse.json();
          if (couponsData.success && couponsData.data) {
            setCoupons(couponsData.data);
          }
        }
      } catch (error) {
        console.warn("Error fetching coupons:", error);
      }

      // Fetch admin users (only for super admin)
      if (user?.email === "Admin@world.com") {
        try {
          const adminResponse = await fetch("/api/admin-delegation/list", { headers });
          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            if (adminData.success && adminData.data) {
              setAdminUsers(adminData.data);
            }
          }
        } catch (error) {
          console.warn("Error fetching admin users:", error);
        }
      }
    } catch (error) {
      console.error("Critical error in fetchAdminData:", error);

      // Retry logic for critical failures
      if (retryCount < 2 && error?.message?.includes('fetch')) {
        console.log(`Retrying fetchAdminData (attempt ${retryCount + 1}/2)...`);
        setTimeout(() => fetchAdminData(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }

      // Only show toast for repeated failures
      if (retryCount > 0) {
        toast.error("Failed to load admin data after multiple attempts");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrawing = async () => {
    setIsDrawing(true);
    try {
      let requestBody: any = {
        intelligentDrawing: intelligentDrawingEnabled,
      };

      // Parse manual numbers if provided
      if (manualNumbers.main && manualNumbers.world) {
        const mainNums = manualNumbers.main
          .split(",")
          .map((n) => parseInt(n.trim()))
          .filter((n) => !isNaN(n));
        const worldNums = manualNumbers.world
          .split(",")
          .map((n) => parseInt(n.trim()))
          .filter((n) => !isNaN(n));

        if (mainNums.length === 5 && worldNums.length === 2) {
          requestBody.manualNumbers = {
            mainNumbers: mainNums,
            worldNumbers: worldNums,
          };
        } else {
          toast.error(
            t('form.manualNumbersError'),
          );
          setIsDrawing(false);
          return;
        }
      }

      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/perform-drawing", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      const data: ApiResponse<Drawing> = response.ok
        ? await response.json()
        : { success: false, error: "Request failed" };

      if (data.success && data.data) {
        setCurrentDrawing(data.data);
        setManualNumbers({ main: "", world: "" });

        // Capture analysis results if intelligent drawing was used
        if (data.analysisResult) {
          setLastAnalysisResult(data.analysisResult);
        }

        const successMessage = intelligentDrawingEnabled ?
          t('admin.intelligentDrawingSuccess') :
          "Ziehung erfolgreich durchgeführt!";
        toast.success(successMessage);
        fetchAdminData(); // Refresh all data
      } else {
        toast.error(data.error || "Fehler bei der Ziehung");
      }
    } catch (error) {
      console.error("Error performing drawing:", error);
      toast.error("Fehler bei der Ziehung");
    } finally {
      setIsDrawing(false);
    }
  };

  const handleAutoDrawingToggle = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/auto-drawing/toggle", {
        method: "POST",
        headers,
        body: JSON.stringify({ enabled: !autoDrawingEnabled }),
      });

      const data: ApiResponse<any> = response.ok
        ? await response.json()
        : { success: false, error: "Request failed" };

      if (data.success && data.data) {
        setAutoDrawingEnabled(data.data.enabled);
        if (data.data.nextScheduledTime) {
          setNextDrawingTime(new Date(data.data.nextScheduledTime));
        }
        setCountdown(data.data.countdown);
        toast.success(t('admin.autoDrawingToggleSuccess', { status: data.data.enabled ? t('admin.activated') : t('admin.deactivated') }));
      } else {
        toast.error(data.error || t('admin.autoDrawingToggleError'));
      }
    } catch (error) {
      console.error("Error toggling auto-drawing:", error);
      toast.error(t('admin.autoDrawingToggleError'));
    }
  };

  const handleJackpotUpdate = async () => {
    try {
      const newAmount = parseFloat(jackpotUpdateAmount);

      if (isNaN(newAmount) || newAmount < 0) {
        toast.error("Ungültiger Jackpot-Betrag");
        return;
      }

      const request: JackpotUpdateRequest = {
        newAmount,
        isSimulated: true,
      };

      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/demo/update-jackpot", {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      const data: ApiResponse<Drawing> = response.ok
        ? await response.json()
        : { success: false, error: "Request failed" };

      if (data.success && data.data) {
        setCurrentDrawing(data.data);
        setIsJackpotDialogOpen(false);
        toast.success("Jackpot erfolgreich aktualisiert!");
        fetchAdminData(); // Refresh all data
      } else {
        toast.error(data.error || "Fehler beim Aktualisieren des Jackpots");
      }
    } catch (error) {
      console.error("Error updating jackpot:", error);
      toast.error("Fehler beim Aktualisieren des Jackpots");
    }
  };

  const handlePriceUpdate = async () => {
    try {
      const p = Number(ticketPriceAdmin);
      if (!Number.isFinite(p) || p < 0) {
        toast.error('Ungültiger Ticketpreis');
        return;
      }
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
      const resp = await fetch('/api/lottery/price', { method: 'POST', headers, body: JSON.stringify({ price: p }) });
      const data: ApiResponse<any> = resp.ok ? await resp.json() : { success: false };
      if (data.success) {
        toast.success('Ticketpreis aktualisiert');
        setTicketPriceAdmin(String(data.data.price));
      } else {
        toast.error(data.error || 'Fehler beim Aktualisieren des Ticketpreises');
      }
    } catch (e) {
      toast.error('Fehler beim Aktualisieren des Ticketpreises');
    }
  };

  const handleDisplayOverridesUpdate = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/display-overrides/update", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: manualTitleOverride || undefined,
          date: manualDateOverride || undefined,
          time: manualTimeOverride || undefined,
          globalOverrides: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('admin.overridesSavedSuccess'));
        // Emit event to clear drawing day cache
        window.dispatchEvent(new CustomEvent('displayOverridesUpdated'));
      } else {
        toast.error(data.error || t('admin.overridesSaveError'));
      }
    } catch (error) {
      console.error("Error updating display overrides:", error);
      toast.error(t('admin.overridesSaveError'));
    }
  };

  const handleDisplayOverridesReset = async () => {
    setManualTitleOverride("");
    setManualDateOverride("");
    setManualTimeOverride("");

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/display-overrides/update", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: undefined,
          date: undefined,
          time: undefined,
          globalOverrides: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('admin.overridesResetSuccess'));
        // Emit event to clear drawing day cache
        window.dispatchEvent(new CustomEvent('displayOverridesUpdated'));
      } else {
        toast.error(data.error || t('admin.overridesResetError'));
      }
    } catch (error) {
      console.error("Error resetting display overrides:", error);
      toast.error(t('admin.overridesResetError'));
    }
  };


  const handleQuicktipp1kToggle = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/toggle-quicktipp-1k", {
        method: "POST",
        headers,
      });

      const data = await response.json();

      if (data.success) {
        setQuicktipp1kEnabled(data.data.quicktipp1kEnabled);
        toast.success(`1.000x Quicktipp ${data.data.quicktipp1kEnabled ? 'aktiviert' : 'deaktiviert'}`);
      } else {
        toast.error(data.error || "Fehler beim Umschalten des 1.000x Quicktipp");
      }
    } catch (error) {
      console.error("Error toggling quicktipp 1k:", error);
      toast.error("Fehler beim Umschalten des 1.000x Quicktipp");
    }
  };

  const handleCreateCoupon = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/coupons/create", {
        method: "POST",
        headers,
        body: JSON.stringify(newCoupon),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Gutschein erstellt: ${data.data.code}`);
        fetchAdminData();
        setNewCoupon({
          discountPercent: 10,
          minTickets: 1,
          maxTickets: 100,
          usageLimit: 50,
          customCode: "",
        });
      } else {
        toast.error(data.error || "Fehler beim Erstellen des Gutscheins");
      }
    } catch (error) {
      console.error("Error creating coupon:", error);
      toast.error("Fehler beim Erstellen des Gutscheins");
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {};

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch(`/api/coupons/${code}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Gutschein gelöscht");
        fetchAdminData();
      } else {
        toast.error(data.error || "Fehler beim Löschen des Gutscheins");
      }
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Fehler beim Löschen des Gutscheins");
    }
  };

  const handleToggleCouponStatus = async (code: string) => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch(`/api/coupons/${code}/toggle`, {
        method: "POST",
        headers,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Gutschein-Status geändert");
        fetchAdminData();
      } else {
        toast.error(data.error || "Fehler beim Ändern des Gutschein-Status");
      }
    } catch (error) {
      console.error("Error toggling coupon status:", error);
      toast.error("Fehler beim Ändern des Gutschein-Status");
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {};

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch(`/api/lottery/tickets/${ticketId}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Spielschein gelöscht");
        fetchAdminData(); // Refresh ticket list
      } else {
        toast.error(data.error || "Fehler beim Löschen des Spielscheins");
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Fehler beim Löschen des Spielscheins");
    }
  };

  const handleDeleteSelectedTickets = async () => {
    if (selectedTickets.size === 0) {
      toast.error("Keine Spielscheine ausgewählt");
      return;
    }

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/tickets/delete-multiple", {
        method: "POST",
        headers,
        body: JSON.stringify({ ticketIds: Array.from(selectedTickets) }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${data.data.deletedCount} Spielscheine gelöscht`);
        setSelectedTickets(new Set());
        fetchAdminData(); // Refresh ticket list
      } else {
        toast.error(data.error || "Fehler beim Löschen der Spielscheine");
      }
    } catch (error) {
      console.error("Error deleting multiple tickets:", error);
      toast.error("Fehler beim Löschen der Spielscheine");
    }
  };

  const toggleTicketSelection = (ticketId: string) => {
    const newSelection = new Set(selectedTickets);
    if (newSelection.has(ticketId)) {
      newSelection.delete(ticketId);
    } else {
      newSelection.add(ticketId);
    }
    setSelectedTickets(newSelection);
  };

  const selectAllTickets = () => {
    if (selectedTickets.size === allTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(allTickets.map(ticket => ticket.id)));
    }
  };

  const handleGrantAdminRights = async () => {
    if (!newAdminEmail.trim()) {
      toast.error("Email-Adresse ist erforderlich");
      return;
    }

    setIsDelegatingAdmin(true);
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/admin-delegation/grant", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: newAdminEmail.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Admin-Rechte an ${newAdminEmail} vergeben`);
        setNewAdminEmail("");
        fetchAdminData(); // Refresh data
      } else {
        toast.error(data.error || "Fehler beim Vergeben der Admin-Rechte");
      }
    } catch (error) {
      console.error("Error granting admin rights:", error);
      toast.error("Fehler beim Vergeben der Admin-Rechte");
    } finally {
      setIsDelegatingAdmin(false);
    }
  };

  const handleRevokeAdminRights = async (email: string) => {
    if (email === "Admin@world.com") {
      toast.error("Admin@world.com Rechte können nicht entzogen werden");
      return;
    }

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/admin-delegation/revoke", {
        method: "POST",
        headers,
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Admin-Rechte von ${email} entzogen`);
        fetchAdminData(); // Refresh data
      } else {
        toast.error(data.error || "Fehler beim Entziehen der Admin-Rechte");
      }
    } catch (error) {
      console.error("Error revoking admin rights:", error);
      toast.error("Fehler beim Entziehen der Admin-Rechte");
    }
  };

  const handleJackpotApproval = async (ticketId: string, approved: boolean, reason?: string) => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/approve-jackpot-winner", {
        method: "POST",
        headers,
        body: JSON.stringify({ ticketId, approved, reason }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(approved ? "Jackpot freigegeben!" : "Jackpot abgelehnt");
        fetchAdminData(); // Refresh data
      } else {
        toast.error(data.error || "Fehler bei der Jackpot-Bearbeitung");
      }
    } catch (error) {
      console.error("Error processing jackpot approval:", error);
      toast.error("Fehler bei der Jackpot-Bearbeitung");
    }
  };

  const handleIntelligentDrawingDemo = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      toast.info("Teste intelligente Ziehung... Siehe Server-Logs!");

      const response = await fetch("/api/lottery/demo-intelligent-drawing", {
        method: "POST",
        headers,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("🧪 Intelligente Ziehung getestet! Überprüfe die Server-Logs für Details.");
      } else {
        toast.error(data.error || "Fehler beim Testen der intelligenten Ziehung");
      }
    } catch (error) {
      console.error("Error testing intelligent drawing:", error);
      toast.error("Fehler beim Testen der intelligenten Ziehung");
    }
  };

  const handlePreviewIntelligentDrawing = async () => {
    setIsLoadingPreview(true);
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {};

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch(`/api/lottery/preview-intelligent-drawing?intelligentDrawing=${intelligentDrawingEnabled}`, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (data.success) {
        setDrawingPreview(data.data);
        setShowPreviewMode(true);
        const successMessage = intelligentDrawingEnabled
          ? "🧠 Casino-optimierte Vorschau generiert! Minimiert Auszahlungen."
          : "🎲 Realistische Lottery-Vorschau generiert! Echte Zufallszahlen.";
        toast.success(successMessage);
      } else {
        toast.error(data.error || "Fehler bei der Ziehungs-Vorschau");
      }
    } catch (error) {
      console.error("Error previewing intelligent drawing:", error);
      toast.error("Fehler bei der Vorschau der intelligenten Ziehung");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmDrawingNumbers = async () => {
    if (!drawingPreview) return;

    setIsDrawing(true);
    try {
      const requestBody = {
        intelligentDrawing: false, // We're providing manual numbers
        manualNumbers: {
          mainNumbers: drawingPreview.suggestedNumbers.mainNumbers,
          worldNumbers: drawingPreview.suggestedNumbers.worldNumbers,
        }
      };

      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/perform-drawing", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      const data: ApiResponse<Drawing> = response.ok
        ? await response.json()
        : { success: false, error: "Request failed" };

      if (data.success && data.data) {
        setCurrentDrawing(data.data);
        setShowPreviewMode(false);
        setDrawingPreview(null);
        toast.success("✅ Ziehung mit den ausgewählten Zahlen erfolgreich durchgeführt!");
        fetchAdminData(); // Refresh all data
      } else {
        toast.error(data.error || "Fehler bei der Ziehung");
      }
    } catch (error) {
      console.error("Error confirming drawing:", error);
      toast.error("Fehler bei der Ziehung");
    } finally {
      setIsDrawing(false);
    }
  };

  const handleManualSalesStopToggle = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/toggle-manual-sales-stop", {
        method: "POST",
        headers,
      });

      const data = await response.json();

      if (data.success) {
        setManualSalesStopEnabled(data.data.manualSalesStopEnabled);
        toast.success(`🛑 Manueller Verkaufsstop ${data.data.manualSalesStopEnabled ? 'aktiviert' : 'deaktiviert'}`);

        // If we activated manual sales stop, show admin info
        if (data.data.manualSalesStopEnabled) {
          toast.info("⚡ Administrative Kontrolle aktiviert - Alle Verkäufe gestoppt!");
        } else {
          toast.info("🟢 Verkauf wieder freigegeben - Kunden können wieder kaufen");
        }
      } else {
        toast.error(data.error || "Fehler beim Umschalten des manuellen Verkaufsstopps");
      }
    } catch (error) {
      console.error("Error toggling manual sales stop:", error);
      toast.error("Fehler beim Umschalten des manuellen Verkaufsstopps");
    }
  };

  const handleAddExemption = async () => {
    if (!newExemptionEmail.trim()) {
      toast.error("Email-Adresse ist erforderlich");
      return;
    }

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/sales-exemptions/add", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: newExemptionEmail.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success(`⚡ Verkaufsstop-Befreiung für ${newExemptionEmail} hinzugefügt`);
        setNewExemptionEmail("");
        fetchAdminData(); // Refresh data
      } else {
        toast.error(data.error || "Fehler beim Hinzufügen der Befreiung");
      }
    } catch (error) {
      console.error("Error adding exemption:", error);
      toast.error("Fehler beim Hinzufügen der Befreiung");
    }
  };

  const handleRemoveExemption = async (email: string) => {
    if (email === "Admin@world.com") {
      toast.error("Admin@world.com kann nicht entfernt werden");
      return;
    }

    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch("/api/lottery/sales-exemptions/remove", {
        method: "POST",
        headers,
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success(`🚫 Verkaufsstop-Befreiung für ${email} entfernt`);
        fetchAdminData(); // Refresh data
      } else {
        toast.error(data.error || "Fehler beim Entfernen der Befreiung");
      }
    } catch (error) {
      console.error("Error removing exemption:", error);
      toast.error("Fehler beim Entfernen der Befreiung");
    }
  };

  // Geoblocking functions
  const fetchGeoblockingData = async () => {
    setGeoblockingLoading(true);
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {};

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch('/api/geoblocking/status', { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGeoblockingData(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching geoblocking data:', error);
      toast.error('Fehler beim Laden der Geoblocking-Daten');
    } finally {
      setGeoblockingLoading(false);
    }
  };

  const toggleCountryBlocking = async (countryCode: string, blocked: boolean) => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch('/api/geoblocking/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({ countryCode, blocked })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const country = geoblockingData?.countries?.find((c: any) => c.code === countryCode);
          toast.success(`${country?.name || countryCode} wurde ${blocked ? 'blockiert' : 'freigegeben'}`);
          fetchGeoblockingData(); // Refresh data
        } else {
          toast.error(data.error || 'Fehler beim Aktualisieren der Ländersperre');
        }
      }
    } catch (error) {
      console.error('Error toggling country blocking:', error);
      toast.error('Fehler beim Aktualisieren der Ländersperre');
    }
  };

  const bulkToggleCountries = async (countries: string[], blocked: boolean) => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const response = await fetch('/api/geoblocking/bulk-update', {
        method: 'POST',
        headers,
        body: JSON.stringify({ countries, blocked })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`${data.data.updated} Länder wurden ${blocked ? 'blockiert' : 'freigegeben'}`);
          fetchGeoblockingData(); // Refresh data
        } else {
          toast.error(data.error || 'Fehler beim Massen-Update der Ländersperren');
        }
      }
    } catch (error) {
      console.error('Error bulk toggling countries:', error);
      toast.error('Fehler beim Massen-Update der Ländersperren');
    }
  };

  const filteredCountries = geoblockingData?.countries?.filter((country: any) =>
    country.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
    country.code.toLowerCase().includes(searchCountry.toLowerCase())
  ) || [];

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

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency: "USD",
    }).format(num);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white rounded-t-3xl min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black flex items-center space-x-3">
            <Settings className="h-8 w-8 text-yellow-600" />
            <span>{t('admin.title')}</span>
          </h1>
          <p className="text-gray-600 mt-2">
            {t('admin.subtitle')}
          </p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">📋 {t('admin.instructions.title')}</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>
                • {t('admin.instructions.editJackpot')}
              </li>
              <li>
                • {t('admin.instructions.startDrawing')}
              </li>
              <li>
                • {t('admin.instructions.manualNumbers')}
              </li>
              <li>
                • {t('admin.instructions.changes')}
              </li>
            </ul>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t('admin.activeUsers')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalUsers || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t('admin.soldTickets')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalTickets || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-700" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t('common.totalRevenue')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <Badge
                    variant={stats?.pendingDrawing ? "destructive" : "default"}
                  >
                    {stats?.pendingDrawing ? t('admin.drawingPending') : t('admin.ready')}
                  </Badge>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Statistics */}
        <Card className="mb-6 md:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>��� Finanzübersicht</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  📈 Einnahmen (60%)
                </h4>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.totalProfit || 0)}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  60% der Gesamteinnahmen
                </p>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">
                  💸 Auszahlungen
                </h4>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats?.totalPayouts || 0)}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  An Gewinner ausgezahlt
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  🏦 Pot-Guthaben
                </h4>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats?.remainingPotBalance || 0)}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Verbleibt nach Auszahlungen
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h5 className="font-semibold text-gray-800 mb-2">💡 Erklärung:</h5>
              <div className="text-sm text-gray-700 space-y-1">
                <p>• <strong>Einnahmen (60%):</strong> Der Gewinnanteil aus allen Ticket-Verkäufen</p>
                <p>• <strong>Auszahlungen:</strong> Bereits an Gewinner ausgezahlte Beträge</p>
                <p>• <strong>Pot-Guthaben:</strong> Verfügbares Guthaben im Jackpot-Pool (40% - Auszahlungen)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
          {/* Jackpot Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>{t('admin.jackpotControl')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">
                    {t('admin.simulatedJackpot')}
                  </h4>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(currentDrawing?.simulatedJackpot || 0)}
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    {t('admin.adminControlled')}
                  </p>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">
                    {t('admin.realJackpot')}
                  </h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(currentDrawing?.realJackpot || 0)}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {t('admin.percentRevenue')}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">{t('admin.displayedJackpot')}</h4>
                <p className="text-3xl font-bold text-blue-600 mb-4">
                  {formatCurrency(currentDrawing?.jackpotAmount || 0)}
                </p>

                <Dialog
                  open={isJackpotDialogOpen}
                  onOpenChange={setIsJackpotDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full flex items-center space-x-2">
                      <Edit className="h-4 w-4" />
                      <span>{t('admin.editJackpot')}</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('admin.editJackpotAmount')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="jackpot-amount">
                          {t('admin.newJackpotAmount')}
                        </Label>
                        <Input
                          id="jackpot-amount"
                          type="number"
                          value={jackpotUpdateAmount}
                          onChange={(e) =>
                            setJackpotUpdateAmount(e.target.value)
                          }
                          placeholder="z.B. 10000000"
                        />
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Warnung:</strong> Diese Änderung wird sofort
                          auf der Hauptseite sichtbar sein.
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleJackpotUpdate}
                          className="flex-1"
                        >
                          {t('admin.confirm')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsJackpotDialogOpen(false)}
                          className="flex-1"
                        >
                          {t('admin.cancel')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Price Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Ticketpreis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="ticket-price">Preis pro Ticket (USD)</Label>
                <Input id="ticket-price" type="number" step="0.01" value={ticketPriceAdmin} onChange={(e)=>setTicketPriceAdmin(e.target.value)} placeholder="z.B. 2" />
              </div>
              <Button onClick={handlePriceUpdate} className="w-full">Preis speichern</Button>
              <p className="text-sm text-gray-500">Wirkt sofort für neue Käufe und MetaMask‑Beträge.</p>
            </CardContent>
          </Card>

          {/* Drawing Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>{t('admin.drawingControl')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestCompletedDrawing && latestCompletedDrawing.mainNumbers.length > 0 ? (
                <div>
                  <h4 className="font-semibold mb-3">{t('admin.lastWinningNumbers')}</h4>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex space-x-2">
                      {latestCompletedDrawing.mainNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold"
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                    <span className="text-lg font-bold">+</span>
                    <div className="flex space-x-2">
                      {latestCompletedDrawing.worldNumbers.map((number, index) => (
                        <div
                          key={index}
                          className="w-10 h-10 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold"
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Winners by Class */}
                  {Object.keys(latestCompletedDrawing.winnersByClass).length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-semibold mb-2">
                        {t('admin.winnersByClass')}
                      </h5>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {Object.entries(latestCompletedDrawing.winnersByClass).map(
                          ([winClass, count]) => (
                            <div
                              key={winClass}
                              className="flex justify-between"
                            >
                              <span>Klasse {winClass}:</span>
                              <span className="font-bold">{count}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-2">
                    {t('admin.noDrawingPerformed')}
                  </p>
                  <Badge variant="destructive">{t('admin.drawingPending')}</Badge>
                </div>
              )}

              <Separator />

              {/* Intelligent Drawing Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <div>
                      <h4 className="font-semibold">{t('admin.intelligentDrawing')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('admin.intelligentDrawingDesc')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={intelligentDrawingEnabled}
                    onCheckedChange={setIntelligentDrawingEnabled}
                  />
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    {intelligentDrawingEnabled
                      ? t('admin.intelligentDrawingEnabled')
                      : t('admin.intelligentDrawingDisabled')
                    }
                  </p>
                </div>
              </div>

              <Separator />

              {/* Analysis Results Display */}
              {lastAnalysisResult && intelligentDrawingEnabled && (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-800 mb-2 flex items-center space-x-2">
                      <Brain className="h-4 w-4" />
                      <span>{t('admin.lastAnalysis')}</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-purple-700">
                        📊 <strong>{lastAnalysisResult.totalTicketsAnalyzed}</strong> {t('admin.ticketsAnalyzed')}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="font-medium text-purple-800 mb-1">{t('admin.selectedMainNumbers')}</p>
                          <div className="flex space-x-1">
                            {lastAnalysisResult.leastFrequentMain?.map((num: number, index: number) => (
                              <div
                                key={index}
                                className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold"
                              >
                                {num}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-purple-600 mt-1">
                            ↳ {t('admin.rarestNumbers')}
                          </p>
                        </div>

                        <div>
                          <p className="font-medium text-purple-800 mb-1">{t('admin.selectedWorldNumbers')}</p>
                          <div className="flex space-x-1">
                            {lastAnalysisResult.leastFrequentWorld?.map((num: number, index: number) => (
                              <div
                                key={index}
                                className="w-6 h-6 bg-yellow-500 text-black rounded-full flex items-center justify-center text-xs font-bold"
                              >
                                {num}
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-purple-600 mt-1">
                            ↳ {t('admin.minimizedWinners')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {lastAnalysisResult && intelligentDrawingEnabled && <Separator />}

              <div>
                <h4 className="font-semibold mb-3">
                  {t('admin.manualNumbers')}
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="manual-main">
                      {t('form.fiveMainNumbers')}
                    </Label>
                    <Input
                      id="manual-main"
                      value={manualNumbers.main}
                      onChange={(e) =>
                        setManualNumbers({
                          ...manualNumbers,
                          main: e.target.value,
                        })
                      }
                      placeholder="z.B. 7,14,21,35,42"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-world">
                      2 WorldZahlen (1-12, kommagetrennt)
                    </Label>
                    <Input
                      id="manual-world"
                      value={manualNumbers.world}
                      onChange={(e) =>
                        setManualNumbers({
                          ...manualNumbers,
                          world: e.target.value,
                        })
                      }
                      placeholder="z.B. 3,9"
                    />
                  </div>
                </div>
              </div>

              {!showPreviewMode ? (
                <div className="space-y-2">
                  <Button
                    onClick={handleDrawing}
                    disabled={isDrawing}
                    className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>
                      {isDrawing ? t('admin.drawingInProgress') : t('admin.startDrawing')}
                    </span>
                  </Button>

                  <Button
                    onClick={handlePreviewIntelligentDrawing}
                    disabled={isLoadingPreview}
                    variant="outline"
                    className={`w-full flex items-center justify-center space-x-2 ${
                      intelligentDrawingEnabled
                        ? 'text-red-600 border-red-300 hover:bg-red-50'
                        : 'text-green-600 border-green-300 hover:bg-green-50'
                    }`}
                  >
                    {intelligentDrawingEnabled ? (
                      <Brain className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>
                      {isLoadingPreview
                        ? "Analysiere..."
                        : intelligentDrawingEnabled
                        ? "🧠 Casino-Optimierte Vorschau"
                        : "��� Realistische Lottery Vorschau"
                      }
                    </span>
                  </Button>

                  <Button
                    onClick={handleIntelligentDrawingDemo}
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <Brain className="h-4 w-4" />
                    <span>🧪 Test Intelligente Ziehung</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">🎯 Vorschau Modus Aktiv</h4>
                    <p className="text-sm text-blue-700">
                      Sie können die vorgeschlagenen Zahlen überprüfen und neue generieren lassen oder bestätigen.
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={handlePreviewIntelligentDrawing}
                      disabled={isLoadingPreview}
                      variant="outline"
                      className="flex-1 flex items-center justify-center space-x-2"
                    >
                      <Brain className="h-4 w-4" />
                      <span>{isLoadingPreview ? "Generiere..." : "🔄 Neue Zahlen"}</span>
                    </Button>

                    <Button
                      onClick={handleConfirmDrawingNumbers}
                      disabled={isDrawing || isLoadingPreview}
                      className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>{isDrawing ? "Ziehe..." : "✅ Bestätigen"}</span>
                    </Button>
                  </div>

                  <Button
                    onClick={() => {
                      setShowPreviewMode(false);
                      setDrawingPreview(null);
                    }}
                    variant="ghost"
                    className="w-full text-gray-600"
                  >
                    Vorschau beenden
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Sales Stop Control */}
          <Card className="border-red-300 bg-gradient-to-r from-red-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-800">
                <Power className="h-5 w-5" />
                <span>🛑 Manueller Verkaufsstop</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-red-800">Verkaufsstop-Kontrolle</h4>
                  <p className="text-sm text-red-700">
                    Sofortiger Stopp aller Ticket-Verkäufe für administrative Kontrolle
                  </p>
                </div>
                <button
                  onClick={handleManualSalesStopToggle}
                  className={`p-2 rounded-lg transition-colors ${
                    manualSalesStopEnabled
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {manualSalesStopEnabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>

              <div className={`p-3 rounded-lg ${
                manualSalesStopEnabled
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <p className={`text-sm ${
                  manualSalesStopEnabled ? 'text-red-700' : 'text-gray-600'
                }`}>
                  {manualSalesStopEnabled
                    ? '🔴 VERKAUFSSTOP AKTIV - Alle Ticket-Verkäufe gestoppt'
                    : '🟢 Verkauf aktiv - Kunden können Tickets kaufen'
                  }
                </p>
              </div>

              {manualSalesStopEnabled && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-semibold text-blue-800 mb-2">⚡ Administrative Kontrolle aktiv:</h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>✓ Kompletter Verkaufsstop für alle Kunden</li>
                      <li>✓ Intelligente Ziehung-Vorschau verfügbar</li>
                      <li>✓ Auszahlungskosten-Analyse möglich</li>
                      <li>✓ Zahlen-Optimierung vor finaler Ziehung</li>
                      <li>⚠️ Verkauf bleibt gestoppt bis zur Deaktivierung</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h5 className="font-semibold text-green-800 mb-2">⚡ Verkaufsstop-Befreiungen</h5>
                    <p className="text-sm text-green-700 mb-3">
                      Diese Benutzer können auch während Verkaufsstops Tickets kaufen:
                    </p>

                    <div className="space-y-2 mb-3">
                      {salesExemptions.map((email) => (
                        <div key={email} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm font-medium text-gray-800">{email}</span>
                          <button
                            onClick={() => handleRemoveExemption(email)}
                            disabled={email === "Admin@world.com"}
                            className={`text-xs px-2 py-1 rounded ${
                              email === "Admin@world.com"
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {email === "Admin@world.com" ? "Permanent" : "Entfernen"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-2">
                      <Input
                        placeholder="Email für Befreiung..."
                        value={newExemptionEmail}
                        onChange={(e) => setNewExemptionEmail(e.target.value)}
                        className="flex-1 text-sm"
                      />
                      <Button
                        onClick={handleAddExemption}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Drawing Preview */}
          {showPreviewMode && drawingPreview && (
            <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <Brain className="h-5 w-5" />
                  <span>🎯 Intelligente Ziehung - Vorschau</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Suggested Numbers */}
                <div>
                  <h4 className="font-semibold mb-3 text-blue-800">Vorgeschlagene Zahlen</h4>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex space-x-2">
                      {drawingPreview.suggestedNumbers.mainNumbers.map((number: number, index: number) => (
                        <div
                          key={index}
                          className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg"
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                    <span className="text-xl font-bold text-blue-800">+</span>
                    <div className="flex space-x-2">
                      {drawingPreview.suggestedNumbers.worldNumbers.map((number: number, index: number) => (
                        <div
                          key={index}
                          className="w-12 h-12 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold text-lg shadow-lg"
                        >
                          {number}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Payout Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">{t('admin.totalPayout')}</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(drawingPreview.winnerPreview.totalPayout)}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">🏆 Gesamt Gewinner</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {drawingPreview.winnerPreview.totalWinners}
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">🎰 Jackpot Gewinner</h4>
                    <p className="text-2xl font-bold text-yellow-600">
                      {drawingPreview.winnerPreview.jackpotWinners}
                    </p>
                  </div>
                </div>

                {/* Winners by Class */}
                {Object.keys(drawingPreview.winnerPreview.winnersByClass).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-blue-800">{t('admin.winnersByClass')}</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {Object.entries(drawingPreview.winnerPreview.winnersByClass).map(([winClass, count]) => (
                        <div key={winClass} className="flex justify-between p-2 bg-white rounded border">
                          <span>Klasse {winClass}:</span>
                          <span className="font-bold">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis Stats */}
                <div className="p-3 bg-white border border-blue-200 rounded-lg">
                  <h5 className="font-semibold text-blue-800 mb-2">📊 Analyse-Details</h5>
                  <p className="text-sm text-blue-700">
                    Analysierte Tickets: <strong>{drawingPreview.ticketsAnalyzed}</strong><br/>
                    Algorithmus wählte die <strong>am wenigsten getippten</strong> Zahlen für minimale Auszahlungen.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto-Drawing Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>{t('admin.automaticDrawing')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{t('admin.autoDrawing')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('common.everyFridayAt21')}
                  </p>
                </div>
                <button
                  onClick={handleAutoDrawingToggle}
                  className={`p-2 rounded-lg transition-colors ${
                    autoDrawingEnabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {autoDrawingEnabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>

              <Separator />

              {nextDrawingTime && (
                <div className="space-y-2">
                  <h4 className="font-semibold">{t('admin.nextDrawing')}</h4>
                  <div className="text-sm text-gray-700">
                    {new Date(nextDrawingTime).toLocaleString(getLocale(), {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Berlin'
                    })}
                  </div>

                  {/* Countdown */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800">{t('admin.timeUntilDrawing')}</span>
                    </div>
                    <div className="flex space-x-1 font-mono text-lg font-bold mt-2">
                      {countdown.days > 0 && (
                        <>
                          <div className="bg-amber-100 px-2 py-1 rounded text-amber-800">
                            {countdown.days.toString().padStart(2, '0')}
                          </div>
                          <span className="text-amber-600 self-center">d</span>
                        </>
                      )}
                      <div className="bg-amber-100 px-2 py-1 rounded text-amber-800">
                        {countdown.hours.toString().padStart(2, '0')}
                      </div>
                      <span className="text-amber-600 self-center">:</span>
                      <div className="bg-amber-100 px-2 py-1 rounded text-amber-800">
                        {countdown.minutes.toString().padStart(2, '0')}
                      </div>
                      <span className="text-amber-600 self-center">:</span>
                      <div className="bg-amber-100 px-2 py-1 rounded text-amber-800">
                        {countdown.seconds.toString().padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  {autoDrawingEnabled
                    ? t('common.autoDrawingEnabled')
                    : t('common.autoDrawingDisabled')
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Display Overrides Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>Globale Anzeige-Überschreibungen</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-semibold mb-2">
                  🌐 Globale Überschreibungen für alle Seiten
                </p>
                <p className="text-xs text-blue-700">
                  Diese Einstellungen überschreiben Datum und Zeit auf allen Seiten der Website (Hauptseite, Gewinnzahlen, etc.)
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="manual-title" className="text-sm font-medium">
                    Titel für nächste Ziehung
                  </Label>
                  <Input
                    id="manual-title"
                    value={manualTitleOverride}
                    onChange={(e) => setManualTitleOverride(e.target.value)}
                    placeholder="z.B. 'Nächste Chance zu gewinnen'"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Überschreibt den Standard-Titel überall
                  </p>
                </div>
                <div>
                  <Label htmlFor="manual-date" className="text-sm font-medium">
                    Datum der nächsten Ziehung
                  </Label>
                  <Input
                    id="manual-date"
                    type="date"
                    value={manualDateOverride}
                    onChange={(e) => setManualDateOverride(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Überschreibt das automatische Datum
                  </p>
                </div>
                <div>
                  <Label htmlFor="manual-time" className="text-sm font-medium">
                    Uhrzeit der nächsten Ziehung
                  </Label>
                  <Input
                    id="manual-time"
                    type="time"
                    value={manualTimeOverride}
                    onChange={(e) => setManualTimeOverride(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Der Countdown-Timer richtet sich nach dieser Zeit
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 font-semibold mb-1">
                  ⚠️ Wichtiger Hinweis:
                </p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Diese Änderungen wirken sich auf ALLE Seiten aus</li>
                  <li>• Der automatische Countdown-Timer wird angepasst</li>
                  <li>• Auto-Ziehung richtet sich nach den neuen Zeiten</li>
                  <li>• Leere Felder = Standard-Verhalten wird verwendet</li>
                </ul>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleDisplayOverridesUpdate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  🌐 Global speichern
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDisplayOverridesReset}
                  className="flex-1"
                >
                  Zurücksetzen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 1K Quicktipp Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>1.000x Quicktipp Steuerung</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">1.000x Quicktipp</h4>
                  <p className="text-sm text-gray-600">
                    Versteckten 1.000x Quicktipp für Benutzer aktivieren
                  </p>
                </div>
                <button
                  onClick={handleQuicktipp1kToggle}
                  className={`p-2 rounded-lg transition-colors ${
                    quicktipp1kEnabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {quicktipp1kEnabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>

              <div className={`p-3 rounded-lg ${
                quicktipp1kEnabled
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <p className={`text-sm ${
                  quicktipp1kEnabled ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {quicktipp1kEnabled
                    ? '✓ 1.000x Quicktipp ist für Benutzer sichtbar'
                    : '✗ 1.000x Quicktipp ist versteckt'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Coupon Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>Gutschein Generator</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-code" className="text-sm font-medium">
                    Gutschein-Code (optional) - Eigenen Code festlegen
                  </Label>
                  <Input
                    id="custom-code"
                    type="text"
                    value={newCoupon.customCode}
                    onChange={(e) => setNewCoupon({
                      ...newCoupon,
                      customCode: e.target.value.toUpperCase()
                    })}
                    placeholder="z.B. SOMMER2025 (leer lassen für automatischen Code)"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Eigenen Code eingeben oder leer lassen für automatische Generierung
                  </p>
                </div>
                <div>
                  <Label htmlFor="discount-percent" className="text-sm font-medium">
                    Rabatt (%) - 5% bis 100%
                  </Label>
                  <Input
                    id="discount-percent"
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={newCoupon.discountPercent}
                    onChange={(e) => setNewCoupon({
                      ...newCoupon,
                      discountPercent: Math.max(5, Math.min(100, parseInt(e.target.value) || 5))
                    })}
                    placeholder="z.B. 20 für 20% Rabatt"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Rabatt zwischen 5% und 100%
                  </p>
                </div>
                <div>
                  <Label htmlFor="min-tickets" className="text-sm font-medium">
                    Spielscheine - Ab wieviele Spielscheine gültig
                  </Label>
                  <Input
                    id="min-tickets"
                    type="number"
                    min="1"
                    value={newCoupon.minTickets}
                    onChange={(e) => setNewCoupon({
                      ...newCoupon,
                      minTickets: Math.max(1, parseInt(e.target.value) || 1)
                    })}
                    placeholder="z.B. 20 (ab 20 Spielscheinen gültig)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mindestanzahl Spielscheine für Gutschein
                  </p>
                </div>
                <div>
                  <Label htmlFor="usage-limit" className="text-sm font-medium">
                    Verwendung - Wie oft der Gutschein gültig ist
                  </Label>
                  <Input
                    id="usage-limit"
                    type="number"
                    min="1"
                    value={newCoupon.usageLimit}
                    onChange={(e) => setNewCoupon({
                      ...newCoupon,
                      usageLimit: Math.max(1, parseInt(e.target.value) || 1)
                    })}
                    placeholder="z.B. 50 (kann 50x verwendet werden)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Anzahl der möglichen Verwendungen
                  </p>
                </div>

                {/* Preview */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-semibold text-blue-800 mb-1">Vorschau:</h5>
                  <p className="text-sm text-blue-700">
                    <strong>Code:</strong> {newCoupon.customCode || '[Automatisch generiert]'}<br/>
                    {newCoupon.discountPercent}% Rabatt ab {newCoupon.minTickets} Spielscheinen,
                    {newCoupon.usageLimit}x verwendbar
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCreateCoupon}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Gutschein erstellen</span>
              </Button>
            </CardContent>
          </Card>

          {/* Admin Rights Delegation - Only for Super Admin */}
          {user?.email === "Admin@world.com" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <span>Admin-Rechte Verwaltung</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-semibold mb-1">
                    👑 Super Admin Funktion
                  </p>
                  <p className="text-xs text-yellow-700">
                    Nur Sie (Admin@world.com) können anderen Benutzern Admin-Rechte vergeben oder entziehen.
                    Diese Benutzer erhalten Zugang zum Admin-Panel, können aber keine weiteren Admin-Rechte vergeben.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="admin-email" className="text-sm font-medium">
                      Email-Adresse für Admin-Rechte
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        id="admin-email"
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder={t('admin.placeholderEmail')}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleGrantAdminRights}
                        disabled={isDelegatingAdmin || !newAdminEmail.trim()}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Admin machen</span>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Benutzer erhält Zugang zum Admin-Panel (ohne Delegation-Rechte)
                    </p>
                  </div>
                </div>

                {/* Current Admin Users */}
                {adminUsers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-600" />
                      <h4 className="font-semibold">
                        Aktuelle Admin-Benutzer ({adminUsers.length})
                      </h4>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {adminUsers.map((admin) => (
                        <div
                          key={admin.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {admin.canDelegateAdmin ? (
                                <Crown className="h-4 w-4 text-yellow-600" />
                              ) : (
                                <Users className="h-4 w-4 text-blue-600" />
                              )}
                              <div>
                                <div className="font-semibold text-sm">
                                  {admin.email}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {admin.canDelegateAdmin ? "Super Admin" : "Admin"}
                                  {admin.email === user?.email && " (Sie)"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {admin.email !== "Admin@world.com" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRevokeAdminRights(admin.email)}
                              className="flex items-center space-x-1"
                            >
                              <UserMinus className="h-4 w-4" />
                              <span>Entziehen</span>
                            </Button>
                          )}

                          {admin.email === "Admin@world.com" && (
                            <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                              Unveränderlich
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminUsers.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Bisher sind keine anderen Admin-Benutzer vorhanden
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Jackpot Approval Section */}
        {pendingJackpotWinners.length > 0 && (
          <Card className="mt-8 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-800">
                <Crown className="h-6 w-6" />
                <span>🎰 JACKPOT GEWINNER - Admin Freigabe erforderlich ({pendingJackpotWinners.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingJackpotWinners.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border-2 border-yellow-400 rounded-lg bg-gradient-to-r from-yellow-100 to-orange-100 shadow-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl animate-bounce">🎰</div>
                      <div>
                        <div className="font-bold text-lg text-yellow-800">
                          JACKPOT GEWINNER!
                        </div>
                        <div className="text-sm text-gray-700">
                          Ticket: #{ticket.id.slice(-6)} | User: {ticket.userId.slice(-6)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(ticket.createdAt).toLocaleString(getLocale())}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="flex space-x-1">
                            {ticket.mainNumbers.map((number, index) => (
                              <div
                                key={index}
                                className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
                              >
                                {number}
                              </div>
                            ))}
                          </div>
                          <span className="text-lg font-bold">+</span>
                          <div className="flex space-x-1">
                            {ticket.worldNumbers.map((number, index) => (
                              <div
                                key={index}
                                className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
                              >
                                {number}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-green-700 mt-2">
                          Gewinn: {formatCurrency(ticket.winningAmount || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={() => handleJackpotApproval(ticket.id, true)}
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
                      >
                        <Crown className="h-4 w-4" />
                        <span>Freigeben</span>
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleJackpotApproval(ticket.id, false, "Admin entscheidung")}
                        className="flex items-center space-x-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Ablehnen</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Wichtig:</strong> Jackpot-Gewinne müssen manuell freigegeben werden.
                  Nach der Freigabe wird das Geld automatisch dem Spieler gutgeschrieben.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coupon Management */}
        {coupons.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Gutschein Verwaltung ({coupons.length} Gutscheine)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.code}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <div className="font-semibold font-mono text-lg">
                          {coupon.code}
                        </div>
                        <div className="text-gray-600">
                          {coupon.discountPercent}% Rabatt
                          {coupon.minTickets && ` • Min: ${coupon.minTickets}`}
                          {coupon.maxTickets && ` • Max: ${coupon.maxTickets}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          Verwendet: {coupon.usedCount}/{coupon.usageLimit}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleCouponStatus(coupon.code)}
                        className={`p-2 rounded-lg transition-colors ${
                          coupon.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={coupon.isActive ? 'Deaktivieren' : 'Aktivieren'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon.code)}
                        className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Tickets */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🎫 Spielscheine Verwaltung ({allTickets.length} Gesamt)</span>
              {selectedTickets.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedTickets.size} ausgewählt
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelectedTickets}
                    className="flex items-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Löschen</span>
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center space-x-2">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedTickets.size === allTickets.length && allTickets.length > 0}
                onChange={selectAllTickets}
                className="rounded border-gray-300"
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Alle auswählen ({allTickets.length})
              </label>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allTickets
                .sort((a, b) => {
                  // Sort by winning class (highest to lowest), then by winning status, then by creation date
                  if (a.isWinner && b.isWinner) {
                    return (a.winningClass || 0) - (b.winningClass || 0); // Class 1 = highest win
                  }
                  if (a.isWinner && !b.isWinner) return -1;
                  if (!a.isWinner && b.isWinner) return 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .slice(0, 50).map((ticket) => (
                <div
                  key={ticket.id}
                  className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                    selectedTickets.has(ticket.id) ? 'bg-blue-50 border-blue-200' : ''
                  } ${
                    ticket.isWinner ? 'bg-gradient-to-r from-green-50 to-yellow-50 border-green-300 shadow-md' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedTickets.has(ticket.id)}
                      onChange={() => toggleTicketSelection(ticket.id)}
                      className="rounded border-gray-300"
                    />

                    <div className="text-sm">
                      <div className="font-semibold">
                        #{ticket.id.slice(-6)}
                      </div>
                      <div className="text-gray-500">
                        User: {ticket.userId.slice(-6)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(ticket.createdAt).toLocaleString(getLocale())}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        {ticket.mainNumbers.map((number, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold"
                          >
                            {number}
                          </div>
                        ))}
                      </div>
                      <span className="text-sm">+</span>
                      <div className="flex space-x-1">
                        {ticket.worldNumbers.map((number, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold"
                          >
                            {number}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        {formatCurrency(ticket.cost)}
                      </div>
                      {ticket.isWinner && (
                        <div className="space-y-1">
                          <Badge
                            variant="default"
                            className={`${ticket.winningClass === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black animate-pulse' :
                                         ticket.winningClass <= 3 ? 'bg-gradient-to-r from-green-400 to-green-600 text-white' :
                                         ticket.winningClass <= 6 ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white' :
                                         'bg-gradient-to-r from-gray-400 to-gray-600 text-white'} font-bold shadow-lg`}
                          >
                            🏆 Gewinnklasse {ticket.winningClass}
                          </Badge>
                          {ticket.winningAmount && (
                            <div className="text-xs font-bold text-green-700">
                              Gewinn: {formatCurrency(ticket.winningAmount)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteTicket(ticket.id)}
                      className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                      title="Spielschein löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {allTickets.length > 50 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Zeige erste 50 von {allTickets.length} Spielscheinen
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geoblocking Management */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Geoblocking Verwaltung</span>
            </CardTitle>
            <p className="text-gray-600">
              Verwalten Sie den Zugriff auf die Website nach L��ndern. Blockierte Länder können nicht auf die Seite zugreifen.
            </p>
          </CardHeader>
          <CardContent>
            {geoblockingLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Lädt Geoblocking-Daten...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-red-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">Blockierte Länder</p>
                        <p className="text-2xl font-bold text-red-900">
                          {geoblockingData?.totalBlocked || 0}
                        </p>
                      </div>
                      <Shield className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Erlaubte Länder</p>
                        <p className="text-2xl font-bold text-green-900">
                          {(geoblockingData?.totalCountries || 0) - (geoblockingData?.totalBlocked || 0)}
                        </p>
                      </div>
                      <Globe className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Gesamt Länder</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {geoblockingData?.totalCountries || 0}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => bulkToggleCountries(selectedCountries.size > 0 ? Array.from(selectedCountries) : filteredCountries.map((c: any) => c.code), true)}
                    variant="destructive"
                    className="flex items-center space-x-2"
                    disabled={selectedCountries.size === 0 && filteredCountries.length === 0}
                  >
                    <Shield className="h-4 w-4" />
                    <span>
                      {selectedCountries.size > 0
                        ? `Ausgewählte (${selectedCountries.size}) blockieren`
                        : `Alle sichtbaren (${filteredCountries.length}) blockieren`
                      }
                    </span>
                  </Button>
                  <Button
                    onClick={() => bulkToggleCountries(selectedCountries.size > 0 ? Array.from(selectedCountries) : filteredCountries.map((c: any) => c.code), false)}
                    variant="outline"
                    className="flex items-center space-x-2"
                    disabled={selectedCountries.size === 0 && filteredCountries.length === 0}
                  >
                    <Globe className="h-4 w-4" />
                    <span>
                      {selectedCountries.size > 0
                        ? `Ausgewählte (${selectedCountries.size}) freigeben`
                        : `Alle sichtbaren (${filteredCountries.length}) freigeben`
                      }
                    </span>
                  </Button>
                  <Button
                    onClick={() => setSelectedCountries(new Set())}
                    variant="ghost"
                    className="flex items-center space-x-2"
                    disabled={selectedCountries.size === 0}
                  >
                    <span>Auswahl löschen ({selectedCountries.size})</span>
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Land suchen (Name oder Code)..."
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Countries List */}
                <div className="border rounded-lg">
                  <div className="max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                      {filteredCountries.map((country: any) => (
                        <div
                          key={country.code}
                          className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                            country.blocked
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200'
                          } ${
                            selectedCountries.has(country.code)
                              ? 'ring-2 ring-blue-500'
                              : ''
                          }`}
                        >
                          <div
                            className="flex items-center space-x-3 flex-1 cursor-pointer"
                            onClick={() => {
                              const newSelection = new Set(selectedCountries);
                              if (selectedCountries.has(country.code)) {
                                newSelection.delete(country.code);
                              } else {
                                newSelection.add(country.code);
                              }
                              setSelectedCountries(newSelection);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCountries.has(country.code)}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {country.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {country.code}
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={country.blocked}
                            onCheckedChange={(blocked) => toggleCountryBlocking(country.code, blocked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredCountries.length === 0 && searchCountry && (
                  <div className="text-center py-8 text-gray-500">
                    Keine Länder gefunden für "{searchCountry}"
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Hinweis:</strong> Geoblocking basiert auf der IP-Adresse des Benutzers.
                    Blockierte Länder erhalten eine Fehlermeldung beim Versuch, auf die Website zuzugreifen.
                    Änderungen sind sofort wirksam.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
            <p className="text-gray-300 text-sm">{t('footer.adminDashboard')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Admin;
