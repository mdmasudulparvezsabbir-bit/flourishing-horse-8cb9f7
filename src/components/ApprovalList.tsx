import React, { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { CheckCircle, XCircle, Clock, MessageSquare, User, Tag, Wallet, Image as ImageIcon, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { formatCurrency, cn } from "@/src/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

export const ApprovalList: React.FC<{ user: any }> = ({ user }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [deductedAmount, setDeductedAmount] = useState<string>("0");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/expenses", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Expenses fetch failed (expected during dev server restarts):", error);
      } else {
        console.error("Failed to fetch expenses:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add a small delay in dev to avoid race conditions with server restart
    const timeout = setTimeout(fetchExpenses, process.env.NODE_ENV === "development" ? 1000 : 0);
    return () => clearTimeout(timeout);
  }, []);

  const handleVerify = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}/verify`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ note, deductedAmount: Number(deductedAmount) }),
    });
    if (res.ok) {
      setNote("");
      setDeductedAmount("0");
      setSelectedId(null);
      fetchExpenses();
    }
  };

  const handleApprove = async (id: string, finalDeduction?: number) => {
    const res = await fetch(`/api/expenses/${id}/approve`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ deductedAmount: finalDeduction, adminNote }),
    });
    if (res.ok) {
      setDeductedAmount("0");
      setAdminNote("");
      setSelectedId(null);
      fetchExpenses();
    }
  };

  const handleReject = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}/reject`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ note: user.role === "Admin" ? adminNote : note }),
    });
    if (res.ok) {
      setNote("");
      setAdminNote("");
      setSelectedId(null);
      fetchExpenses();
    }
  };

  if (loading) return <div className="text-slate-400">Loading approvals...</div>;

  const pending = expenses.filter(e => e.status === "Pending");
  const verified = expenses.filter(e => e.status === "Verified");

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Manager Verification Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="text-amber-500 w-5 h-5" /> Manager Review
            </h3>
            <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-bold">
              {pending.length} Items
            </span>
          </div>
          
          {pending.length === 0 ? (
            <GlassCard className="text-center py-12">
              <p className="text-slate-500">No expenses pending verification</p>
            </GlassCard>
          ) : (
            pending.map((exp) => (
              <GlassCard 
                key={exp.id} 
                className={cn(
                  "relative overflow-hidden group transition-all duration-300",
                  expandedId === exp.id ? "ring-2 ring-amber-500/30" : "hover:border-white/20"
                )}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                        <Clock className="text-amber-500 w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{exp.category}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{exp.source}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{formatCurrency(exp.amount)}</p>
                      <p className="text-[10px] text-slate-500">{format(new Date(exp.date), "MMM dd, yyyy")}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 text-slate-500">
                    <div className="flex items-center gap-2 text-xs">
                      <User className="w-3 h-3" /> 
                      <span>Submitted by User #{exp.userId}</span>
                    </div>
                    {expandedId === exp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === exp.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-6 mt-4 border-t border-white/5 space-y-6">
                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">User Note</p>
                              <div className="bg-white/5 p-4 rounded-xl border border-white/5 italic text-sm text-slate-300">
                                "{exp.description || exp.note || "No description provided"}"
                              </div>
                            </div>

                            {exp.attachment && (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Attachment</p>
                                <div 
                                  className="relative group/img cursor-pointer rounded-xl overflow-hidden border border-white/10 aspect-video bg-slate-900"
                                  onClick={() => setPreviewImage(exp.attachment)}
                                >
                                  <img src={exp.attachment} alt="Attachment" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                                      <ImageIcon className="w-4 h-4" /> Click to Expand
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div className="bg-blue-600/5 border border-blue-500/10 rounded-xl p-4">
                              <p className="text-[10px] text-blue-400 uppercase font-bold mb-3 tracking-widest">Financial Summary</p>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-400">Requested Amount</span>
                                  <span className="text-sm font-bold text-white">{formatCurrency(exp.amount)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-400">Status</span>
                                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase">Pending</span>
                                </div>
                              </div>
                            </div>

                            {(user.role === "Manager" || user.role === "Admin") && (
                              <div className="space-y-4">
                                {selectedId === exp.id ? (
                                  <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Deduct Amount (৳)</label>
                                      <input
                                        type="number"
                                        value={deductedAmount}
                                        onChange={(e) => setDeductedAmount(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Manager Note</label>
                                      <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Add a manager note..."
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-20 resize-none"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleVerify(exp.id)}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2 rounded-lg transition-all"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleReject(exp.id)}
                                        className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-bold py-2 rounded-lg transition-all border border-red-500/20"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => setSelectedId(null)}
                                        className="px-4 bg-white/5 hover:bg-white/10 text-slate-400 text-sm font-bold py-2 rounded-lg transition-all"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedId(exp.id);
                                      setNote("");
                                      setDeductedAmount("0");
                                    }}
                                    className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-500/30 text-sm font-bold py-3 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                                  >
                                    Review Expense
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            ))
          )}
        </div>

        {/* Admin Final Approval Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="text-blue-500 w-5 h-5" /> Admin Final Approval
            </h3>
            <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-xs font-bold">
              {verified.length} Items
            </span>
          </div>

          {verified.length === 0 ? (
            <GlassCard className="text-center py-12">
              <p className="text-slate-500">No expenses pending final approval</p>
            </GlassCard>
          ) : (
            verified.map((exp) => (
              <GlassCard 
                key={exp.id} 
                className={cn(
                  "relative overflow-hidden group transition-all duration-300 border-l-4 border-blue-500",
                  expandedId === exp.id ? "ring-2 ring-blue-500/30" : "hover:border-white/20"
                )}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <CheckCircle className="text-blue-500 w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{exp.category}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{exp.source}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{formatCurrency(exp.amount - (exp.deductedAmount || 0))}</p>
                      <p className="text-[10px] text-slate-500">{format(new Date(exp.date), "MMM dd, yyyy")}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 text-slate-500">
                    <div className="flex items-center gap-2 text-xs">
                      <User className="w-3 h-3" /> 
                      <span>Verified by Manager</span>
                    </div>
                    {expandedId === exp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === exp.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-6 mt-4 border-t border-white/5 space-y-6">
                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                              <p className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest">Expense Breakdown</p>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-400">Original Amount</span>
                                  <span className="text-sm font-bold text-white">{formatCurrency(exp.amount)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-red-400">Deduction</span>
                                  <span className="text-sm font-bold text-red-400">-{formatCurrency(exp.deductedAmount || 0)}</span>
                                </div>
                                <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                  <span className="text-xs font-bold text-emerald-400">Final Amount</span>
                                  <span className="text-lg font-bold text-emerald-400">{formatCurrency(exp.amount - (exp.deductedAmount || 0))}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">User Note</p>
                              <p className="text-sm text-slate-300 italic bg-white/5 p-3 rounded-lg border border-white/5">
                                "{exp.description || exp.note || "No description"}"
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="bg-blue-600/5 border border-blue-500/20 p-4 rounded-xl">
                              <p className="text-[10px] text-blue-400 uppercase font-bold mb-2 flex items-center gap-1 tracking-widest">
                                <MessageSquare className="w-3 h-3" /> Manager Note
                              </p>
                              <p className="text-sm text-slate-300 italic">
                                "{exp.managerNote || "No manager note added"}"
                              </p>
                            </div>

                            {exp.attachment && (
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Attachment</p>
                                <div 
                                  className="relative group/img cursor-pointer rounded-xl overflow-hidden border border-white/10 aspect-video bg-slate-900"
                                  onClick={() => setPreviewImage(exp.attachment)}
                                >
                                  <img src={exp.attachment} alt="Attachment" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                                      <ImageIcon className="w-4 h-4" /> View Full Image
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {user.role === "Admin" && (
                              <div className="pt-4 border-t border-white/5">
                                {selectedId === exp.id ? (
                                  <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Adjust Deduction (৳)</label>
                                      <input
                                        type="number"
                                        value={deductedAmount}
                                        onChange={(e) => setDeductedAmount(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Admin Note</label>
                                      <textarea
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        placeholder="Add an admin note..."
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-20 resize-none"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleApprove(exp.id, Number(deductedAmount))}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 rounded-lg transition-all"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={() => handleReject(exp.id)}
                                        className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-bold py-2 rounded-lg transition-all border border-red-500/20"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => setSelectedId(null)}
                                        className="px-4 bg-white/5 hover:bg-white/10 text-slate-400 text-sm font-bold py-2 rounded-lg transition-all"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleApprove(exp.id)}
                                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                                    >
                                      Approve & Finalize
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedId(exp.id);
                                        setDeductedAmount(exp.deductedAmount?.toString() || "0");
                                      }}
                                      className="px-4 bg-white/5 hover:bg-white/10 text-slate-400 text-sm font-bold py-3 rounded-xl border border-white/5 transition-all"
                                    >
                                      Deduct
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            ))
          )}
        </div>
      </div>

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
