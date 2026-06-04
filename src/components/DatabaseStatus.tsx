import React, { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { Database, CheckCircle2, XCircle, Table, RefreshCw } from "lucide-react";

export const DatabaseStatus: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/db-status", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        const errData = await res.json();
        setError(errData.message || "Failed to connect to database");
      }
    } catch (err) {
      setError("Network error or server unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <GlassCard className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-white flex items-center gap-2">
          <Database className="text-purple-500 w-5 h-5" /> Database Connection Status
        </h4>
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking connection...</span>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">Connection Failed</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">
            Please check your environment variables in the Settings menu.
          </p>
        </div>
      ) : status && status.status === "Connected" ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-emerald-400 bg-emerald-400/10 p-4 rounded-xl border border-emerald-400/20">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">Successfully Connected</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs opacity-80">Type: {status.type || 'SQLite'}</p>
                {status.type?.includes("MongoDB") && (
                  <span className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[8px] font-black uppercase rounded">MongoSQL</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
              <Table className="w-3 h-3" />
              Available Tables ({status.tables.length})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {status.tables.slice(0, 12).map((table: string) => (
                <div key={table} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-slate-300 truncate font-mono">
                  {table}
                </div>
              ))}
              {status.tables.length > 12 && (
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-slate-500 italic">
                  + {status.tables.length - 12} more...
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
};
