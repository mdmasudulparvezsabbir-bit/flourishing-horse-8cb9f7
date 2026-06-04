import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard } from "./GlassCard";
import { LogIn, User, Lock, Building, Upload, X } from "lucide-react";
import { cn } from "@/src/lib/utils";

export const Login: React.FC<{ onLogin: (userData: any, token: string) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [showBranding, setShowBranding] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/public/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error("Failed to fetch public settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!adminUser || !adminPass) {
      alert("Please enter Admin credentials first to authorize branding changes.");
      return;
    }

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

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch("/api/public/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: adminUser,
            password: adminPass,
            image: reader.result,
            filename: file.name
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setSettings({ ...settings, logo: data.url });
          setShowBranding(false);
          alert("Company logo updated successfully!");
        } else {
          alert(data.error || "Upload failed");
        }
      } catch (err) {
        alert("Upload error. Please try again.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <GlassCard className="w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20 overflow-hidden"
          >
            {settings?.logo ? (
              <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <LogIn className="text-white w-10 h-10" />
            )}
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {settings?.companyName || "Welcome Back"}
          </h1>
          <p className="text-slate-400">Sign in to manage your expenses</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center flex flex-col items-center gap-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold italic">
            Powered by Abirlink CommunicationBD
          </p>
          
          <button
            onClick={() => setShowBranding(true)}
            className="text-[10px] text-slate-600 hover:text-blue-400 uppercase font-bold tracking-widest transition-colors"
          >
            Admin: Update Branding
          </button>
        </div>
      </GlassCard>

      {/* Branding Modal */}
      <AnimatePresence>
        {showBranding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm"
            >
              <GlassCard className="p-6 space-y-6 border border-white/10">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-500" /> Update Branding
                  </h3>
                  <button onClick={() => setShowBranding(false)} className="text-slate-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Admin Username</label>
                    <input
                      type="text"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Admin username"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Admin Password</label>
                    <input
                      type="password"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="pt-2">
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                      />
                      <div className={cn(
                        "w-full border-2 border-dashed rounded-xl py-4 flex flex-col items-center justify-center gap-2 transition-all",
                        uploading ? "bg-white/5 border-white/10 opacity-50" : "bg-blue-600/5 border-blue-600/30 hover:border-blue-500 hover:bg-blue-600/10"
                      )}>
                        <Upload className="w-6 h-6 text-blue-500" />
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                          {uploading ? "Uploading..." : "Select Company Logo"}
                        </span>
                        <span className="text-[10px] text-slate-600 uppercase">PNG/JPG - Max 3MB</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 text-center leading-relaxed">
                  Note: You must provide Admin credentials to authorize branding changes from the login page.
                </p>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
