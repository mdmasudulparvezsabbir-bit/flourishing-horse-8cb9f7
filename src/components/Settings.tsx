import React, { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { Settings as SettingsIcon, Building, Wallet, Trash2, RefreshCw, Upload, Database, Globe, Copy, Check, Link2 } from "lucide-react";
import { formatCurrency, cn } from "@/src/lib/utils";
import { DatabaseStatus } from "./DatabaseStatus";
import { SupabaseDemo } from "./SupabaseDemo";
import { BiIntegration } from "./BiIntegration";
import { SqlTerminal } from "./SqlTerminal";

export const Settings: React.FC<{ user: any }> = ({ user }) => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedDeployKey, setCopiedDeployKey] = useState(false);
  const [copiedConnectionString, setCopiedConnectionString] = useState(false);
  const [copiedServerHook, setCopiedServerHook] = useState(false);
  const [testingBuild, setTestingBuild] = useState(false);
  const [testingPreview, setTestingPreview] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);

  const handleTriggerHook = async (type: "build" | "preview") => {
    if (type === "build") setTestingBuild(true);
    else setTestingPreview(true);

    const logMessage = (msg: string) => {
      setTestLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    logMessage(`Triggering Netlify HTTP POST call for [${type === "build" ? "Production Release Build" : "Preview Server Build"}]...`);

    try {
      const res = await fetch("/api/netlify/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ type })
      });

      const data = await res.json();
      if (res.ok) {
        logMessage(`SUCCESS: Handshake complete! Connection response (status ${res.status}):`);
        logMessage(`⚡ ${data.message || "Trigger succeeded"}`);
        logMessage(`ℹ️ Endpoint details: ${data.response}`);
      } else {
        logMessage(`❌ TRIGGER FAIL (Status ${res.status}): ${data.error || "Netlify returned failure payload"}`);
      }
    } catch (err: any) {
      logMessage(`💥 EXCEPTION during execution: ${err.message || err}`);
    } finally {
      if (type === "build") setTestingBuild(false);
      else setTestingPreview(false);
    }
  };

  const wpPluginCode = `<?php
/**
 * Plugin Name: Abirlink ERP Embed
 * Description: Embeds the Abirlink ERP application into your WordPress site using a simple shortcode.
 * Version: 1.0.0
 * Author: Abirlink CommunicationBD
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Register the shortcode [abirlink_erp]
 */
function abirlink_erp_shortcode( $atts ) {
	// Default attributes
	$atts = shortcode_atts(
		array(
			'url'    => '${window.location.origin}',
			'height' => '800px',
			'width'  => '100%',
		),
		$atts,
		'abirlink_erp'
	);

	// Sanitize URL
	$url = esc_url( $atts['url'] );
	$height = esc_attr( $atts['height'] );
	$width = esc_attr( $atts['width'] );

	// Output the iframe
	$output = '<div class="abirlink-erp-container" style="width: ' . $width . '; height: ' . $height . '; overflow: hidden; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.1);">';
	$output .= '<iframe src="' . $url . '" style="width: 100%; height: 100%; border: none;" allow="camera; microphone; geolocation" allowfullscreen></iframe>';
	$output .= '</div>';

	return $output;
}
add_shortcode( 'abirlink_erp', 'abirlink_erp_shortcode' );
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(wpPluginCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings", {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.netlifyBuildHook) {
            data.netlifyBuildHook = "https://api.netlify.com/build_hooks/6a19c38016c2ed8b6fe3b386";
          }
          if (!data.netlifyPreviewHook) {
            data.netlifyPreviewHook = "https://api.netlify.com/preview_server_hooks/6a19c3acf1e109842b64c7f6";
          }
          if (!data.netlifyDeployKey) {
            data.netlifyDeployKey = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDMzHHpuK/A5GCl0vw1o58iZIBmPjLNj0USPSWCZRK5KKpiRd6klwIs0K492PqJQYNNJBbEiMTthgF0KfTXDWtg9DG77TlRLBVJx2w633a4oeFdYZ5YTBrP2eP/LEzSlTC+HaQRCfYnbWSvqkrXPq/YBdY/MbVvzOM1Ypm+D+w/bIL18UDvhtJ1BMJL6BrXGoM6cnW8Gn4B0UdtOzhCllcnCK+EhKCm3YTkswlr6q7piI/6TR9/eKSImO3kujE85eyHR9l+IsPAsoOX/I40Cl/KtuV+uYJ5TIZ+9dPx/ouaEOPlTv7TTwcnSlKiygLlpZRtBuF2N6uRmL63DoVqJvFkzbY9CJiSanaNol6MUA3YCoQhtscIcTOzypKp8iYYdG6ZreC/fEsdkcXHNgM47XOSWg9kaD/+WFwIOE1SPrbkT/m5X73/DGkbgsTpxN2UE083kOMNeQAZZ14cwQJzJ3TDHvvVY4Phh0MaRdQKuBOiLZF1qT1ISBwfl4sm/dnJIOVcnnzz7Yk3JY+eEVA/kU1Gl9GzDL0An0TgHmUd7HFRNNkdgHwZkj0mnRTUVotzrqTwI0P5bz2iNfQn1CcZ51phD2+w6l2Tiz0121T4fx/iMO/I896GQn1N2fjEgzKincwlKxsKIlmpTLPtAlHHXLFkYZbXTi02dDCTPbG2297OPw==";
          }
          if (!data.cloudflareToken) {
            data.cloudflareToken = "2dec2bdb61d9e646583b6365c7afaad0";
          }
          if (!data.cloudflareApi) {
            data.cloudflareApi = "cfat_rcqEj5q7fptNEK0rdSKUgrx1g6sONediXNqTvvC587cab6edcfat_rcqEj5q7fptNEK0rdSKUgrx1g6sONediXNqTvvC587cab6ed";
          }
          setSettings(data);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Settings fetch failed (expected during dev server restarts):", error);
        } else {
          console.error("Failed to fetch settings:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Add a small delay in dev to avoid race conditions with server restart
    const timeout = setTimeout(fetchSettings, process.env.NODE_ENV === "development" ? 1000 : 0);
    return () => clearTimeout(timeout);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setSaving(false);
      alert("Settings saved successfully!");
      window.location.reload();
    }
  };

  const handleReset = async () => {
    if (!confirm("CRITICAL: This will delete ALL data (Income, Expenses, Inventory, Requisitions, etc.) and reset balances to zero. This action cannot be undone. Are you sure?")) return;
    const res = await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) {
      alert("System data reset successfully!");
      window.location.reload();
    } else {
      alert("Failed to reset system data.");
    }
  };

  if (loading) return <div className="text-slate-400">Loading settings...</div>;
  if (!settings || !settings.balances) return <div className="text-slate-400">Error loading settings. Please try refreshing.</div>;

  const netBalance = (Object.values(settings.balances) as number[]).reduce((a: number, b: number) => a + Number(b), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white">Admin Settings</h3>
          <p className="text-slate-500">Configure company profile and initial balances</p>
        </div>
        <button
          onClick={handleReset}
          className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 border border-red-600/20 transition-all"
        >
          <RefreshCw className="w-5 h-5" /> Reset System Data
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Company Info */}
          <GlassCard className="space-y-6">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="text-blue-500 w-5 h-5" /> Company Profile
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Company Name</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Company Logo</label>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3 items-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {settings.logo ? (
                        <img src={settings.logo} className="w-full h-full object-contain" alt="Logo Preview" />
                      ) : (
                        <Building className="text-slate-600 w-8 h-8" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          onChange={(e) => {
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
                                alert("File size must be less than 3MB");
                                return;
                              }
                              
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                try {
                                  const uploadRes = await fetch("/api/upload", {
                                    method: "POST",
                                    headers: { 
                                      "Content-Type": "application/json",
                                      "Authorization": `Bearer ${localStorage.getItem("token")}`
                                    },
                                    body: JSON.stringify({ image: reader.result, filename: file.name }),
                                  });
                                  if (uploadRes.ok) {
                                    const { url } = await uploadRes.json();
                                    setSettings({ ...settings, logo: url });
                                  } else {
                                    alert("Upload failed. Please try again.");
                                  }
                                } catch (err) {
                                  console.error("Upload error:", err);
                                  alert("Upload error. Please try again.");
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full bg-white/5 border border-dashed border-white/20 rounded-xl py-3 px-4 text-slate-400 flex items-center justify-center gap-2 group-hover:border-blue-500/50 group-hover:bg-blue-500/5 transition-all">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm font-medium">Upload New Logo (PNG/JPG - Max 3MB)</span>
                        </div>
                      </div>
                      {settings.logo && (
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, logo: null })}
                          className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors ml-1"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Or Logo URL</label>
                    <input
                      type="text"
                      value={settings.logo || ""}
                      onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Initial Balances */}
          <GlassCard className="space-y-6">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="text-emerald-500 w-5 h-5" /> Initial Balances
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(settings.balances).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">{key} Balance</label>
                  <input
                    type="number"
                    value={settings.balances[key]}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      balances: { ...settings.balances, [key]: e.target.value } 
                    })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-slate-400">Total Net Balance</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(netBalance)}</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* WordPress Integration */}
        <GlassCard className="space-y-6">
          <div className="flex justify-between items-start">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="text-indigo-500 w-5 h-5" /> WordPress Integration
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Plugin Code"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              To embed this ERP into your WordPress site, create a new file named <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">abirlink-erp.php</code> in your WordPress <code className="text-slate-300">wp-content/plugins/</code> directory and paste the code below.
            </p>
            
            <div className="relative group">
              <pre className="bg-slate-950/50 border border-white/5 rounded-xl p-4 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-[300px] scrollbar-thin scrollbar-thumb-white/10">
                {wpPluginCode}
              </pre>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-2 bg-slate-900 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
              <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider">How to use:</h5>
              <ol className="text-xs text-slate-400 space-y-2 list-decimal ml-4">
                <li>Upload the file to your WordPress plugins folder.</li>
                <li>Activate the plugin from the WordPress Dashboard.</li>
                <li>Use the shortcode <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">[abirlink_erp]</code> on any page or post.</li>
                <li>You can customize the height: <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">[abirlink_erp height="1000px"]</code></li>
              </ol>
            </div>
          </div>
        </GlassCard>

        {/* Netlify Webhooks & Deployment Connection */}
        <GlassCard className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="text-emerald-500 w-5 h-5" /> Netlify Build Hooks & Deploy Configuration
              </h4>
              <p className="text-xs text-slate-500 mt-1">Configure Webhook connections to automate builds and synchronize live systems</p>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
              Active Connection
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Netlify Production Build Hook</label>
                <input
                  type="text"
                  value={settings.netlifyBuildHook || ""}
                  onChange={(e) => setSettings({ ...settings, netlifyBuildHook: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="https://api.netlify.com/build_hooks/..."
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Netlify Preview Server Hook</label>
                <input
                  type="text"
                  value={settings.netlifyPreviewHook || ""}
                  onChange={(e) => setSettings({ ...settings, netlifyPreviewHook: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="https://api.netlify.com/preview_server_hooks/..."
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Netlify SSH Deploy Public Key</label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(settings.netlifyDeployKey || "");
                    setCopiedDeployKey(true);
                    setTimeout(() => setCopiedDeployKey(false), 2000);
                  }}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase cursor-pointer"
                >
                  {copiedDeployKey ? "Copied Key!" : "Copy Public Key"}
                </button>
              </div>
              <textarea
                value={settings.netlifyDeployKey || ""}
                onChange={(e) => setSettings({ ...settings, netlifyDeployKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-24 resize-none"
                placeholder="ssh-rsa ..."
              />
            </div>

            {/* Cloudflare Connection Credentials */}
            <div className="bg-slate-950/20 border border-white/5 rounded-xl p-4 mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="text-blue-400 w-4 h-4" />
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Cloudflare Integration Credentials
                </h5>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Cloudflare account to manage domains, edge configs, and deploy hooks directly:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Cloudflare Token ID</label>
                  <input
                    type="text"
                    value={settings.cloudflareToken || ""}
                    onChange={(e) => setSettings({ ...settings, cloudflareToken: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Enter Token ID or Zone ID"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Cloudflare API Token / Key</label>
                  <input
                    type="password"
                    value={settings.cloudflareApi || ""}
                    onChange={(e) => setSettings({ ...settings, cloudflareApi: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Enter API Key / Token"
                  />
                </div>
              </div>
            </div>

            {/* Server Connection String & Webhook Hook for Publish App */}
            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Link2 className="text-emerald-400 w-4 h-4 animate-pulse" />
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Publish Server Connection String & Hook
                </h5>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your published static client app (e.g., Netlify hosting) securely to this active backend API server by configuring the environment variables below in your deployments:
              </p>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Netlify Environment Variable</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`VITE_API_URL=${window.location.origin}`);
                        setCopiedConnectionString(true);
                        setTimeout(() => setCopiedConnectionString(false), 2000);
                      }}
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase cursor-pointer"
                    >
                      {copiedConnectionString ? "Copied Variable!" : "Copy Name & Value"}
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-900/60 p-3 rounded-lg border border-white/5 font-mono text-xs text-slate-300">
                    <span className="text-blue-400 select-all font-bold">VITE_API_URL</span>
                    <span className="text-slate-500 hidden sm:inline">=</span>
                    <span className="text-emerald-400 select-all font-bold break-all">{window.location.origin}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Active Health Sync Hook</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/health`);
                        setCopiedServerHook(true);
                        setTimeout(() => setCopiedServerHook(false), 2000);
                      }}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase cursor-pointer"
                    >
                      {copiedServerHook ? "Copied Hook!" : "Copy Hook URL"}
                    </button>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5 font-mono text-xs text-slate-300 select-all break-all">
                    {window.location.origin}/api/health
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-4">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Handshake Testing Controls</h5>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                disabled={testingBuild || testingPreview}
                onClick={() => handleTriggerHook("build")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-all flex items-center gap-2 text-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={cn("w-4 h-4", testingBuild && "animate-spin")} />
                {testingBuild ? "Triggering..." : "Test Production Deploy Hook"}
              </button>

              <button
                type="button"
                disabled={testingBuild || testingPreview}
                onClick={() => handleTriggerHook("preview")}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/10 transition-all flex items-center gap-2 text-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={cn("w-4 h-4", testingPreview && "animate-spin")} />
                {testingPreview ? "Triggering..." : "Test Preview Server Hook"}
              </button>

              {testLog.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTestLog([])}
                  className="text-xs font-bold text-slate-500 hover:text-slate-400 px-3 py-2.5 underline transition-colors cursor-pointer"
                >
                  Clear Logs
                </button>
              )}
            </div>

            {testLog.length > 0 && (
              <div className="space-y-1.5 animate-fadeIn">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Test Console Output</span>
                  <span className="text-[10px] text-emerald-400 font-mono animate-pulse">● listener active</span>
                </div>
                <div className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-[11px] font-mono text-emerald-400 overflow-y-auto max-h-[160px] scrollbar-thin scrollbar-thumb-white/10 space-y-1 select-text">
                  {testLog.map((log, index) => (
                    <div key={index} className="leading-relaxed border-b border-white/[0.02] pb-1 last:border-0">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving Changes..." : "Save All Settings"}
        </button>
      </form>

      {/* Database Status */}
      <DatabaseStatus />

      {/* SQL Diagnostic Terminal */}
      <SqlTerminal />

      {/* BI Tool Integration */}
      <BiIntegration />

      {/* Supabase Demo */}
      <SupabaseDemo />
    </div>
  );
};
