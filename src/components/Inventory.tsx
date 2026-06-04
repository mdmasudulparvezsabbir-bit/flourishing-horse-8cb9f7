import React, { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, 
  ShoppingCart, 
  History, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  PlusCircle,
  Calendar,
  Wallet,
  User,
  Tag,
  CreditCard
} from "lucide-react";
import { formatCurrency, cn } from "@/src/lib/utils";
import { format } from "date-fns";

const SOURCES = ["Cash", "DBBL", "Bkash", "Nagad"];

export const Inventory: React.FC<{ user: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<"stock" | "purchases" | "due-purchases" | "stock-out" | "history">("stock");
  const [stock, setStock] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [stockOut, setStockOut] = useState<any[]>([]);
  const [duePurchases, setDuePurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showPayDue, setShowPayDue] = useState<any>(null);
  const [payDueData, setPayDueData] = useState({
    amount: "",
    source: SOURCES[0],
    date: format(new Date(), "yyyy-MM-dd")
  });
  const [newStockItem, setNewStockItem] = useState({
    name: "",
    description: "",
    unit: "pcs",
    min_stock_level: ""
  });
  const [purchaseData, setPurchaseData] = useState({
    itemId: "",
    quantity: "",
    pricePerUnit: "",
    paidAmount: "",
    supplier: "",
    source: SOURCES[0],
    date: format(new Date(), "yyyy-MM-dd")
  });
  const [stockOutData, setStockOutData] = useState({
    itemId: "",
    quantity: "",
    destination: "",
    date: format(new Date(), "yyyy-MM-dd")
  });
  const [historyFilterType, setHistoryFilterType] = useState<"All" | "Purchase" | "Stock Out">("All");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyItemSearch, setHistoryItemSearch] = useState("");
  const [historySupplierSearch, setHistorySupplierSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [stockRes, purchaseRes, stockOutRes, dueRes] = await Promise.all([
        fetch("/api/stock", { headers }),
        fetch("/api/purchases", { headers }),
        fetch("/api/stock-out", { headers }),
        fetch("/api/due-purchases", { headers })
      ]);
      
      if (stockRes.ok && purchaseRes.ok && stockOutRes.ok && dueRes.ok) {
        const [stockData, purchaseData, stockOutData, dueData] = await Promise.all([
          stockRes.json(),
          purchaseRes.json(),
          stockOutRes.json(),
          dueRes.json()
        ]);
        setStock(stockData);
        setPurchases(purchaseData);
        setStockOut(stockOutData);
        setDuePurchases(dueData);
      }
    } catch (error) {
      console.error("Failed to fetch inventory data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(newStockItem)
      });
      if (res.ok) {
        setShowAddStock(false);
        setNewStockItem({ name: "", description: "", unit: "pcs", min_stock_level: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add stock item:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(purchaseData)
      });
      if (res.ok) {
        setPurchaseData({
          itemId: "",
          quantity: "",
          pricePerUnit: "",
          paidAmount: "",
          supplier: "",
          source: SOURCES[0],
          date: format(new Date(), "yyyy-MM-dd")
        });
        setActiveTab("history");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to record purchase:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayDue) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/due-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          purchaseId: showPayDue.id,
          ...payDueData
        })
      });
      if (res.ok) {
        setShowPayDue(null);
        setPayDueData({
          amount: "",
          source: SOURCES[0],
          date: format(new Date(), "yyyy-MM-dd")
        });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to pay due:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/stock-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(stockOutData)
      });
      if (res.ok) {
        setStockOutData({
          itemId: "",
          quantity: "",
          destination: "",
          date: format(new Date(), "yyyy-MM-dd")
        });
        setActiveTab("history");
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to record stock out");
      }
    } catch (error) {
      console.error("Failed to record stock out:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePurchaseStatus = async (id: any, status: "Pending" | "Approved" | "Rejected") => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/purchases/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update purchase status");
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const lowStockItems = stock.filter(item => item.quantity <= item.min_stock_level);

  const filteredPurchases = purchases.filter(p => {
    const pDate = format(new Date(p.date), "yyyy-MM-dd");
    const matchesDate = (!historyStartDate || pDate >= historyStartDate) && 
                       (!historyEndDate || pDate <= historyEndDate);
    const matchesItem = !historyItemSearch || p.itemName.toLowerCase().includes(historyItemSearch.toLowerCase());
    const matchesSupplier = !historySupplierSearch || (p.supplier && p.supplier.toLowerCase().includes(historySupplierSearch.toLowerCase()));
    return matchesDate && matchesItem && matchesSupplier;
  });

  const filteredStockOut = stockOut.filter(so => {
    const soDate = format(new Date(so.date), "yyyy-MM-dd");
    const matchesDate = (!historyStartDate || soDate >= historyStartDate) && 
                       (!historyEndDate || soDate <= historyEndDate);
    const matchesItem = !historyItemSearch || so.itemName.toLowerCase().includes(historyItemSearch.toLowerCase());
    const matchesDestinationOrUser = !historySupplierSearch || 
                                    (so.destination && so.destination.toLowerCase().includes(historySupplierSearch.toLowerCase())) ||
                                    (so.userName && so.userName.toLowerCase().includes(historySupplierSearch.toLowerCase()));
    return matchesDate && matchesItem && matchesDestinationOrUser;
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">Inventory Management</h3>
          <p className="text-slate-500">Manage stock levels, purchases, and stock out</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab("stock")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === "stock" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-slate-400 hover:bg-white/10"
            )}
          >
            <Package className="w-4 h-4" /> Stock List
          </button>
          <button
            onClick={() => setActiveTab("purchases")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === "purchases" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-slate-400 hover:bg-white/10"
            )}
          >
            <ShoppingCart className="w-4 h-4" /> New Purchase
          </button>
          <button
            onClick={() => setActiveTab("due-purchases")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === "due-purchases" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-slate-400 hover:bg-white/10"
            )}
          >
            <CreditCard className="w-4 h-4" /> Due Purchases
          </button>
          <button
            onClick={() => setActiveTab("stock-out")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === "stock-out" ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-white/5 text-slate-400 hover:bg-white/10"
            )}
          >
            <TrendingDown className="w-4 h-4" /> Stock Out
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === "history" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 text-slate-400 hover:bg-white/10"
            )}
          >
            <History className="w-4 h-4" /> History
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="bg-gradient-to-br from-blue-600/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-xl">
              <Package className="text-blue-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Total Items</p>
              <p className="text-2xl font-bold text-white">{stock.length}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="bg-gradient-to-br from-red-600/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600/20 rounded-xl">
              <AlertTriangle className="text-red-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Low Stock Alert</p>
              <p className="text-2xl font-bold text-white">{lowStockItems.length}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="bg-gradient-to-br from-emerald-600/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600/20 rounded-xl">
              <TrendingUp className="text-emerald-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Total Purchases</p>
              <p className="text-2xl font-bold text-white">{purchases.length}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Main Content Area */}
      {activeTab === "stock" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search items..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <button
              onClick={() => setShowAddStock(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Add New Item
            </button>
          </div>

          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Item Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Quantity</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Last Price</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stock.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{item.name}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {item.description || "No description"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-white">{item.quantity}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        {formatCurrency(item.last_purchase_price)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {item.quantity <= item.min_stock_level ? (
                            <span className="px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full border border-red-500/20 uppercase tracking-wider">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20 uppercase tracking-wider">
                              In Stock
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {stock.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                        No stock items found. Add your first item to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "purchases" && (
        <div className="max-w-2xl mx-auto">
          <GlassCard>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-600/10 rounded-xl">
                <ShoppingCart className="text-blue-500 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Record New Purchase</h3>
                <p className="text-sm text-slate-500">Stock levels will be updated automatically</p>
              </div>
            </div>

            <form onSubmit={handleRecordPurchase} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Select Item
                  </label>
                  <select
                    value={purchaseData.itemId}
                    onChange={(e) => setPurchaseData({ ...purchaseData, itemId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    required
                  >
                    <option value="" disabled className="bg-slate-900">Select Item</option>
                    {stock.map(item => (
                      <option key={item.id} value={item.id} className="bg-slate-900">{item.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Purchase Date
                  </label>
                  <input
                    type="date"
                    value={purchaseData.date}
                    onChange={(e) => setPurchaseData({ ...purchaseData, date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Quantity
                  </label>
                  <input
                    type="number"
                    value={purchaseData.quantity}
                    onChange={(e) => setPurchaseData({ ...purchaseData, quantity: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Price Per Unit
                  </label>
                  <input
                    type="number"
                    value={purchaseData.pricePerUnit}
                    onChange={(e) => setPurchaseData({ ...purchaseData, pricePerUnit: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Paid Amount
                  </label>
                  <input
                    type="number"
                    value={purchaseData.paidAmount}
                    onChange={(e) => setPurchaseData({ ...purchaseData, paidAmount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="text-white font-bold">
                    {formatCurrency(Number(purchaseData.quantity || 0) * Number(purchaseData.pricePerUnit || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Due Amount:</span>
                  <span className="text-red-400 font-bold">
                    {formatCurrency(Math.max(0, (Number(purchaseData.quantity || 0) * Number(purchaseData.pricePerUnit || 0)) - Number(purchaseData.paidAmount || 0)))}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                  <User className="w-4 h-4" /> Supplier Name
                </label>
                <input
                  type="text"
                  value={purchaseData.supplier}
                  onChange={(e) => setPurchaseData({ ...purchaseData, supplier: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Enter supplier name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                  Payment Source
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SOURCES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPurchaseData({ ...purchaseData, source: s })}
                      className={cn(
                        "py-3 rounded-xl border transition-all text-sm font-bold",
                        purchaseData.source === s 
                          ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-600/5 border border-blue-600/10 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400 font-medium">Total Amount</span>
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(Number(purchaseData.quantity || 0) * Number(purchaseData.pricePerUnit || 0))}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Record Purchase"}
              </button>
            </form>
          </GlassCard>
        </div>
      )}

      {activeTab === "due-purchases" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-red-500" /> Pending Payments
            </h4>
          </div>
          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Item</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Supplier</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Paid</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Due</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {duePurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {format(new Date(p.date), "MMM dd, yyyy")}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-white">{p.itemName}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {p.supplier || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-400">
                        {formatCurrency(p.paidAmount)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-red-400">
                        {formatCurrency(p.dueAmount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setShowPayDue(p);
                            setPayDueData({ ...payDueData, amount: p.dueAmount.toString() });
                          }}
                          className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold rounded-xl border border-blue-600/20 transition-all"
                        >
                          Pay Now
                        </button>
                      </td>
                    </tr>
                  ))}
                  {duePurchases.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                        No pending payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "stock-out" && (
        <div className="max-w-2xl mx-auto">
          <GlassCard>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-600/10 rounded-xl">
                <TrendingDown className="text-red-500 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Record Stock Out</h3>
                <p className="text-sm text-slate-500">Specify destination for items leaving stock</p>
              </div>
            </div>

            <form onSubmit={handleStockOut} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Select Item
                  </label>
                  <select
                    value={stockOutData.itemId}
                    onChange={(e) => setStockOutData({ ...stockOutData, itemId: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    required
                  >
                    <option value="" disabled className="bg-slate-900">Select Item</option>
                    {stock.map(item => (
                      <option key={item.id} value={item.id} className="bg-slate-900">
                        {item.name} ({item.quantity} {item.unit} available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Date
                  </label>
                  <input
                    type="date"
                    value={stockOutData.date}
                    onChange={(e) => setStockOutData({ ...stockOutData, date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" /> Quantity
                  </label>
                  <input
                    type="number"
                    value={stockOutData.quantity}
                    onChange={(e) => setStockOutData({ ...stockOutData, quantity: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Destination / Place
                  </label>
                  <input
                    type="text"
                    value={stockOutData.destination}
                    onChange={(e) => setStockOutData({ ...stockOutData, destination: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="e.g. Client Office, Project Site"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Record Stock Out"}
              </button>
            </form>
          </GlassCard>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-8">
          {/* Filters */}
          <GlassCard className="p-6">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Transaction Type</label>
                <div className="flex gap-2">
                  {["All", "Purchase", "Stock Out"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setHistoryFilterType(type as any)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                        historyFilterType === type 
                          ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">End Date</label>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Item Name</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search item..."
                    value={historyItemSearch}
                    onChange={(e) => setHistoryItemSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Supplier / Dest / User</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={historySupplierSearch}
                    onChange={(e) => setHistorySupplierSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setHistoryStartDate("");
                  setHistoryEndDate("");
                  setHistoryItemSearch("");
                  setHistorySupplierSearch("");
                  setHistoryFilterType("All");
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white transition-colors"
              >
                Reset
              </button>
            </div>
          </GlassCard>

          {(historyFilterType === "All" || historyFilterType === "Purchase") && (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-500" /> Purchase History
              </h4>
              <GlassCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Item</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Supplier</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Qty</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Source</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                        {(user.role === "Admin" || user.role === "Manager") && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredPurchases.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {format(new Date(p.date), "MMM dd, yyyy")}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-white">{p.itemName}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {p.supplier || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-white">
                            {p.quantity}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-400">
                            {formatCurrency(p.totalAmount)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-white/5 text-slate-400 text-[10px] font-bold rounded-full border border-white/10 uppercase tracking-wider">
                              {p.source}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider",
                              p.status === "Approved" 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : p.status === "Rejected"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                              {p.status || "Pending"}
                            </span>
                          </td>
                          {(user.role === "Admin" || user.role === "Manager") && (
                            <td className="px-6 py-4 text-center">
                              {(p.status || "Pending") === "Pending" ? (
                                <button
                                  onClick={() => handleUpdatePurchaseStatus(p.id, "Approved")}
                                  className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-transform active:scale-95 shadow-md shadow-emerald-600/20"
                                >
                                  Approve
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500">-</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                      {filteredPurchases.length === 0 && !loading && (
                        <tr>
                          <td colSpan={(user.role === "Admin" || user.role === "Manager") ? 8 : 7} className="px-6 py-10 text-center text-slate-500">
                            No purchase history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}

          {(historyFilterType === "All" || historyFilterType === "Stock Out") && (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" /> Stock Out History
              </h4>
              <GlassCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Item</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Destination</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Qty</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredStockOut.map((so) => (
                        <tr key={so.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {format(new Date(so.date), "MMM dd, yyyy")}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-white">{so.itemName}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {so.destination}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-white">
                            {so.quantity}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-white/5 text-slate-400 text-[10px] font-bold rounded-full border border-white/10 uppercase tracking-wider">
                              {so.userName}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredStockOut.length === 0 && !loading && (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                            No stock out history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white">Add New Stock Item</h3>
              <button 
                onClick={() => setShowAddStock(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5 text-slate-500 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Item Name</label>
                <input
                  type="text"
                  value={newStockItem.name}
                  onChange={(e) => setNewStockItem({ ...newStockItem, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="e.g. Router, Cable, etc."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Description</label>
                <textarea
                  value={newStockItem.description}
                  onChange={(e) => setNewStockItem({ ...newStockItem, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all h-24 resize-none"
                  placeholder="Add item details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">Unit</label>
                  <select
                    value={newStockItem.unit}
                    onChange={(e) => setNewStockItem({ ...newStockItem, unit: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    required
                  >
                    <option value="pcs" className="bg-slate-900">pcs</option>
                    <option value="mtr" className="bg-slate-900">mtr</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">Min Stock Level</label>
                  <input
                    type="number"
                    value={newStockItem.min_stock_level}
                    onChange={(e) => setNewStockItem({ ...newStockItem, min_stock_level: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="5"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Stock Item"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      {/* Pay Due Modal */}
      {showPayDue && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-white">Pay Due Balance</h3>
                <p className="text-sm text-slate-500">For {showPayDue.itemName} from {showPayDue.supplier || 'Unknown'}</p>
              </div>
              <button 
                onClick={() => setShowPayDue(null)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <Plus className="w-5 h-5 text-slate-500 rotate-45" />
              </button>
            </div>

            <form onSubmit={handlePayDue} className="space-y-6">
              <div className="p-4 bg-red-600/5 border border-red-600/10 rounded-2xl mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400 font-medium">Remaining Due</span>
                  <span className="text-xl font-bold text-red-400">
                    {formatCurrency(showPayDue.dueAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Payment Amount</label>
                <input
                  type="number"
                  value={payDueData.amount}
                  onChange={(e) => setPayDueData({ ...payDueData, amount: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="0.00"
                  max={showPayDue.dueAmount}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Payment Source</label>
                <div className="grid grid-cols-2 gap-3">
                  {SOURCES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPayDueData({ ...payDueData, source: s })}
                      className={cn(
                        "py-3 rounded-xl border transition-all text-sm font-bold",
                        payDueData.source === s 
                          ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Payment Date</label>
                <input
                  type="date"
                  value={payDueData.date}
                  onChange={(e) => setPayDueData({ ...payDueData, date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Confirm Payment"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
