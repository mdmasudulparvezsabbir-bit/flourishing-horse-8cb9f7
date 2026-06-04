import React, { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { FileDown, Filter, Calendar, Search, Download, Image as ImageIcon, XCircle } from "lucide-react";
import { formatCurrency, cn } from "@/src/lib/utils";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import ExcelJS from "exceljs";

export const Reports: React.FC<{ user: any }> = ({ user }) => {
  const [data, setData] = useState<any>({ income: [], expenses: [] });
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    type: "All",
    category: "All",
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd")
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [incRes, expRes] = await Promise.all([
          fetch("/api/income", { headers }),
          fetch("/api/expenses", { headers })
        ]);
        
        if (incRes.ok && expRes.ok) {
          const [income, expenses] = await Promise.all([incRes.json(), expRes.json()]);
          setData({ income, expenses });
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Reports data fetch failed (expected during dev server restarts):", error);
        } else {
          console.error("Failed to fetch reports data:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Add a small delay in dev to avoid race conditions with server restart
    const timeout = setTimeout(fetchData, process.env.NODE_ENV === "development" ? 1000 : 0);
    return () => clearTimeout(timeout);
  }, []);

  const filteredData = [
    ...data.income.map((i: any) => ({ ...i, type: "Income" })),
    ...data.expenses.filter((e: any) => e.status === "Approved").map((e: any) => ({ ...e, type: "Expense" }))
  ].filter((item: any) => {
    const date = new Date(item.date);
    const inRange = isWithinInterval(date, {
      start: startOfDay(new Date(filter.startDate)),
      end: endOfDay(new Date(filter.endDate))
    });
    const typeMatch = filter.type === "All" || item.type === filter.type;
    const categoryMatch = filter.category === "All" || item.category === filter.category;
    return inRange && typeMatch && categoryMatch;
  }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Financial Report");

    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Type", key: "type", width: 12 },
      { header: "Category", key: "category", width: 20 },
      { header: "Original Amount", key: "originalAmount", width: 15 },
      { header: "Deduction", key: "deduction", width: 15 },
      { header: "Net Amount", key: "netAmount", width: 15 },
      { header: "Source", key: "source", width: 12 },
      { header: "Note", key: "note", width: 30 },
    ];

    filteredData.forEach(item => {
      const netAmount = item.type === "Expense" ? (Number(item.amount) - Number(item.deductedAmount || 0)) : item.amount;
      worksheet.addRow({
        date: format(new Date(item.date), "yyyy-MM-dd"),
        type: item.type,
        category: item.category,
        originalAmount: item.amount,
        deduction: item.deductedAmount || 0,
        netAmount: netAmount,
        source: item.source,
        note: item.note || ""
      });
    });

    // Styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Report_${filter.startDate}_to_${filter.endDate}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-slate-400">Loading reports...</div>;

  const categories = Array.from(new Set([...data.income, ...data.expenses].map((i: any) => i.category).filter(Boolean)));

  return (
    <div className="space-y-8">
      <GlassCard>
        <div className="flex flex-col lg:flex-row gap-6 items-end">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Type</label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
              >
                <option value="All" className="bg-slate-900">All Types</option>
                <option value="Income" className="bg-slate-900">Income Only</option>
                <option value="Expense" className="bg-slate-900">Expense Only</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
              >
                <option value="All" className="bg-slate-900">All Categories</option>
                {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">End Date</label>
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
          <button
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all w-full lg:w-auto whitespace-nowrap"
          >
            <Download className="w-5 h-5" /> Export Excel
          </button>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Source</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((item) => (
                <tr key={`${item.type}-${item.id}`} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-300">{format(new Date(item.date), "MMM dd, yyyy")}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest",
                      item.type === "Income" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{item.category}</p>
                        {item.subcategory && <p className="text-[10px] text-slate-500">{item.subcategory}</p>}
                      </div>
                      {item.attachment && (
                        <button
                          onClick={() => setPreviewImage(item.attachment)}
                          className="p-1.5 bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600/20 transition-all"
                          title="View Attachment"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{item.source}</td>
                  <td className={cn(
                    "px-6 py-4 text-sm font-bold text-right",
                    item.type === "Income" ? "text-emerald-400" : "text-red-400"
                  )}>
                    <div className="flex flex-col items-end">
                      <span>{item.type === "Income" ? "+" : "-"}{formatCurrency(item.type === "Expense" ? (item.amount - (item.deductedAmount || 0)) : item.amount)}</span>
                      {item.type === "Expense" && item.deductedAmount > 0 && (
                        <span className="text-[10px] text-slate-500 line-through">{formatCurrency(item.amount)}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="py-20 text-center text-slate-500">
            No records found for the selected filters.
          </div>
        )}
      </GlassCard>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-red-400 transition-colors"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img
              src={previewImage}
              alt="Attachment Preview"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
