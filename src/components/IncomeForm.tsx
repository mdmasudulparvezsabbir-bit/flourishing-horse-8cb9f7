import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import { PlusCircle, Wallet, Calendar, Tag, FileText } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { format } from "date-fns";

const INCOME_CATEGORIES = [
  "Diss-Kp", "Diss-Mojurdia", "Diss-Mohisala", "Diss-Rupdia", 
  "Diss-Feed Agent", "Personal", "Agent Bill", "Abirlink Bill"
];

const SOURCES = ["Cash", "DBBL", "Bkash", "Nagad"];

export const IncomeForm: React.FC<{ user: any }> = ({ user }) => {
  const [formData, setFormData] = useState({
    category: INCOME_CATEGORIES[0],
    amount: "",
    source: SOURCES[0],
    date: format(new Date(), "yyyy-MM-dd"),
    note: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/income", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSuccess(true);
        setFormData({ 
          category: INCOME_CATEGORIES[0], 
          amount: "", 
          source: SOURCES[0], 
          date: new Date().toISOString().split('T')[0],
          note: "" 
        });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <GlassCard>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <PlusCircle className="text-emerald-500 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Add New Income</h3>
            <p className="text-sm text-slate-500">Record a new deposit to the system</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
              >
                {INCOME_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Entry Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Amount (BDT)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Deposit Source
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SOURCES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, source: s as any })}
                  className={cn(
                    "py-3 rounded-xl border transition-all text-sm font-bold",
                    formData.source === s 
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
            <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Note (Optional)
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all h-24 resize-none"
              placeholder="Add any additional details..."
            />
          </div>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-3 rounded-xl text-center text-sm font-bold animate-in fade-in slide-in-from-top-2">
              Income recorded successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Processing..." : "Record Income"}
          </button>
        </form>
      </GlassCard>
    </div>
  );
};
