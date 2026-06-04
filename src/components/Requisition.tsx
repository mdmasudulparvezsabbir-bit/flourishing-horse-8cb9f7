import React, { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { 
  Plus, 
  Trash2, 
  Send, 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { formatCurrency, cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface RequisitionItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface RequisitionData {
  id?: number;
  title: string;
  items: RequisitionItem[];
  totalAmount: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  date: string;
  userName?: string;
  adminNote?: string;
}

export const Requisition: React.FC<{ user: any }> = ({ user }) => {
  const [requisitions, setRequisitions] = useState<RequisitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<RequisitionItem[]>([
    { description: "", quantity: 1, unitPrice: 0 }
  ]);

  // Admin/Manager Approval State
  const [adminNote, setAdminNote] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchRequisitions = async () => {
    try {
      const res = await fetch("/api/requisitions", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequisitions(data.map((r: any) => ({
          ...r,
          items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
        })));
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch requisitions server error:", errorData);
      }
    } catch (error) {
      console.error("Failed to fetch requisitions network error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof RequisitionItem, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(item => !item.description || item.quantity <= 0 || item.unitPrice < 0)) {
      alert("Please fill all item details correctly.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title,
          items,
          totalAmount,
          reason
        }),
      });

      if (res.ok) {
        setTitle("");
        setReason("");
        setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
        setShowForm(false);
        fetchRequisitions();
        alert("Requisition submitted successfully!");
      }
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: "Approved" | "Rejected") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/requisitions/${id}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status, adminNote }),
      });

      if (res.ok) {
        setAdminNote("");
        fetchRequisitions();
      }
    } catch (error) {
      console.error("Status update failed:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "Rejected": return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-amber-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Approved": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Rejected": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">Requisitions</h3>
          <p className="text-slate-500">Manage and track your supply requests</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          {showForm ? <XCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? "Cancel" : "New Requisition"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="border-blue-500/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Requisition Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Office Stationery, IT Equipment"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Reason / Purpose</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why is this needed?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Items List</h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="sm:col-span-6 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white"
                            placeholder="Item name/details"
                            required
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white"
                            min="1"
                            required
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Unit Price</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-center pb-1">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-6 border-t border-white/5">
                  <div className="text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-500 uppercase">Estimated Total</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalAmount)}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-12 py-4 rounded-xl shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? "Submitting..." : <><Send className="w-5 h-5" /> Submit Requisition</>}
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-1">Recent Requisitions</h4>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading requisitions...</p>
          </div>
        ) : requisitions.length === 0 ? (
          <GlassCard className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
            <p className="text-slate-500">No requisitions found</p>
          </GlassCard>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left text-sm border-separate border-spacing-y-3 min-w-[800px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-6 pb-2 font-medium uppercase tracking-wider text-[10px]">Title & Date</th>
                  <th className="px-6 pb-2 font-medium uppercase tracking-wider text-[10px]">Requested By</th>
                  <th className="px-6 pb-2 font-medium uppercase tracking-wider text-[10px] text-right">Total Amount</th>
                  <th className="px-6 pb-2 font-medium uppercase tracking-wider text-[10px] text-center">Status</th>
                  <th className="px-6 pb-2 font-medium uppercase tracking-wider text-[10px] text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((req) => (
                  <React.Fragment key={req.id}>
                    <tr 
                      className={cn(
                        "bg-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group",
                        expandedId === req.id && "bg-white/[0.12] ring-1 ring-blue-500/30"
                      )}
                      onClick={() => setExpandedId(expandedId === req.id ? null : req.id!)}
                    >
                      <td className="px-6 py-4 rounded-l-2xl">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg border", getStatusClass(req.status))}>
                            {getStatusIcon(req.status)}
                          </div>
                          <div>
                            <p className="font-bold text-white">{req.title}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{new Date(req.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                            {(req.userName || "Y")[0].toUpperCase()}
                          </div>
                          <span className="text-slate-300 font-medium">{req.userName || "You"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-white">{formatCurrency(req.totalAmount)}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase border inline-flex items-center gap-1.5",
                          getStatusClass(req.status)
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                            req.status === "Approved" ? "bg-emerald-400" : 
                            req.status === "Rejected" ? "bg-red-400" : "bg-amber-400"
                          )} />
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 rounded-r-2xl text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase group-hover:text-blue-400 transition-colors">
                            {expandedId === req.id ? "Hide" : "View"}
                          </span>
                          {expandedId === req.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedId === req.id && (
                        <tr>
                          <td colSpan={5} className="px-2 pb-4">
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="bg-white/[0.03] border-x border-b border-white/5 rounded-b-2xl p-6 space-y-6"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason / Purpose</p>
                                  <p className="text-sm text-slate-300 bg-slate-950/30 p-4 rounded-xl border border-white/5 italic">
                                    "{req.reason}"
                                  </p>
                                </div>
                                {req.adminNote && (
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Admin/Manager Note</p>
                                    <div className="bg-blue-600/5 border border-blue-500/20 p-4 rounded-xl flex gap-3">
                                      <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                      <p className="text-sm text-slate-300">{req.adminNote}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Items Breakdown</p>
                                <div className="overflow-hidden rounded-xl border border-white/5">
                                  <table className="w-full text-left text-sm">
                                    <thead>
                                      <tr className="bg-white/5 text-slate-500">
                                        <th className="px-4 py-3 font-medium">Description</th>
                                        <th className="px-4 py-3 font-medium text-center">Qty</th>
                                        <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                                        <th className="px-4 py-3 font-medium text-right">Total</th>
                                        <th className="px-4 py-3 font-medium text-right">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-slate-300">
                                      {req.items.map((item, i) => (
                                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                                          <td className="px-4 py-3">{item.description}</td>
                                          <td className="px-4 py-3 text-center font-mono">{item.quantity}</td>
                                          <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                                          <td className="px-4 py-3 text-right font-bold text-white font-mono">{formatCurrency(item.quantity * item.unitPrice)}</td>
                                          <td className="px-4 py-3 text-right">
                                            <span className={cn(
                                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                              getStatusClass(req.status)
                                            )}>
                                              {req.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {(user.role === "Admin" || user.role === "Manager") && req.status === "Pending" && (
                                <div className="pt-6 border-t border-white/5 space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Add Decision Note (Optional)</label>
                                    <textarea
                                      value={adminNote}
                                      onChange={(e) => setAdminNote(e.target.value)}
                                      className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[80px] text-sm"
                                      placeholder="Explain the reason for approval or rejection..."
                                    />
                                  </div>
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => handleStatusUpdate(req.id!, "Approved")}
                                      disabled={processingId === req.id}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                                    >
                                      Approve Requisition
                                    </button>
                                    <button
                                      onClick={() => handleStatusUpdate(req.id!, "Rejected")}
                                      disabled={processingId === req.id}
                                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-red-600/20"
                                    >
                                      Reject Requisition
                                    </button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
