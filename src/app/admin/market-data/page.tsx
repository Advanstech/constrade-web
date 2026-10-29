"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  Coins,
  Edit3,
  Globe,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/market/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { adminApi, marketsApi } from "@/lib/api";
import type { MarketSummary } from "@/lib/api.types";
import { changeBgClass, formatDate, formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";

interface EquitySecurityRow {
  id?: string;
  ticker: string;
  name: string;
  sector?: string | null;
  price: number;
  previousClose?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  volume?: number | null;
  marketCap?: string | null;
  peRatio?: number | null;
  dividendYield?: number | null;
  isActive?: boolean;
}

interface FixedIncomeSecurityRow {
  id: string;
  isin: string;
  name: string;
  type: string;
  issuer?: string | null;
  yield: number;
  couponRate?: number | null;
  price?: number | null;
  maturityDate?: string | null;
  minimumInvestment?: number | null;
  isActive?: boolean;
}

interface YieldCurveRow {
  id: string;
  tenor: string;
  rate: number;
  change?: number | null;
  benchmark?: string | null;
  date?: string | null;
  source?: string | null;
  isActive?: boolean;
}

type BenchmarkRow = Awaited<ReturnType<typeof adminApi.benchmarks>>[number];

interface TenderResultRow {
  id: string;
  tenderId: string;
  securityType?: string;
  instrumentName: string;
  issueDate?: string | null;
  maturityDate?: string | null;
  targetAmount?: number | null;
  totalBidAmount?: number | null;
  acceptedAmount?: number | null;
  weightedAverageRate?: number | null;
  couponRate?: number | null;
  interestRate?: number | null;
  boGReference?: string | null;
}

const TENORS = ["91D", "182D", "364D", "2Y", "3Y", "5Y", "7Y", "10Y", "15Y"];

const SECURITY_TYPES = [
  { value: "BILL_91_DAY", label: "91-Day Treasury Bill", defaultName: "91-Day Treasury Bill" },
  { value: "BILL_182_DAY", label: "182-Day Treasury Bill", defaultName: "182-Day Treasury Bill" },
  { value: "BILL_364_DAY", label: "364-Day Treasury Bill", defaultName: "364-Day Treasury Bill" },
  { value: "BOND_2_YEAR", label: "2-Year GoG Note", defaultName: "2-Year Government Bond" },
  { value: "BOND_3_YEAR", label: "3-Year GoG Bond", defaultName: "3-Year Government Bond" },
  { value: "BOND_5_YEAR", label: "5-Year GoG Bond", defaultName: "5-Year Government Bond" },
  { value: "BOND_7_YEAR", label: "7-Year GoG Bond", defaultName: "7-Year Government Bond" },
  { value: "BOND_10_YEAR", label: "10-Year GoG Bond", defaultName: "10-Year Government Bond" },
  { value: "BOND_15_YEAR", label: "15-Year GoG Bond", defaultName: "15-Year Government Bond" },
];

export default function AdminMarketDataPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("equities");
  const [loading, setLoading] = useState(true);
  const [syncingGse, setSyncingGse] = useState(false);
  const [syncingYc, setSyncingYc] = useState(false);
  const [syncingFx, setSyncingFx] = useState(false);

  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [equities, setEquities] = useState<EquitySecurityRow[]>([]);
  const [fixedIncome, setFixedIncome] = useState<FixedIncomeSecurityRow[]>([]);
  const [yieldCurves, setYieldCurves] = useState<YieldCurveRow[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [tenders, setTenders] = useState<TenderResultRow[]>([]);

  const [equitySearch, setEquitySearch] = useState("");
  const [fiSearch, setFiSearch] = useState("");

  // Equity Dialog State
  const [equityDialogOpen, setEquityDialogOpen] = useState(false);
  const [editingEquity, setEditingEquity] = useState<EquitySecurityRow | null>(null);
  const [savingEquity, setSavingEquity] = useState(false);
  const [equityForm, setEquityForm] = useState({
    ticker: "",
    name: "",
    sector: "Banking",
    price: "",
    previousClose: "",
    dayHigh: "",
    dayLow: "",
    volume: "0",
    marketCap: "",
    peRatio: "",
    dividendYield: "",
    isActive: true,
  });

  // Fixed Income Dialog State
  const [fiDialogOpen, setFiDialogOpen] = useState(false);
  const [editingFi, setEditingFi] = useState<FixedIncomeSecurityRow | null>(null);
  const [savingFi, setSavingFi] = useState(false);
  const [fiForm, setFiForm] = useState({
    isin: "",
    name: "",
    type: "91D",
    issuer: "Government of Ghana (BoG)",
    yield: "",
    couponRate: "0",
    price: "1",
    maturityDate: new Date(Date.now() + 91 * 86400000).toISOString().slice(0, 10),
    minimumInvestment: "100",
    isActive: true,
  });

  // Yield Curve Dialog State
  const [ycDialogOpen, setYcDialogOpen] = useState(false);
  const [editingYc, setEditingYc] = useState<YieldCurveRow | null>(null);
  const [savingYc, setSavingYc] = useState(false);
  const [ycForm, setYcForm] = useState({
    tenor: "91D",
    rate: "",
    change: "0",
    benchmark: "GoG",
    date: new Date().toISOString().slice(0, 10),
    source: "MANUAL",
  });

  // Macro Benchmark Dialog State
  const [bmDialogOpen, setBmDialogOpen] = useState(false);
  const [, setEditingBm] = useState<BenchmarkRow | null>(null);
  const [savingBm, setSavingBm] = useState(false);
  const [bmForm, setBmForm] = useState({
    symbol: "GSE-CI",
    name: "GSE Composite Index",
    value: "",
    change: "",
    changePercent: "",
    source: "MANUAL",
  });

  // Tender Result Dialog State
  const [tenderDialogOpen, setTenderDialogOpen] = useState(false);
  const [editingTender, setEditingTender] = useState<TenderResultRow | null>(null);
  const [savingTender, setSavingTender] = useState(false);
  const [tenderForm, setTenderForm] = useState({
    tenderId: "",
    securityType: "BILL_91_DAY",
    instrumentName: "91-Day Treasury Bill",
    issueDate: new Date().toISOString().slice(0, 10),
    maturityDate: "",
    targetAmount: "",
    totalBidAmount: "",
    acceptedAmount: "",
    weightedAverageRate: "",
    couponRate: "",
    interestRate: "",
    boGReference: "",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, eqRes, fiRes, ycRes, bmRes, trRes] = await Promise.all([
        marketsApi.summary().catch(() => null),
        adminApi.equitySecurities().catch(() => []),
        adminApi.fixedIncomeSecurities().catch(() => []),
        adminApi.yieldCurves(100).catch(() => []),
        adminApi.benchmarks().catch(() => []),
        adminApi.tenderResults(50).catch(() => []),
      ]);
      setSummary(sumRes);
      setEquities(Array.isArray(eqRes) ? eqRes : []);
      setFixedIncome(Array.isArray(fiRes) ? fiRes : []);
      setYieldCurves(Array.isArray(ycRes) ? ycRes : []);
      setBenchmarks(Array.isArray(bmRes) ? bmRes : []);
      setTenders(Array.isArray(trRes) ? trRes : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Filtered lists
  const filteredEquities = useMemo(() => {
    const q = equitySearch.trim().toLowerCase();
    if (!q) return equities;
    return equities.filter(
      (e) =>
        String(e.ticker || "").toLowerCase().includes(q) ||
        String(e.name || "").toLowerCase().includes(q) ||
        String(e.sector || "").toLowerCase().includes(q),
    );
  }, [equities, equitySearch]);

  const filteredFixedIncome = useMemo(() => {
    const q = fiSearch.trim().toLowerCase();
    if (!q) return fixedIncome;
    return fixedIncome.filter(
      (f) =>
        String(f.isin || "").toLowerCase().includes(q) ||
        String(f.name || "").toLowerCase().includes(q) ||
        String(f.type || "").toLowerCase().includes(q),
    );
  }, [fixedIncome, fiSearch]);

  // Latest active yield curve per tenor for summary view
  const latestYieldByTenor = useMemo(() => {
    const map = new Map<string, YieldCurveRow>();
    for (const row of yieldCurves) {
      if (!row.isActive) continue;
      const existing = map.get(row.tenor);
      if (
        !existing ||
        new Date(row.date ?? 0).getTime() > new Date(existing.date ?? 0).getTime()
      ) {
        map.set(row.tenor, row);
      }
    }
    return TENORS.map((t) => map.get(t)).filter((r): r is YieldCurveRow => Boolean(r));
  }, [yieldCurves]);

  // Handlers: Feed Syncs
  const handleSyncGse = async () => {
    setSyncingGse(true);
    try {
      const res = await adminApi.syncGsePrices();
      toast({
        title: "GSE Live Feed Synced",
        description: res?.message || "Updated listed GSE equity quotes and GSE-CI index.",
      });
      await loadAll();
    } catch (err) {
      toast({
        title: "GSE Sync Failed",
        description: err instanceof Error ? err.message : "Could not reach external GSE price feed.",
        variant: "destructive",
      });
    } finally {
      setSyncingGse(false);
    }
  };

  const handleSyncYieldCurve = async () => {
    setSyncingYc(true);
    try {
      const res = await adminApi.syncYieldCurve();
      toast({
        title: "GoG Yield Curve Synced",
        description: res?.message || "Synchronized benchmark rates from BoG/GFIM.",
      });
      await loadAll();
    } catch (err) {
      toast({
        title: "Yield Curve Sync Failed",
        description: err instanceof Error ? err.message : "Could not sync yield curve.",
        variant: "destructive",
      });
    } finally {
      setSyncingYc(false);
    }
  };

  const handleSyncFx = async () => {
    setSyncingFx(true);
    try {
      await adminApi.syncFxRates();
      toast({
        title: "FX Reference Rates Synced",
        description: "Updated USD/GHS, EUR/GHS, and GBP/GHS reference rates.",
      });
      await loadAll();
    } catch (err) {
      toast({
        title: "FX Sync Failed",
        description: err instanceof Error ? err.message : "Could not sync FX feed.",
        variant: "destructive",
      });
    } finally {
      setSyncingFx(false);
    }
  };

  // Handlers: Equities
  const openAddEquity = () => {
    setEditingEquity(null);
    setEquityForm({
      ticker: "",
      name: "",
      sector: "Banking",
      price: "",
      previousClose: "",
      dayHigh: "",
      dayLow: "",
      volume: "0",
      marketCap: "",
      peRatio: "",
      dividendYield: "",
      isActive: true,
    });
    setEquityDialogOpen(true);
  };

  const openEditEquity = (eq: EquitySecurityRow) => {
    setEditingEquity(eq);
    setEquityForm({
      ticker: eq.ticker || "",
      name: eq.name || "",
      sector: eq.sector || "Banking",
      price: String(eq.price ?? ""),
      previousClose: eq.previousClose != null ? String(eq.previousClose) : String(eq.price ?? ""),
      dayHigh: eq.dayHigh != null ? String(eq.dayHigh) : "",
      dayLow: eq.dayLow != null ? String(eq.dayLow) : "",
      volume: String(eq.volume ?? 0),
      marketCap: eq.marketCap || "",
      peRatio: eq.peRatio != null ? String(eq.peRatio) : "",
      dividendYield: eq.dividendYield != null ? String(eq.dividendYield) : "",
      isActive: eq.isActive !== false,
    });
    setEquityDialogOpen(true);
  };

  const handleSaveEquity = async () => {
    const priceNum = parseFloat(equityForm.price);
    if (!equityForm.ticker.trim() || !equityForm.name.trim() || Number.isNaN(priceNum)) {
      toast({
        title: "Validation Error",
        description: "Ticker, Name, and a valid Price are required.",
        variant: "destructive",
      });
      return;
    }
    setSavingEquity(true);
    try {
      const payload = {
        name: equityForm.name.trim(),
        sector: equityForm.sector.trim() || "Other",
        price: priceNum,
        previousClose: equityForm.previousClose ? parseFloat(equityForm.previousClose) : undefined,
        dayHigh: equityForm.dayHigh ? parseFloat(equityForm.dayHigh) : undefined,
        dayLow: equityForm.dayLow ? parseFloat(equityForm.dayLow) : undefined,
        volume: equityForm.volume ? parseInt(equityForm.volume, 10) : 0,
        marketCap: equityForm.marketCap.trim() || undefined,
        peRatio: equityForm.peRatio ? parseFloat(equityForm.peRatio) : undefined,
        dividendYield: equityForm.dividendYield ? parseFloat(equityForm.dividendYield) : undefined,
      };
      if (editingEquity) {
        await adminApi.updateEquitySecurity(editingEquity.ticker, {
          ...payload,
          isActive: equityForm.isActive,
        });
        toast({
          title: `Updated ${editingEquity.ticker}`,
          description: `Live quote set to ₵${priceNum.toFixed(2)} across Web, Portal, and Mobile.`,
        });
      } else {
        await adminApi.createEquitySecurity({
          ticker: equityForm.ticker.trim().toUpperCase(),
          ...payload,
        });
        toast({
          title: `Added ${equityForm.ticker.toUpperCase()}`,
          description: "New GSE equity security published.",
        });
      }
      setEquityDialogOpen(false);
      await loadAll();
    } catch (err) {
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Failed to save equity security.",
        variant: "destructive",
      });
    } finally {
      setSavingEquity(false);
    }
  };

  // Handlers: Fixed Income
  const openAddFi = () => {
    setEditingFi(null);
    setFiForm({
      isin: "",
      name: "",
      type: "91D",
      issuer: "Government of Ghana (BoG)",
      yield: "",
      couponRate: "0",
      price: "1",
      maturityDate: new Date(Date.now() + 91 * 86400000).toISOString().slice(0, 10),
      minimumInvestment: "100",
      isActive: true,
    });
    setFiDialogOpen(true);
  };

  const openEditFi = (fi: FixedIncomeSecurityRow) => {
    setEditingFi(fi);
    setFiForm({
      isin: fi.isin || "",
      name: fi.name || "",
      type: fi.type || "91D",
      issuer: fi.issuer || "Government of Ghana (BoG)",
      yield: String(fi.yield ?? ""),
      couponRate: String(fi.couponRate ?? 0),
      price: String(fi.price ?? 1),
      maturityDate: fi.maturityDate ? new Date(fi.maturityDate).toISOString().slice(0, 10) : "",
      minimumInvestment: String(fi.minimumInvestment ?? 100),
      isActive: fi.isActive !== false,
    });
    setFiDialogOpen(true);
  };

  const handleSaveFi = async () => {
    const yieldNum = parseFloat(fiForm.yield);
    if (!fiForm.isin.trim() || !fiForm.name.trim() || Number.isNaN(yieldNum)) {
      toast({
        title: "Validation Error",
        description: "ISIN, Instrument Name, and Yield (%) are required.",
        variant: "destructive",
      });
      return;
    }
    setSavingFi(true);
    try {
      const payload = {
        isin: fiForm.isin.trim().toUpperCase(),
        name: fiForm.name.trim(),
        type: fiForm.type.trim().toUpperCase(),
        issuer: fiForm.issuer.trim(),
        yield: yieldNum,
        couponRate: parseFloat(fiForm.couponRate) || 0,
        price: parseFloat(fiForm.price) || 1,
        maturityDate: new Date(fiForm.maturityDate).toISOString(),
        minimumInvestment: parseFloat(fiForm.minimumInvestment) || 100,
      };
      if (editingFi) {
        await adminApi.updateFixedIncomeSecurity(editingFi.id, {
          ...payload,
          isActive: fiForm.isActive,
        });
        toast({
          title: `Updated ${payload.name}`,
          description: `Yield set to ${yieldNum.toFixed(2)}% and synced to GoG Yield Curve.`,
        });
      } else {
        await adminApi.createFixedIncomeSecurity(payload);
        toast({
          title: `Created ${payload.name}`,
          description: "Fixed income security published and synced to Yield Curve.",
        });
      }
      setFiDialogOpen(false);
      await loadAll();
    } catch (err) {
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Failed to save fixed income security.",
        variant: "destructive",
      });
    } finally {
      setSavingFi(false);
    }
  };

  // Handlers: Yield Curve
  const openAddYc = (tenor = "91D") => {
    setEditingYc(null);
    const existing = latestYieldByTenor.find((r) => r.tenor === tenor);
    setYcForm({
      tenor,
      rate: existing ? String(existing.rate) : "",
      change: existing ? String(existing.change ?? 0) : "0",
      benchmark: "GoG",
      date: new Date().toISOString().slice(0, 10),
      source: "MANUAL",
    });
    setYcDialogOpen(true);
  };

  const openEditYc = (yc: YieldCurveRow) => {
    setEditingYc(yc);
    setYcForm({
      tenor: yc.tenor || "91D",
      rate: String(yc.rate ?? ""),
      change: String(yc.change ?? 0),
      benchmark: yc.benchmark || "GoG",
      date: yc.date ? new Date(yc.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      source: yc.source || "MANUAL",
    });
    setYcDialogOpen(true);
  };

  const handleSaveYc = async () => {
    const rateNum = parseFloat(ycForm.rate);
    if (Number.isNaN(rateNum) || rateNum <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid positive yield rate (%).",
        variant: "destructive",
      });
      return;
    }
    setSavingYc(true);
    try {
      const payload = {
        tenor: ycForm.tenor,
        rate: rateNum,
        change: parseFloat(ycForm.change) || 0,
        benchmark: ycForm.benchmark || "GoG",
        date: ycForm.date,
        source: ycForm.source || "MANUAL",
      };
      if (editingYc) {
        await adminApi.updateYieldCurve(editingYc.id, payload);
        toast({
          title: `Updated ${ycForm.tenor} Benchmark`,
          description: `Rate set to ${rateNum.toFixed(2)}% across all platforms.`,
        });
      } else {
        await adminApi.createYieldCurve(payload);
        toast({
          title: `Published ${ycForm.tenor} Rate`,
          description: `Rate ${rateNum.toFixed(2)}% added and synced to matching instruments.`,
        });
      }
      setYcDialogOpen(false);
      await loadAll();
    } catch (err) {
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Failed to save yield curve entry.",
        variant: "destructive",
      });
    } finally {
      setSavingYc(false);
    }
  };

  const handleDeleteYc = async (id: string) => {
    try {
      await adminApi.deleteYieldCurve(id);
      toast({ title: "Deleted Yield Curve Entry" });
      await loadAll();
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: err instanceof Error ? err.message : "Could not delete entry.",
        variant: "destructive",
      });
    }
  };

  // Handlers: Macro Benchmarks
  const openEditBenchmark = (bm: BenchmarkRow) => {
    setEditingBm(bm);
    setBmForm({
      symbol: bm.symbol,
      name: bm.name,
      value: bm.value != null ? String(bm.value) : "",
      change: bm.change != null ? String(bm.change) : "0",
      changePercent: bm.changePercent != null ? String(bm.changePercent) : "0",
      source: "MANUAL",
    });
    setBmDialogOpen(true);
  };

  const handleSaveBenchmark = async () => {
    const val = parseFloat(bmForm.value);
    if (Number.isNaN(val) || val <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid positive benchmark value.",
        variant: "destructive",
      });
      return;
    }
    setSavingBm(true);
    try {
      await adminApi.updateBenchmark({
        symbol: bmForm.symbol,
        name: bmForm.name,
        value: val,
        change: bmForm.change !== "" ? parseFloat(bmForm.change) : undefined,
        changePercent: bmForm.changePercent !== "" ? parseFloat(bmForm.changePercent) : undefined,
        source: bmForm.source,
      });
      toast({
        title: `Updated ${bmForm.symbol}`,
        description: `${bmForm.name} set to ${val.toLocaleString("en-GH", { maximumFractionDigits: 4 })}.`,
      });
      setBmDialogOpen(false);
      await loadAll();
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Could not update benchmark.",
        variant: "destructive",
      });
    } finally {
      setSavingBm(false);
    }
  };

  // Handlers: Tender Results
  const openAddTender = () => {
    setEditingTender(null);
    setTenderForm({
      tenderId: "",
      securityType: "BILL_91_DAY",
      instrumentName: "91-Day Treasury Bill",
      issueDate: new Date().toISOString().slice(0, 10),
      maturityDate: "",
      targetAmount: "",
      totalBidAmount: "",
      acceptedAmount: "",
      weightedAverageRate: "",
      couponRate: "",
      interestRate: "",
      boGReference: "",
    });
    setTenderDialogOpen(true);
  };

  const openEditTender = (tr: TenderResultRow) => {
    setEditingTender(tr);
    setTenderForm({
      tenderId: tr.tenderId || "",
      securityType: tr.securityType || "BILL_91_DAY",
      instrumentName: tr.instrumentName || "",
      issueDate: tr.issueDate ? new Date(tr.issueDate).toISOString().slice(0, 10) : "",
      maturityDate: tr.maturityDate ? new Date(tr.maturityDate).toISOString().slice(0, 10) : "",
      targetAmount: String(tr.targetAmount ?? ""),
      totalBidAmount: String(tr.totalBidAmount ?? ""),
      acceptedAmount: String(tr.acceptedAmount ?? ""),
      weightedAverageRate: tr.weightedAverageRate != null ? String(tr.weightedAverageRate) : "",
      couponRate: tr.couponRate != null ? String(tr.couponRate) : "",
      interestRate: tr.interestRate != null ? String(tr.interestRate) : "",
      boGReference: tr.boGReference || "",
    });
    setTenderDialogOpen(true);
  };

  const handleSaveTender = async () => {
    if (!tenderForm.tenderId.trim() || !tenderForm.instrumentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Tender Number (e.g. T1945) and Instrument Name are required.",
        variant: "destructive",
      });
      return;
    }
    setSavingTender(true);
    try {
      const payload = {
        tenderId: tenderForm.tenderId.trim(),
        securityType: tenderForm.securityType,
        instrumentName: tenderForm.instrumentName.trim(),
        issueDate: tenderForm.issueDate,
        maturityDate: tenderForm.maturityDate || undefined,
        targetAmount: parseFloat(tenderForm.targetAmount) || 0,
        totalBidAmount: parseFloat(tenderForm.totalBidAmount) || 0,
        acceptedAmount: parseFloat(tenderForm.acceptedAmount) || 0,
        weightedAverageRate: tenderForm.weightedAverageRate
          ? parseFloat(tenderForm.weightedAverageRate)
          : undefined,
        couponRate: tenderForm.couponRate ? parseFloat(tenderForm.couponRate) : undefined,
        interestRate: tenderForm.interestRate ? parseFloat(tenderForm.interestRate) : undefined,
        boGReference: tenderForm.boGReference.trim() || undefined,
      };
      if (editingTender) {
        await adminApi.updateTenderResult(editingTender.id, payload);
        toast({
          title: `Updated Tender ${payload.tenderId}`,
          description: "Auction result and benchmark rates synchronized.",
        });
      } else {
        await adminApi.createTenderResult(payload);
        toast({
          title: `Published Tender ${payload.tenderId}`,
          description: "BoG tender result published and synced to Yield Curve & Settlement Hub.",
        });
      }
      setTenderDialogOpen(false);
      await loadAll();
    } catch (err) {
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Could not save tender result.",
        variant: "destructive",
      });
    } finally {
      setSavingTender(false);
    }
  };

  const handleDeleteTender = async (id: string) => {
    try {
      await adminApi.deleteTenderResult(id);
      toast({ title: "Deleted Tender Result" });
      await loadAll();
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: err instanceof Error ? err.message : "Could not delete tender result.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Market Data & Feed Management"
        subtitle="Centralized market pricing engine serving Trade Web, Portal, and Mobile apps in real time."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncGse}
              disabled={syncingGse}
            >
              {syncingGse ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
              )}
              Sync Live GSE
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncYieldCurve}
              disabled={syncingYc}
            >
              {syncingYc ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Landmark className="h-3.5 w-3.5 text-brand-bronze" />
              )}
              Sync BoG Yields
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncFx}
              disabled={syncingFx}
            >
              {syncingFx ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5 text-brand-bronze" />
              )}
              Sync FX
            </Button>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Top Live Benchmarks Strip */}
      {loading && !summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="GSE Composite Index (GSE-CI)"
            numericValue={summary?.gseComposite ?? 0}
            isCurrency={false}
            change={summary?.gseChangePct ?? 0}
            hint={`${equities.filter((e) => e.isActive !== false).length} listed equities active`}
            icon={<TrendingUp className="h-4 w-4 text-brand-orange" />}
          />
          <StatCard
            label="91-Day GoG T-Bill Rate"
            value={summary?.tbill91 != null ? `${summary.tbill91.toFixed(2)}%` : "—"}
            change={summary?.tbill91ChangePct ?? 0}
            hint={`182D: ${summary?.tbill182 != null ? `${summary.tbill182.toFixed(2)}%` : "—"} · 364D: ${summary?.tbill364 != null ? `${summary.tbill364.toFixed(2)}%` : "—"}`}
            icon={<Landmark className="h-4 w-4 text-brand-bronze" />}
          />
          <StatCard
            label="USD / GHS Reference Rate"
            value={summary?.usdGhs != null ? `₵${summary.usdGhs.toFixed(4)}` : "—"}
            change={summary?.usdGhsChangePct ?? 0}
            hint="Interbank & FX cross feed"
            icon={<Globe className="h-4 w-4 text-brand-bronze" />}
          />
          <StatCard
            label="Fixed Income & Auctions"
            numericValue={fixedIncome.filter((f) => f.isActive !== false).length}
            isCurrency={false}
            hint={`${tenders.length} published BoG tender results`}
            icon={<Coins className="h-4 w-4 text-brand-bronze" />}
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="equities" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            GSE Equities ({equities.length})
          </TabsTrigger>
          <TabsTrigger value="fixed-income" className="gap-1.5">
            <Coins className="h-4 w-4" />
            Fixed Income & T-Bills ({fixedIncome.length})
          </TabsTrigger>
          <TabsTrigger value="yield-curve" className="gap-1.5">
            <Activity className="h-4 w-4" />
            Yield Curve & Macro ({latestYieldByTenor.length})
          </TabsTrigger>
          <TabsTrigger value="tenders" className="gap-1.5">
            <Landmark className="h-4 w-4" />
            BoG Tender Results ({tenders.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: GSE EQUITIES */}
        <TabsContent value="equities">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Ghana Stock Exchange (GSE) Listed Equities
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Manual price edits broadcast instantaneously via SSE to all active web and mobile terminals and record a historical chart point.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={equitySearch}
                    onChange={(e) => setEquitySearch(e.target.value)}
                    placeholder="Search ticker, company, sector…"
                    className="h-9 pl-9 text-xs"
                  />
                </div>
                <Button size="sm" onClick={openAddEquity}>
                  <Plus className="h-4 w-4" /> Add Equity
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Ticker</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="hidden px-4 py-3 md:table-cell">Sector</th>
                      <th className="px-4 py-3 text-right">Last Price (GHS)</th>
                      <th className="hidden px-4 py-3 text-right sm:table-cell">Prev Close</th>
                      <th className="px-4 py-3 text-right">Change</th>
                      <th className="hidden px-4 py-3 text-right lg:table-cell">Volume</th>
                      <th className="hidden px-4 py-3 text-center md:table-cell">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEquities.map((eq) => {
                      const prev = eq.previousClose ?? eq.price;
                      const changePct =
                        prev && prev > 0 ? ((eq.price - prev) / prev) * 100 : 0;
                      return (
                        <tr
                          key={eq.id || eq.ticker}
                          className="border-b border-border/60 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            {eq.ticker}
                          </td>
                          <td className="px-4 py-3 font-medium">{eq.name}</td>
                          <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                            {eq.sector}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {formatGHS(eq.price)}
                          </td>
                          <td className="hidden px-4 py-3 text-right font-mono text-xs text-muted-foreground sm:table-cell">
                            {eq.previousClose != null ? formatGHS(eq.previousClose) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={cn(
                                "inline-block rounded px-1.5 py-0.5 font-mono text-xs font-semibold",
                                changeBgClass(changePct),
                              )}
                            >
                              {changePct > 0 ? "+" : ""}
                              {changePct.toFixed(2)}%
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-right font-mono text-xs text-muted-foreground lg:table-cell">
                            {Number(eq.volume || 0).toLocaleString("en-GH")}
                          </td>
                          <td className="hidden px-4 py-3 text-center md:table-cell">
                            <Badge variant={eq.isActive !== false ? "default" : "secondary"}>
                              {eq.isActive !== false ? "Active" : "Paused"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditEquity(eq)}
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Update Quote
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEquities.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                          No matching GSE equities found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: FIXED INCOME & T-BILLS */}
        <TabsContent value="fixed-income">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  GoG Treasury Bills, Notes & Sovereign Bonds
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Updating an instrument&apos;s yield automatically updates the matching tenor on the GoG Yield Curve and Market Summary strip.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={fiSearch}
                    onChange={(e) => setFiSearch(e.target.value)}
                    placeholder="Search ISIN, tenor, name…"
                    className="h-9 pl-9 text-xs"
                  />
                </div>
                <Button size="sm" onClick={openAddFi}>
                  <Plus className="h-4 w-4" /> Add Instrument
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Tenor</th>
                      <th className="px-4 py-3">ISIN</th>
                      <th className="px-4 py-3">Instrument Name</th>
                      <th className="px-4 py-3 text-right">Yield (YTM)</th>
                      <th className="hidden px-4 py-3 text-right sm:table-cell">Coupon</th>
                      <th className="hidden px-4 py-3 text-right md:table-cell">Unit Price</th>
                      <th className="hidden px-4 py-3 text-right lg:table-cell">Maturity</th>
                      <th className="hidden px-4 py-3 text-center md:table-cell">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFixedIncome.map((fi) => (
                      <tr
                        key={fi.id}
                        className="border-b border-border/60 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <span className="rounded bg-brand-bronze/15 px-2 py-0.5 font-mono text-xs font-bold text-brand-bronze">
                            {fi.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold">
                          {fi.isin}
                        </td>
                        <td className="px-4 py-3 font-medium">{fi.name}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-brand-orange">
                          {Number(fi.yield || 0).toFixed(2)}%
                        </td>
                        <td className="hidden px-4 py-3 text-right font-mono text-xs text-muted-foreground sm:table-cell">
                          {Number(fi.couponRate || 0).toFixed(2)}%
                        </td>
                        <td className="hidden px-4 py-3 text-right font-mono text-xs md:table-cell">
                          ₵{Number(fi.price || 1).toFixed(4)}
                        </td>
                        <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground lg:table-cell">
                          {fi.maturityDate ? formatDate(fi.maturityDate) : "—"}
                        </td>
                        <td className="hidden px-4 py-3 text-center md:table-cell">
                          <Badge variant={fi.isActive !== false ? "default" : "secondary"}>
                            {fi.isActive !== false ? "Active" : "Archived"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditFi(fi)}
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Update Rate
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredFixedIncome.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                          No fixed income instruments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: YIELD CURVE & MACRO BENCHMARKS */}
        <TabsContent value="yield-curve" className="space-y-6">
          {/* Macro Indicators Row */}
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Macro Benchmarks & Exchange Rates
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Manual overrides for GSE Composite Index (GSE-CI) and GHS currency crosses displayed in ticker tapes and market summaries.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSyncFx} disabled={syncingFx}>
                {syncingFx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sync Live FX
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {benchmarks.map((bm) => (
                  <div
                    key={bm.symbol}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold uppercase text-brand-bronze">
                          {bm.symbol}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {bm.source}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{bm.name}</p>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-mono text-xl font-extrabold">
                          {bm.value != null
                            ? bm.unit === "GHS"
                              ? `₵${Number(bm.value).toFixed(4)}`
                              : Number(bm.value).toLocaleString("en-GH", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                            : "—"}
                        </span>
                        {bm.changePercent != null && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                              changeBgClass(bm.changePercent),
                            )}
                          >
                            {bm.changePercent > 0 ? "+" : ""}
                            {Number(bm.changePercent).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
                      <span className="text-[11px] text-muted-foreground">
                        {bm.timestamp ? formatDate(bm.timestamp) : "Not recorded"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openEditBenchmark(bm)}
                      >
                        <Edit3 className="h-3 w-3" /> Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* GoG Yield Curve Benchmarks */}
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  GoG Sovereign Yield Curve (91D – 15Y)
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Active benchmark curve used by client calculators, Ako AI assistant, and fixed-income pricing across Web and Mobile.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => openAddYc("91D")}>
                  <Plus className="h-4 w-4" /> Add / Override Tenor Rate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Tenor Strip */}
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
                {TENORS.map((tenor) => {
                  const row = latestYieldByTenor.find((r) => r.tenor === tenor);
                  return (
                    <button
                      key={tenor}
                      onClick={() => (row ? openEditYc(row) : openAddYc(tenor))}
                      className="flex flex-col items-center rounded-lg border border-border/80 bg-muted/30 p-2.5 text-center transition hover:border-brand-orange/60 hover:bg-muted/60"
                    >
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {tenor}
                      </span>
                      <span className="mt-1 font-mono text-base font-extrabold text-foreground">
                        {row ? `${Number(row.rate).toFixed(2)}%` : "—"}
                      </span>
                      <span className="mt-0.5 text-[10px] text-brand-orange">
                        {row ? "Edit" : "+ Set"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Full History Table */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Tenor</th>
                      <th className="px-4 py-3 text-right">Rate (%)</th>
                      <th className="px-4 py-3 text-right">Change (%)</th>
                      <th className="hidden px-4 py-3 sm:table-cell">Benchmark</th>
                      <th className="hidden px-4 py-3 md:table-cell">Source</th>
                      <th className="px-4 py-3">Effective Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yieldCurves.slice(0, 30).map((yc) => (
                      <tr
                        key={yc.id}
                        className="border-b border-border/60 hover:bg-muted/30"
                      >
                        <td className="px-4 py-2.5 font-mono font-bold">{yc.tenor}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-brand-orange">
                          {Number(yc.rate).toFixed(4)}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {(yc.change ?? 0) > 0 ? "+" : ""}
                          {Number(yc.change || 0).toFixed(2)}%
                        </td>
                        <td className="hidden px-4 py-2.5 text-xs sm:table-cell">
                          {yc.benchmark}
                        </td>
                        <td className="hidden px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                          {yc.source}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {yc.date ? formatDate(yc.date) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditYc(yc)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:text-danger"
                              onClick={() => handleDeleteYc(yc.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: BOG TENDER RESULTS */}
        <TabsContent value="tenders">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Bank of Ghana (BoG) Primary Auction Tender Results
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Publishing a tender result updates the Settlement Hub auction book, the GoG Yield Curve, and Fixed Income benchmark rates.
                </p>
              </div>
              <Button size="sm" onClick={openAddTender}>
                <Plus className="h-4 w-4" /> Publish Tender Result
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Tender ID</th>
                      <th className="px-4 py-3">Instrument</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3 text-right">Weighted Avg Rate</th>
                      <th className="hidden px-4 py-3 text-right md:table-cell">Target (GHS)</th>
                      <th className="hidden px-4 py-3 text-right md:table-cell">Accepted (GHS)</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenders.map((tr) => {
                      const rate =
                        tr.weightedAverageRate ?? tr.interestRate ?? tr.couponRate;
                      return (
                        <tr
                          key={tr.id}
                          className="border-b border-border/60 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-bold">
                            {tr.tenderId}
                          </td>
                          <td className="px-4 py-3 font-medium">{tr.instrumentName}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {tr.issueDate ? formatDate(tr.issueDate) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-brand-orange">
                            {rate != null ? `${Number(rate).toFixed(4)}%` : "—"}
                          </td>
                          <td className="hidden px-4 py-3 text-right font-mono text-xs md:table-cell">
                            {formatGHS(tr.targetAmount || 0)}
                          </td>
                          <td className="hidden px-4 py-3 text-right font-mono text-xs md:table-cell">
                            {formatGHS(tr.acceptedAmount || 0)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditTender(tr)}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger hover:text-danger"
                                onClick={() => handleDeleteTender(tr.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {tenders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No BoG tender results published yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: ADD / EDIT EQUITY */}
      <Dialog open={equityDialogOpen} onOpenChange={setEquityDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEquity
                ? `Update GSE Quote — ${editingEquity.ticker}`
                : "Add Listed GSE Equity"}
            </DialogTitle>
            <DialogDescription>
              Updates are immediately persisted in PostgreSQL, logged to the price history time-series, and pushed via SSE to all connected clients.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ticker Symbol</Label>
              <Input
                value={equityForm.ticker}
                disabled={Boolean(editingEquity)}
                onChange={(e) =>
                  setEquityForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. MTNGH"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sector</Label>
              <Input
                value={equityForm.sector}
                onChange={(e) => setEquityForm((f) => ({ ...f, sector: e.target.value }))}
                placeholder="e.g. Banking, Telecom"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Company Name</Label>
              <Input
                value={equityForm.name}
                onChange={(e) => setEquityForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Scancom PLC (MTN Ghana)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Current Price (GHS)</Label>
              <Input
                type="number"
                step="0.01"
                value={equityForm.price}
                onChange={(e) => setEquityForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Previous Close (GHS)</Label>
              <Input
                type="number"
                step="0.01"
                value={equityForm.previousClose}
                onChange={(e) =>
                  setEquityForm((f) => ({ ...f, previousClose: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Day High (GHS)</Label>
              <Input
                type="number"
                step="0.01"
                value={equityForm.dayHigh}
                onChange={(e) => setEquityForm((f) => ({ ...f, dayHigh: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Day Low (GHS)</Label>
              <Input
                type="number"
                step="0.01"
                value={equityForm.dayLow}
                onChange={(e) => setEquityForm((f) => ({ ...f, dayLow: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Session Volume (Shares)</Label>
              <Input
                type="number"
                value={equityForm.volume}
                onChange={(e) => setEquityForm((f) => ({ ...f, volume: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Market Cap</Label>
              <Input
                value={equityForm.marketCap}
                onChange={(e) =>
                  setEquityForm((f) => ({ ...f, marketCap: e.target.value }))
                }
                placeholder="e.g. GHS 30.2B"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEquityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEquity} disabled={savingEquity}>
              {savingEquity ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save & Broadcast Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: ADD / EDIT FIXED INCOME */}
      <Dialog open={fiDialogOpen} onOpenChange={setFiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFi ? `Update Fixed Income — ${editingFi.isin}` : "Add Fixed Income Security"}
            </DialogTitle>
            <DialogDescription>
              Updating the yield automatically synchronizes the matching tenor on the GoG Yield Curve and Market Summary.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>ISIN / Code</Label>
              <Input
                value={fiForm.isin}
                onChange={(e) =>
                  setFiForm((f) => ({ ...f, isin: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. GHGGOG071196"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tenor Code</Label>
              <select
                value={fiForm.type}
                onChange={(e) => setFiForm((f) => ({ ...f, type: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {TENORS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Instrument Name</Label>
              <Input
                value={fiForm.name}
                onChange={(e) => setFiForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. 91-Day GoG Treasury Bill"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Yield / Discount Rate (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={fiForm.yield}
                onChange={(e) => setFiForm((f) => ({ ...f, yield: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Coupon Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={fiForm.couponRate}
                onChange={(e) => setFiForm((f) => ({ ...f, couponRate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Price (GHS)</Label>
              <Input
                type="number"
                step="0.0001"
                value={fiForm.price}
                onChange={(e) => setFiForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Maturity Date</Label>
              <Input
                type="date"
                value={fiForm.maturityDate}
                onChange={(e) =>
                  setFiForm((f) => ({ ...f, maturityDate: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFiDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFi} disabled={savingFi}>
              {savingFi ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save & Sync Curve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: ADD / EDIT YIELD CURVE */}
      <Dialog open={ycDialogOpen} onOpenChange={setYcDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingYc
                ? `Edit ${editingYc.tenor} Yield Curve Rate`
                : "Publish GoG Yield Curve Rate"}
            </DialogTitle>
            <DialogDescription>
              Updates the sovereign benchmark curve and synchronizes matching Fixed Income instruments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tenor</Label>
              <select
                value={ycForm.tenor}
                onChange={(e) => setYcForm((f) => ({ ...f, tenor: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {TENORS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Rate (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={ycForm.rate}
                onChange={(e) => setYcForm((f) => ({ ...f, rate: e.target.value }))}
                placeholder="e.g. 28.88"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Change (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={ycForm.change}
                onChange={(e) => setYcForm((f) => ({ ...f, change: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={ycForm.date}
                onChange={(e) => setYcForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setYcDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveYc} disabled={savingYc}>
              {savingYc ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save Benchmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: MACRO BENCHMARK OVERRIDE */}
      <Dialog open={bmDialogOpen} onOpenChange={setBmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update {bmForm.symbol} Benchmark</DialogTitle>
            <DialogDescription>
              Records an official snapshot in MarketData for {bmForm.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Current Value</Label>
              <Input
                type="number"
                step="0.0001"
                value={bmForm.value}
                onChange={(e) => setBmForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Day Change (optional)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={bmForm.change}
                  onChange={(e) => setBmForm((f) => ({ ...f, change: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Change % (optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={bmForm.changePercent}
                  onChange={(e) =>
                    setBmForm((f) => ({ ...f, changePercent: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBenchmark} disabled={savingBm}>
              {savingBm ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Update Benchmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: BOG TENDER RESULT */}
      <Dialog open={tenderDialogOpen} onOpenChange={setTenderDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTender ? `Edit Tender ${editingTender.tenderId}` : "Publish BoG Tender Result"}
            </DialogTitle>
            <DialogDescription>
              Publishes the primary auction result and syncs the weighted average rate to the GoG Yield Curve and Fixed Income instruments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tender Number</Label>
              <Input
                value={tenderForm.tenderId}
                onChange={(e) =>
                  setTenderForm((f) => ({ ...f, tenderId: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. T1945"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Security Type</Label>
              <select
                value={tenderForm.securityType}
                onChange={(e) => {
                  const sec = SECURITY_TYPES.find((s) => s.value === e.target.value);
                  setTenderForm((f) => ({
                    ...f,
                    securityType: e.target.value,
                    instrumentName: sec?.defaultName || f.instrumentName,
                  }));
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {SECURITY_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Instrument Name</Label>
              <Input
                value={tenderForm.instrumentName}
                onChange={(e) =>
                  setTenderForm((f) => ({ ...f, instrumentName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={tenderForm.issueDate}
                onChange={(e) =>
                  setTenderForm((f) => ({ ...f, issueDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Weighted Average Rate (%)</Label>
              <Input
                type="number"
                step="0.0001"
                value={tenderForm.weightedAverageRate}
                onChange={(e) =>
                  setTenderForm((f) => ({ ...f, weightedAverageRate: e.target.value }))
                }
                placeholder="e.g. 28.8800"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Amount (GHS)</Label>
              <Input
                type="number"
                value={tenderForm.targetAmount}
                onChange={(e) =>
                  setTenderForm((f) => ({ ...f, targetAmount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Total Bids Tendered (GHS)</Label>
              <Input
                type="number"
                value={tenderForm.totalBidAmount}
                onChange={(e) =>
                  setTenderForm((f) => ({ ...f, totalBidAmount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Accepted Amount (GHS)</Label>
              <Input
                type="number"
                value={tenderForm.acceptedAmount}
                onChange={(e) =>
                  setTenderForm((f) => ({ ...f, acceptedAmount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>BoG Reference</Label>
              <Input
                value={tenderForm.boGReference}
                onChange={(e) =>
                  setTenderForm((f) => ({ ...f, boGReference: e.target.value }))
                }
                placeholder="e.g. Results of GOG Tender T1945"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTenderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTender} disabled={savingTender}>
              {savingTender ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Publish Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

