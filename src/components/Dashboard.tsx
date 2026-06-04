import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GlassCard } from "./GlassCard";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  ClipboardList,
  Search,
  X
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { formatCurrency, cn } from "@/src/lib/utils";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export const Dashboard: React.FC<{ user: any }> = ({ user }) => {
  const [data, setData] = useState<any>({ income: [], expenses: [], settings: null, stock: [], requisitions: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "income" | "expense">("all");

  // Search, Category, Type, and Date filtering state for Recent Activity & Submissions Log
  const [activitySearch, setActivitySearch] = useState("");
  const [activityCategory, setActivityCategory] = useState("all");
  const [activityType, setActivityType] = useState<"all" | "income" | "expense">("all");
  const [activityStartDate, setActivityStartDate] = useState("");
  const [activityEndDate, setActivityEndDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [incRes, expRes, setRes, stockRes, reqRes] = await Promise.all([
          fetch("/api/income", { headers }),
          fetch("/api/expenses", { headers }),
          fetch("/api/settings", { headers }),
          fetch("/api/stock", { headers }),
          fetch("/api/requisitions", { headers }).catch(() => null)
        ]);
        
        let income = [];
        let expenses = [];
        let settings = null;
        let stock = [];
        let requisitions = [];

        if (incRes.ok) income = await incRes.json();
        if (expRes.ok) expenses = await expRes.json();
        if (setRes.ok) settings = await setRes.json();
        if (stockRes.ok) stock = await stockRes.json();
        if (reqRes && reqRes.ok) requisitions = await reqRes.json();

        setData({ income, expenses, settings, stock, requisitions });
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Dashboard data fetch failed (expected during dev server restarts):", error);
        } else {
          console.error("Failed to fetch dashboard data:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Add a small delay in dev to avoid race conditions with server restart
    const timeout = setTimeout(fetchData, process.env.NODE_ENV === "development" ? 1000 : 0);
    return () => clearTimeout(timeout);
  }, []);

  if (loading) return <div className="text-slate-400">Loading dashboard...</div>;

  const isAdminOrManager = user.role === "Admin" || user.role === "Manager";

  // Calculations for Admin/Manager
  const approvedExpenses = data.expenses.filter((e: any) => e.status === "Approved");
  const totalIncome = data.income.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
  const totalExpense = approvedExpenses.reduce((acc: number, curr: any) => acc + (Number(curr.amount) - Number(curr.deductedAmount || 0)), 0);
  const netBalance = totalIncome - totalExpense;

  // Individual statistics for normal users (can count unapproved as submissions)
  const myTotalIncome = data.income.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
  const myTotalExpense = data.expenses.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
  const myApprovedExpense = approvedExpenses.reduce((acc: number, curr: any) => acc + (Number(curr.amount) - Number(curr.deductedAmount || 0)), 0);
  const myPendingExpense = data.expenses.filter((e: any) => e.status !== "Approved" && e.status !== "Rejected").reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

  const getSourceData = (source: string) => {
    const key = source.toLowerCase();
    const initial = Number(data.settings?.balances?.[key] || 0);
    const income = data.income
      .filter((i: any) => i.source.toLowerCase() === key)
      .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    const expense = approvedExpenses
      .filter((e: any) => e.source.toLowerCase() === key)
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) - Number(curr.deductedAmount || 0)), 0);
    return { balance: initial + income - expense, expense };
  };

  const sourceStats = {
    cash: getSourceData("Cash"),
    bkash: getSourceData("Bkash"),
    dbbl: getSourceData("DBBL"),
    nagad: getSourceData("Nagad")
  };

  // Chart Data: Daily Spending Trend (Last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayIncome = data.income
      .filter((inc: any) => format(new Date(inc.date), "yyyy-MM-dd") === dateStr)
      .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    const dayExpense = approvedExpenses
      .filter((exp: any) => format(new Date(exp.date), "yyyy-MM-dd") === dateStr)
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) - Number(curr.deductedAmount || 0)), 0);
    return { date: format(date, "MMM dd"), income: dayIncome, expense: dayExpense };
  }).reverse();

  // Chart Data: Category Expenses (Pie)
  const categoryData = approvedExpenses.reduce((acc: any, curr: any) => {
    const existing = acc.find((item: any) => item.name === curr.category);
    const netAmount = Number(curr.amount) - Number(curr.deductedAmount || 0);
    if (existing) existing.value += netAmount;
    else acc.push({ name: curr.category, value: netAmount });
    return acc;
  }, []);

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4"];

  const uniqueCategories = Array.from(
    new Set([...data.income, ...data.expenses].map((item: any) => item.category))
  ).filter(Boolean);

  const filteredActivities = [...data.income, ...data.expenses]
    .filter((item: any) => {
      // 1. Keyword search (category, description, source, user/staff name)
      if (activitySearch.trim()) {
        const query = activitySearch.toLowerCase();
        const matchesCategory = item.category?.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        const matchesSource = item.source?.toLowerCase().includes(query);
        const matchesUser = item.userName?.toLowerCase().includes(query) || item.user_id?.toString().includes(query);
        
        if (!matchesCategory && !matchesDesc && !matchesSource && !matchesUser) {
          return false;
        }
      }

      // 2. Transaction Type filter
      const isExpense = !!item.status;
      if (activityType === "income" && isExpense) return false;
      if (activityType === "expense" && !isExpense) return false;

      // 3. Category filter
      if (activityCategory !== "all") {
        if (item.category !== activityCategory) return false;
      }

      // 4. Date range filter
      if (activityStartDate) {
        const itemDate = new Date(item.date);
        const start = new Date(activityStartDate);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      if (activityEndDate) {
        const itemDate = new Date(item.date);
        const end = new Date(activityEndDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }

      return true;
    })
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!isAdminOrManager) {
    // Elegant standard user individual dashboard
    const allRecentSubmissions = [...data.income, ...data.expenses]
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredSubmissions = allRecentSubmissions.filter((item: any) => {
      if (activeTab === "all") return true;
      if (activeTab === "income") return !item.status;
      if (activeTab === "expense") return !!item.status;
      return true;
    });

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Banner */}
        <div className="p-8 bg-gradient-to-r from-blue-900/30 via-slate-900/40 to-slate-950 border border-white/5 rounded-3xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-500/10">
                Staff Account
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {user.name || user.username}!
              </h2>
              <p className="text-sm text-slate-400">
                You are currently viewed in your individual workspace. Track all your submitted incomes, expenses, and requisitions below.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/income"
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
              >
                <PlusCircle className="w-4 h-4" /> Add Income
              </Link>
              <Link
                to="/expense"
                className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/10 hover:shadow-red-600/20 transition-all hover:-translate-y-0.5"
              >
                <MinusCircle className="w-4 h-4" /> Add Expense
              </Link>
              <Link
                to="/requisition"
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all hover:-translate-y-0.5"
              >
                <ClipboardList className="w-4 h-4" /> Request Requisition
              </Link>
            </div>
          </div>
        </div>

        {/* Individual Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="border-l-4 border-emerald-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">My Cumulative Incomes</p>
                <h3 className="text-2xl font-black text-white">{formatCurrency(myTotalIncome)}</h3>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="text-emerald-500 w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 font-medium">To date income updates</p>
          </GlassCard>

          <GlassCard className="border-l-4 border-red-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">My Expense Claims</p>
                <h3 className="text-2xl font-black text-white">{formatCurrency(myTotalExpense)}</h3>
              </div>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <TrendingDown className="text-red-500 w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 font-medium">Approved: {formatCurrency(myApprovedExpense)}</p>
          </GlassCard>

          <GlassCard className="border-l-4 border-amber-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Pending Validation</p>
                <h3 className="text-2xl font-black text-white">{formatCurrency(myPendingExpense)}</h3>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="text-amber-500 w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 font-medium">Unreviewed claim value</p>
          </GlassCard>

          <GlassCard className="border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Requisitions Submitted</p>
                <h3 className="text-2xl font-black text-white">
                  {data.requisitions.length}
                </h3>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ClipboardList className="text-blue-500 w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 font-medium">
              Pending approval: {data.requisitions.filter((r: any) => r.status === "Pending").length}
            </p>
          </GlassCard>
        </div>

        {/* Submission Entries */}
        <GlassCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">My Submissions Log</h3>
              <p className="text-xs text-slate-500">A detailed feed of your local income and expense declarations.</p>
            </div>
            <div className="flex p-0.5 bg-slate-900 border border-white/5 rounded-xl self-start md:self-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
                  activeTab === "all" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                All Entries
              </button>
              <button
                onClick={() => setActiveTab("income")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
                  activeTab === "income" ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/10" : "text-slate-400 hover:text-white"
                )}
              >
                Incomes
              </button>
              <button
                onClick={() => setActiveTab("expense")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors",
                  activeTab === "expense" ? "bg-red-600/20 text-red-400 border border-red-500/10" : "text-slate-400 hover:text-white"
                )}
              >
                Expenses
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/1 flex flex-col items-center justify-center">
                <Wallet className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-400">No submissions found</p>
                <p className="text-xs text-slate-500 mt-1">Start by recording a transaction using the buttons above.</p>
              </div>
            ) : (
              filteredSubmissions.map((item: any) => {
                const isExpense = !!item.status;
                return (
                  <div
                    key={`${isExpense ? "expense" : "income"}-${item.id}`}
                    className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
                  >
                    <div className="flex items-start md:items-center gap-4 mb-4 md:mb-0">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                        isExpense ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                      )}>
                        {isExpense ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white text-base">{item.category}</p>
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                            isExpense 
                              ? item.status === "Approved" 
                                ? "bg-emerald-500/10 text-emerald-400"
                                : item.status === "Rejected"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-amber-500/10 text-amber-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          )}>
                            {isExpense ? item.status : "Approved Direct"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(item.date), "MMM dd, yyyy • hh:mm a")} • <span className="uppercase text-[10px] tracking-widest font-bold font-mono">{item.source}</span>
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-2 italic bg-black/10 p-2 rounded-lg border border-white/5">
                            "{item.description}"
                          </p>
                        )}
                        {isExpense && item.managerNote && (
                          <p className="text-xs text-amber-400/90 mt-1.5 font-medium">
                            Manager note: {item.managerNote}
                          </p>
                        )}
                        {isExpense && item.adminNote && (
                          <p className="text-xs text-blue-400/90 mt-1 font-medium">
                            Admin note: {item.adminNote}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-left md:text-right flex md:flex-col justify-between items-center md:items-end">
                      <span className="text-xs text-slate-500 uppercase font-extrabold tracking-widest block md:hidden">Amount</span>
                      <div>
                        <p className={cn("text-xl font-extrabold", isExpense ? "text-red-400" : "text-emerald-400")}>
                          {isExpense ? "-" : "+"}{formatCurrency(isExpense ? (Number(item.amount) - Number(item.deductedAmount || 0)) : item.amount)}
                        </p>
                        {isExpense && Number(item.deductedAmount || 0) > 0 && (
                          <p className="text-[10px] text-red-500 font-bold">
                            Deducted: {formatCurrency(item.deductedAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      </div>
    );
  }

  // Admin and Manager render continues below...
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Income</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(totalIncome)}</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="text-blue-500 w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-blue-400">
            <ArrowUpRight className="w-3 h-3" />
            <span>+12.5% from last month</span>
          </div>
        </GlassCard>

        <GlassCard className="border-l-4 border-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Expense</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(totalExpense)}</h3>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="text-red-500 w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-red-400">
            <ArrowDownRight className="w-3 h-3" />
            <span>+8.2% from last month</span>
          </div>
        </GlassCard>

        <GlassCard className="border-l-4 border-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Net Balance</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(netBalance)}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Wallet className="text-emerald-500 w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>System verified</span>
          </div>
        </GlassCard>

        <GlassCard className="border-l-4 border-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-white">
                {data.expenses.filter((e: any) => e.status !== "Approved").length}
              </h3>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="text-amber-500 w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="w-3 h-3" />
            <span>Requires attention</span>
          </div>
        </GlassCard>

        {data.stock.some((item: any) => item.quantity <= item.min_stock_level) && (
          <GlassCard className="border-l-4 border-red-500 bg-red-500/5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Low Stock Alert</p>
                <h3 className="text-2xl font-bold text-white">
                  {data.stock.filter((item: any) => item.quantity <= item.min_stock_level).length} Items
                </h3>
              </div>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Package className="text-red-500 w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs text-red-400 font-bold">
              <AlertTriangle className="w-3 h-3" />
              <span>Restock recommended</span>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Source Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="border-l-4 border-slate-400">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Cash Balance</p>
                <h3 className="text-xl font-bold text-white">{formatCurrency(sourceStats.cash.balance)}</h3>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Cash Expense</p>
                <p className="text-sm font-bold text-red-400">{formatCurrency(sourceStats.cash.expense)}</p>
              </div>
            </div>
            <div className="p-2 bg-slate-400/10 rounded-lg">
              <Wallet className="text-slate-400 w-4 h-4" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border-l-4 border-blue-400">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Bkash Balance</p>
                <h3 className="text-xl font-bold text-white">{formatCurrency(sourceStats.bkash.balance)}</h3>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Bkash Expense</p>
                <p className="text-sm font-bold text-red-400">{formatCurrency(sourceStats.bkash.expense)}</p>
              </div>
            </div>
            <div className="p-2 bg-blue-400/10 rounded-lg">
              <Wallet className="text-blue-400 w-4 h-4" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border-l-4 border-red-400">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">DBBL Balance</p>
                <h3 className="text-xl font-bold text-white">{formatCurrency(sourceStats.dbbl.balance)}</h3>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">DBBL Expense</p>
                <p className="text-sm font-bold text-red-400">{formatCurrency(sourceStats.dbbl.expense)}</p>
              </div>
            </div>
            <div className="p-2 bg-red-400/10 rounded-lg">
              <Wallet className="text-red-400 w-4 h-4" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border-l-4 border-orange-400">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Nagad Balance</p>
                <h3 className="text-xl font-bold text-white">{formatCurrency(sourceStats.nagad.balance)}</h3>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Nagad Expense</p>
                <p className="text-sm font-bold text-red-400">{formatCurrency(sourceStats.nagad.expense)}</p>
              </div>
            </div>
            <div className="p-2 bg-orange-400/10 rounded-lg">
              <Wallet className="text-orange-400 w-4 h-4" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="h-[400px] flex flex-col">
          <h4 className="text-lg font-bold text-white mb-6">Income vs Expense Trend</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `৳${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #ffffff10", borderRadius: "12px" }}
                  itemStyle={{ fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="income" stroke="#3b82f6" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="h-[400px] flex flex-col">
          <h4 className="text-lg font-bold text-white mb-6">Expense by Category</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #ffffff10", borderRadius: "12px" }}
                   itemStyle={{ fontSize: "12px" }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" /> Stock Overview
          </h4>
          <Link to="/inventory" className="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider">
            View Inventory
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Total Items</p>
            <p className="text-xl font-bold text-white">{data.stock.length}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Low Stock</p>
            <p className="text-xl font-bold text-red-400">
              {data.stock.filter((item: any) => item.quantity <= item.min_stock_level).length}
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">In Stock</p>
            <p className="text-xl font-bold text-emerald-400">
              {data.stock.filter((item: any) => item.quantity > item.min_stock_level).length}
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Out of Stock</p>
            <p className="text-xl font-bold text-slate-400">
              {data.stock.filter((item: any) => item.quantity === 0).length}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Recent Activity */}
      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
          <div>
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" /> Recent Activity
            </h4>
            <p className="text-xs text-slate-500">Live search and filter system for recent income and expense transactions.</p>
          </div>
          
          {(activitySearch || activityCategory !== "all" || activityType !== "all" || activityStartDate || activityEndDate) && (
            <button
              onClick={() => {
                setActivitySearch("");
                setActivityCategory("all");
                setActivityType("all");
                setActivityStartDate("");
                setActivityEndDate("");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold rounded-lg border border-red-500/20 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 mb-6 p-4 bg-slate-900/30 rounded-2xl border border-white/5">
          {/* Keyword Search */}
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              placeholder="Search by category, source, staff..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
            />
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              value={activityCategory}
              onChange={(e) => setActivityCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium cursor-pointer"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((cat: any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-2">
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <input
              type="date"
              value={activityStartDate}
              onChange={(e) => setActivityStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <input
              type="date"
              value={activityEndDate}
              onChange={(e) => setActivityEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
              title="End Date"
            />
          </div>
        </div>

        {/* Dynamic Activity List */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {filteredActivities.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/1 flex flex-col items-center justify-center">
              <Search className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-400">No matching activities found</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the filters or modifying your query.</p>
            </div>
          ) : (
            filteredActivities.map((item: any) => {
              const isExpense = !!item.status;
              return (
                <div key={`${isExpense ? 'expense' : 'income'}-${item.id}`} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors animate-fade-in">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      isExpense ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {isExpense ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-white flex items-center gap-2">
                        {item.category}
                        {item.userName && (
                          <span className="text-[10px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded font-normal font-sans">
                            By {item.userName}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 flex flex-wrap items-center gap-1">
                        <span>{format(new Date(item.date), "MMM dd, yyyy • hh:mm a")}</span>
                        {item.description && (
                          <>
                            <span className="text-slate-600 font-bold">•</span>
                            <span className="text-slate-400 italic">"{item.description}"</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold text-base", isExpense ? "text-red-400" : "text-emerald-400")}>
                      {isExpense ? "-" : "+"}{formatCurrency(isExpense ? (Number(item.amount) - Number(item.deductedAmount || 0)) : item.amount)}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none mt-1">
                      {item.source}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </GlassCard>
    </div>
  );
};
