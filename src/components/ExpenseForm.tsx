import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import { MinusCircle, Wallet, Tag, FileText, ChevronDown, Upload, Image as ImageIcon, X, Calendar } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { format } from "date-fns";

const EXPENSE_CATEGORIES: any = {
  "Diss-Kp": [],
  "Diss-Mojurdia": [],
  "Diss-Mohisala": [],
  "Diss-Rupdia": [],
  "Diss-Feed Agent": [],
  "Personal": [],
  "Agent Bill": [],
  "Abirlink Bill": [],
  "Conveyance": ["Oil", "Bus", "Van/Rickshaw"],
  "UPSTREAM BILL": [],
  "Family": ["Bonna", "Ali Ahsan", "Sumna", "Khalamma"],
  "Marjan Imports Ltd.": [],
  "Rent": ["Office", "House (Faridpur/Dhaka)", "Others"],
  "Bill": ["Electricity Bill", "Internet Bill", "Phone Bill", "Service Charge"]
};

const SOURCES = ["Cash", "DBBL", "Bkash", "Nagad"];

export const ExpenseForm: React.FC<{ user: any }> = ({ user }) => {
  const [formData, setFormData] = useState({
    category: user.role === "Technician" ? "Conveyance" : Object.keys(EXPENSE_CATEGORIES)[0],
    subcategory: "",
    amount: "",
    source: SOURCES[0],
    date: format(new Date(), "yyyy-MM-dd"),
    note: "",
    attachment: null as string | null
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const categories = user.role === "Technician" ? ["Conveyance"] : Object.keys(EXPENSE_CATEGORIES);
  const subcategories = EXPENSE_CATEGORIES[formData.category] || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a JPEG or PNG image.");
        return;
      }

      // Validate file size (3MB)
      if (file.size > 3 * 1024 * 1024) {
        alert("File size should be less than 3MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, attachment: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/expenses", {
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
          category: categories[0], 
          subcategory: "", 
          amount: "", 
          source: SOURCES[0], 
          date: new Date().toISOString().split('T')[0],
          note: "",
          attachment: null
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
          <div className="p-3 bg-red-500/10 rounded-xl">
            <MinusCircle className="text-red-500 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Add New Expense</h3>
            <p className="text-sm text-slate-500">Submit an expense for approval</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Category
              </label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: "" })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                >
                  {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {subcategories.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Subcategory
                </label>
                <div className="relative">
                  <select
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    required
                  >
                    <option value="" disabled className="bg-slate-900">Select Subcategory</option>
                    {subcategories.map((s: string) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            )}

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
              Payment Source
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
                      ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20" 
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
              <Upload className="w-4 h-4" /> Attachment (Optional)
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-6 cursor-pointer hover:bg-white/5 transition-all group">
                {formData.attachment ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                    <img src={formData.attachment} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setFormData({ ...formData, attachment: null }); }}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-600 mb-2 group-hover:text-blue-500 transition-colors" />
                    <p className="text-sm text-slate-500">Click to upload JPEG/PNG (Max 3MB)</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Note / Description
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all h-24 resize-none"
              placeholder="Add any additional details..."
              required={formData.category === "Rent" && formData.subcategory === "Others"}
            />
          </div>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-3 rounded-xl text-center text-sm font-bold">
              Expense submitted for approval!
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Expense"}
          </button>
        </form>
      </GlassCard>
    </div>
  );
};
