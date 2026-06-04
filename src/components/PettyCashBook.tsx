import React, { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { BookOpen, ArrowUpRight, ArrowDownRight, History, Image as ImageIcon, XCircle } from "lucide-react";
import { formatCurrency, cn } from "@/src/lib/utils";
import { format } from "date-fns";

export const PettyCashBook: React.FC<{ user: any }> = ({ user }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
          
          const approvedExpenses = expenses.filter((e: any) => e.status === "Approved");
          
          // Combine and sort by date
          const combined = [
            ...income.map((i: any) => ({ ...i, type: "Income" })),
            ...approvedExpenses.map((e: any) => ({ ...e, type: "Expense" }))
          ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // Calculate running balance
          let balance = 0;
          const history = combined.map(item => {
            if (item.type === "Income") {
              balance += Number(item.amount);
            } else {
              balance -= (Number(item.amount) - Number(item.deductedAmount || 0));
            }
            return { ...item, balance };
          }).reverse();

          setData(history);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Petty cash data fetch failed (expected during dev server restarts):", error);
        } else {
          console.error("Failed to fetch petty cash data:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Add a small delay in dev to avoid race conditions with server restart
    const timeout = setTimeout(fetchData, process.env.NODE_ENV === "development" ? 1000 : 0);
    return () => clearTimeout(timeout);
  }, []);

  if (loading) return <div className="text-slate-400">Loading petty cash book...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">Petty Cash Book</h3>
          <p className="text-slate-500">Date by date financial history</p>
        </div>
        <div className="bg-blue-600/10 border border-blue-600/20 px-6 py-3 rounded-2xl">
          <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-1">Current Balance</p>
          <p className="text-xl font-bold text-white">{formatCurrency(data[0]?.balance || 0)}</p>
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Income</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Expense</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((item) => (
                <tr key={`${item.type}-${item.id}`} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-400">{format(new Date(item.date), "MMM dd, yyyy")}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">{item.category}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.source}</p>
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
                  <td className="px-6 py-4 text-right">
                    {item.type === "Income" ? (
                      <span className="text-emerald-400 font-bold">+{formatCurrency(item.amount)}</span>
                    ) : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.type === "Expense" ? (
                      <div className="flex flex-col items-end">
                        <span className="text-red-400 font-bold">-{formatCurrency(item.amount - (item.deductedAmount || 0))}</span>
                        {item.deductedAmount > 0 && (
                          <span className="text-[10px] text-slate-500 line-through">{formatCurrency(item.amount)}</span>
                        )}
                      </div>
                    ) : "-"}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-white">
                    {formatCurrency(item.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length === 0 && (
          <div className="py-20 text-center text-slate-500">
            No transactions recorded yet.
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
