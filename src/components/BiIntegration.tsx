import React from "react";
import { GlassCard } from "./GlassCard";
import { BarChart3, Database, ExternalLink, Info, Terminal, Settings, Lock, AlertCircle, Shield, History } from "lucide-react";

export const BiIntegration: React.FC = () => {
  return (
    <GlassCard className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-pink-500 w-5 h-5" /> BI Tool & SQL Integration
          </h4>
          <p className="text-slate-500 text-sm">Connect Tableau, Power BI, or DBeaver to your MongoDB SQL Interface</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <img src="https://img.icons8.com/color/48/tableau-software.png" alt="Tableau" className="w-6 h-6" />
          </div>
          <h5 className="font-bold text-white text-sm">Tableau</h5>
          <p className="text-[11px] text-slate-400">Use the Tableau Connector (taco) and JDBC driver to visualize your ERP data.</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <img src="https://img.icons8.com/color/48/power-bi.png" alt="Power BI" className="w-6 h-6" />
          </div>
          <h5 className="font-bold text-white text-sm">Power BI</h5>
          <p className="text-[11px] text-slate-400">Use the MongoDB Atlas SQL connector with DirectQuery support.</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
          <div className="w-10 h-10 bg-slate-500/20 rounded-lg flex items-center justify-center">
            <Database className="text-slate-400 w-6 h-6" />
          </div>
          <h5 className="font-bold text-white text-sm">DBeaver</h5>
          <p className="text-[11px] text-slate-400">Connect via generic JDBC driver using the class name com.mongodb.jdbc.MongoDriver.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <h5 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" /> SQL Interface Setup
          </h5>
          <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 space-y-3">
            <p className="text-[11px] text-slate-400">Run the MongoDB SQL Schema Builder to generate the relational schema:</p>
            <div className="bg-black/40 p-3 rounded-lg font-mono text-[10px] text-blue-300 break-all">
              ./mongodb-schema-manager --uri 'mongodb://&lt;db_user&gt;:&lt;pass&gt;@&lt;host&gt;/?authSource=admin'
            </div>
            <div className="flex items-start gap-2 text-[10px] text-slate-500 italic">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>This generates the __sql_schemas collection required for SQL tool compatibility.</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-pink-400" /> Advanced MongoSQL Features
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 space-y-2">
              <h6 className="text-[11px] font-bold text-slate-300">FLATTEN()</h6>
              <p className="text-[10px] text-slate-400">Flattens nested JSON documents into separate columns.</p>
              <div className="bg-black/40 p-2 rounded lg font-mono text-[9px] text-pink-300">
                SELECT * FROM FLATTEN(coll)
              </div>
            </div>
            <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 space-y-2">
              <h6 className="text-[11px] font-bold text-slate-300">UNWIND()</h6>
              <p className="text-[10px] text-slate-400">Deconstructs array fields into multiple rows.</p>
              <div className="bg-black/40 p-2 rounded lg font-mono text-[9px] text-pink-300 line-clamp-1">
                SELECT * FROM UNWIND(coll WITH PATH =&gt; items)
              </div>
            </div>
            <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 space-y-2">
              <h6 className="text-[11px] font-bold text-slate-300">Implicit Extended JSON</h6>
              <p className="text-[10px] text-slate-400">Superior performance for literals vs CAST().</p>
              <div className="bg-black/40 p-2 rounded lg font-mono text-[9px] text-pink-300">
                WHERE date &gt; {"'{\"$date\": \"...\"}'"}
              </div>
            </div>
            <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 space-y-2">
              <h6 className="text-[11px] font-bold text-slate-300">Aggregation Helpers</h6>
              <p className="text-[10px] text-slate-400">Native BSON-aware aggregation functions.</p>
              <div className="bg-black/40 p-2 rounded lg font-mono text-[9px] text-pink-300">
                ADD_TO_ARRAY(), MERGE_DOCUMENTS()
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" /> Authentication Mechanisms
          </h5>
          <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 overflow-x-auto">
            <table className="w-full text-[10px] text-slate-400">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="pb-2 font-bold text-slate-300">Method</th>
                  <th className="pb-2 font-bold text-slate-300">Atlas</th>
                  <th className="pb-2 font-bold text-slate-300">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-2 text-white font-medium">SCRAM</td>
                  <td className="py-2">Yes</td>
                  <td className="py-2">Yes</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 text-white font-medium">X.509</td>
                  <td className="py-2">Yes</td>
                  <td className="py-2">Yes</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 text-white font-medium">OIDC</td>
                  <td className="py-2">Yes</td>
                  <td className="py-2">Yes</td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-medium">AWS IAM</td>
                  <td className="py-2">Yes</td>
                  <td className="py-2">No</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" /> Private Endpoint Connectivity
          </h5>
          <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 space-y-3">
            <p className="text-[11px] text-slate-400">Secure your SQL Interface traffic using AWS or Azure Private Link:</p>
            <ul className="text-[10px] text-slate-400 space-y-2 list-disc list-inside">
              <li>Configured in <span className="text-white">Data Federation</span> settings (distinct from cluster endpoints).</li>
              <li>Always verify the connection URL contains <span className="text-cyan-400 font-mono font-bold">pl</span> (e.g., <span className="italic text-slate-500">...mongodb-pl.a.query...</span>).</li>
              <li>Supported for both <span className="text-slate-300">Atlas SQL</span> and <span className="text-slate-300">MongoSQL</span> workloads.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" /> MongoDB Shell (mongosh)
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 space-y-3">
              <h6 className="text-[11px] font-bold text-slate-300">Aggregation Syntax ($sql)</h6>
              <p className="text-[10px] text-slate-400">Execute SQL within a standard aggregation pipeline.</p>
              <div className="bg-black/40 p-3 rounded-lg font-mono text-[9px] text-emerald-300 overflow-x-auto whitespace-pre">
{`db.aggregate([{
  $sql: {
    statement: "SELECT * FROM users",
    dialect: "mongosql"
  }
}])`}
              </div>
            </div>
            <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 space-y-3">
              <h6 className="text-[11px] font-bold text-slate-300">Short-form Syntax (db.sql)</h6>
              <p className="text-[10px] text-slate-400">Directly supply MongoSQL statements in the shell.</p>
              <div className="bg-black/40 p-3 rounded-lg font-mono text-[9px] text-emerald-300 overflow-x-auto whitespace-pre">
{`db.sql(\`
  SELECT *
  FROM users
  LIMIT 2
\`);`}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-sm font-bold text-white flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-emerald-400" /> Tutorials & Guides
          </h5>
          <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 space-y-4">
            <a 
              href="https://mongodb.com/docs/sql-interface/tutorials/connect-tutorial/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <div className="space-y-1">
                <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Connect & Query with Free SQL Tools</div>
                <div className="text-[10px] text-slate-400">Step-by-step guide for DBeaver and MongoDB JDBC Driver.</div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <div className="space-y-3 pt-2 border-t border-white/5">
              <h6 className="text-xs font-bold text-slate-300">Quick DBeaver Setup:</h6>
              <ol className="text-[10px] text-slate-400 space-y-2 list-decimal list-inside">
                <li>Download <span className="text-white">DBeaver Community Edition</span> and the <span className="text-white">MongoDB JDBC Driver (all.jar)</span>.</li>
                <li>In DBeaver, go to <span className="text-slate-300">Database &gt; Driver Manager &gt; New</span>.</li>
                <li>Set Name to <span className="text-white">MongoSQL</span> and Class to <span className="text-white">com.mongodb.jdbc.MongoDriver</span>.</li>
                <li>In 'Libraries', add the downloaded <span className="text-slate-300">all.jar</span> file and click 'Find Class'.</li>
                <li>Create a new connection using the <span className="text-slate-300">MongoSQL</span> driver.</li>
                <li>Enter the <span className="text-white">JDBC URL</span> and credentials under the 'Main' tab.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" /> Common Error Codes
          </h5>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 underline underline-offset-4 decoration-amber-500/30">
                    Type & Schema (1xxx)
                  </div>
                  <ul className="text-[10px] text-slate-400 space-y-1">
                    <li><span className="text-white">1007:</span> Field not found (check spelling)</li>
                    <li><span className="text-white">1017:</span> Extended JSON detected (use <span className="text-blue-400 font-mono">CAST</span>)</li>
                    <li><span className="text-white">1011:</span> Cannot group by Object/Array types</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 underline underline-offset-4 decoration-amber-500/30">
                    Parser & Logic (2xxx/3xxx)
                  </div>
                  <ul className="text-[10px] text-slate-400 space-y-1">
                    <li><span className="text-white">2001:</span> Unrecognized token / Syntax error</li>
                    <li><span className="text-white">3008:</span> Field not found in any data source</li>
                    <li><span className="text-white">3009:</span> Ambigous field (needs qualification)</li>
                  </ul>
                </div>
             </div>
             <div className="pt-2 border-t border-amber-500/10 flex items-center gap-2">
                <Info className="w-3 h-3 text-amber-500/50" />
                <p className="text-[10px] text-slate-500 italic">Always use <span className="text-white">LIMIT 1</span> for scalar subqueries to avoid Error 1008.</p>
             </div>
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" /> Recent Updates
          </h5>
          <div className="bg-slate-950/30 border border-white/5 rounded-xl p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">April 2026</div>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>
              <ul className="text-[10px] text-slate-400 space-y-2 list-disc list-inside">
                <li><span className="text-white">JDBC Driver 3.0.6:</span> Upgraded third-party dependencies for stability.</li>
                <li><span className="text-white">ODBC Driver 2.0.7:</span> Enhanced SAS compatibility and improved row retrieval logic.</li>
              </ul>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">March 2026</div>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>
              <ul className="text-[10px] text-slate-400 space-y-2 list-disc list-inside">
                <li><span className="text-white">ODBC Driver 2.0.6:</span> Caching support for DNS resolver and automatic retry logic for transient errors.</li>
              </ul>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">February 2026</div>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>
              <ul className="text-[10px] text-slate-400 space-y-2 list-disc list-inside">
                <li><span className="text-white">JDBC 3.0.5 & ODBC 2.0.4:</span> Critical fix for <span className="font-mono text-pink-300">OR</span> filtering in 3-valued logic.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
          <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Quick Reference</h5>
          <ul className="text-[11px] text-slate-400 space-y-2">
            <li className="flex justify-between">
              <span className="text-slate-500">JDBC URL:</span>
              <span className="font-mono text-slate-300">jdbc:mongodb://&lt;host&gt;:&lt;port&gt;/&lt;db&gt;?ssl=true</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-500">Driver Class:</span>
              <span className="font-mono text-slate-300">com.mongodb.jdbc.MongoDriver</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-500">Protocol:</span>
              <span className="font-mono text-slate-300">MySQL (SQL-92 compatible)</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="flex justify-end">
        <a 
          href="https://www.mongodb.com/docs/sql-interface/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 group transition-colors"
        >
          View Full Documentation <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </GlassCard>
  );
};
