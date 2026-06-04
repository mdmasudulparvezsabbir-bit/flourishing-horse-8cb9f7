import React, { useState } from "react";
import { GlassCard } from "./GlassCard";
import { Terminal, Send, Play, AlertCircle, CheckCircle2, Loader2, Database } from "lucide-react";

export const SqlTerminal: React.FC = () => {
  const [query, setQuery] = useState("SELECT * FROM users LIMIT 5");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await fetch("/api/sql-diagnostic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ query })
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Failed to execute query");
      }
    } catch (err) {
      setError("Network error or server unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="text-blue-400 w-5 h-5" /> Live SQL Console
        </h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Server Hooked</span>
            <span className="text-[8px] font-mono text-emerald-500/60 ml-2 border-l border-emerald-500/20 pl-2">
              {result?.serverFingerprint || "SHA256:4atScLXSNGC..."}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative group">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-4 font-mono text-sm text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[120px] transition-all"
            spellCheck={false}
          />
          <button
            onClick={runQuery}
            disabled={loading || !query}
            className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white p-2 rounded-lg transition-all shadow-lg hover:scale-110 active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            <p className="text-xs text-red-400 font-bold">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Query Executed Successfully</span>
            </div>
            
            <div className="bg-slate-950 border border-white/5 rounded-xl overflow-hidden">
              <div className="p-2 bg-white/5 border-b border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Database className="w-3 h-3" /> {result.source || 'Result Set'}
                </span>
                <span className="text-[10px] text-slate-600">{result.rowCount} rows returned</span>
              </div>
              <div className="overflow-x-auto max-h-[300px]">
                {result.rows && result.rows.length > 0 ? (
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        {Object.keys(result.rows[0]).map(key => (
                          <th key={key} className="p-3 font-bold text-slate-300 uppercase">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {result.rows.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} className="p-3 text-slate-400 font-mono">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-slate-600 text-xs italic">
                    Query returned no results
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
        <Play className="w-4 h-4 text-blue-400" />
        <p className="text-[10px] text-slate-400">
          <strong>Tip:</strong> Try <span className="text-blue-300 font-mono uppercase">SELECT * FROM stock_items</span> to verify your MongoDB SQL data flow.
        </p>
      </div>
    </GlassCard>
  );
};
