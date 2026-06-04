import React from "react";
import { useLocation, useNavigate, Link, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  PlusCircle, 
  MinusCircle, 
  CheckCircle, 
  Users, 
  FileBarChart, 
  BookOpen, 
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Bell,
  Check,
  Calendar,
  ClipboardList,
  Package,
  ShoppingCart,
  MessageCircle,
  Database,
  Camera,
  Edit,
  Key,
  UploadCloud,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Notification } from "@/src/types";

export const Layout: React.FC<{ user: any; onLogout: () => void; onUserUpdate: (updatedUser: any) => void }> = ({ user, onLogout, onUserUpdate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [settings, setSettings] = React.useState<any>(null);
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();

  // Profile management states
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [profileName, setProfileName] = React.useState(user ? user.name || "" : "");
  const [profilePassword, setProfilePassword] = React.useState("");
  const [profilePhoto, setProfilePhoto] = React.useState<string | null>(user ? user.photo || null : null);
  const [dragActive, setDragActive] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = React.useState<string | null>(null);
  const [profileSaving, setProfileSaving] = React.useState(false);

  // Synchronize when the user object changes (e.g. from App.tsx)
  React.useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfilePhoto(user.photo || null);
    }
  }, [user]);

  const handlePhotoFile = (file: File) => {
    if (!file.type.match("image.*")) {
      setProfileError("File must be an image");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePhoto(e.target?.result as string);
      setProfileError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoFile(e.target.files[0]);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          name: profileName,
          password: profilePassword || undefined,
          photo: profilePhoto?.startsWith("data:") ? profilePhoto : undefined
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        onUserUpdate(updatedUser);
        setProfileSuccess("Profile updated successfully!");
        setProfilePassword("");
        setTimeout(() => {
          setProfileSuccess(null);
          setIsProfileModalOpen(false);
        }, 1500);
      } else {
        const errData = await response.json();
        setProfileError(errData.error || "Failed to update profile");
      }
    } catch (err) {
      setProfileError("Network error occurred. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  if (!user) return null;

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Settings fetch failed (expected during dev server restarts):", error);
      } else {
        console.error("Failed to fetch settings:", error);
      }
    }
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      // Only log error if it's not a transient network error during development
      if (process.env.NODE_ENV === "development") {
        console.warn("Notification fetch failed (expected during dev server restarts):", error);
      } else {
        console.error("Failed to fetch notifications:", error);
      }
    }
  };

  React.useEffect(() => {
    // Add a small delay for the first fetch to ensure server is ready
    const timeout = setTimeout(() => {
      fetchNotifications();
      fetchSettings();
    }, 1000);
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: PlusCircle, label: "Add Income", path: "/income" },
    { icon: MinusCircle, label: "Add Expense", path: "/expense" },
    { icon: ClipboardList, label: "Requisition", path: "/requisition" },
    { icon: Package, label: "Inventory", path: "/inventory", roles: ["Admin", "Manager"] },
    { icon: CheckCircle, label: "Approvals", path: "/approvals", roles: ["Admin", "Manager"] },
    { icon: BookOpen, label: "Petty Cash", path: "/petty-cash" },
    { icon: FileBarChart, label: "Reports", path: "/reports" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: Database, label: "Supabase Test", path: "/supabase-test" },
    { icon: Users, label: "Users", path: "/users", roles: ["Admin"] },
    { icon: SettingsIcon, label: "Settings", path: "/settings", roles: ["Admin"] },
  ];

  const filteredMenu = menuItems.filter(item => !item.roles || item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-50"
          >
            <div className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 overflow-hidden">
                {settings?.logo ? (
                  <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <FileBarChart className="text-white w-6 h-6" />
                )}
              </div>
              <div>
                <h1 className="font-bold text-white leading-tight truncate max-w-[160px]">
                  {settings?.companyName || "Abirlink CommunicationBD"}
                </h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Laser Book</p>
              </div>
            </div>

            <div className="px-6 py-4 mx-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Today</p>
                  <p className="text-xs font-bold text-white">
                    {new Date().toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      weekday: 'short'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {filteredMenu.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                    pathname === item.path
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", pathname === item.path ? "text-white" : "text-slate-500")} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-white/5">
              <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 relative group">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex flex-1 items-center gap-3 text-left min-w-0 focus:outline-none cursor-pointer"
                  title="Edit Profile"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 relative overflow-hidden">
                    {user.photo ? (
                      <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user.name?.[0] || user.username?.[0]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">{user.name || user.username}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Edit Profile</p>
                  </div>
                </button>
                <button 
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors focus:outline-none shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h2 className="text-xl font-bold text-white">
              {filteredMenu.find(m => m.path === pathname)?.label || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-slate-400 hover:text-white transition-colors relative"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950" />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsNotificationsOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-[10px] text-blue-400 hover:text-blue-300 uppercase font-bold tracking-wider"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-20" />
                            <p className="text-sm text-slate-500">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id}
                              onClick={() => !n.read && markAsRead(n.id)}
                              className={cn(
                                "p-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5",
                                !n.read && "bg-blue-600/5"
                              )}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className={cn("text-sm font-bold", n.read ? "text-slate-300" : "text-white")}>
                                  {n.title}
                                </h4>
                                {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />}
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2 mb-2">{n.message}</p>
                              <p className="text-[10px] text-slate-600 uppercase font-bold">
                                {new Date(n.date).toLocaleString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-[1px] bg-white/10 mx-2" />
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-3 text-left focus:outline-none hover:opacity-85 transition-opacity cursor-pointer group"
              title="Edit Profile"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{user.name || user.username}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold leading-none mt-0.5">Edit Profile</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden relative">
                {user.photo ? (
                  <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-slate-400">{user.username[0].toUpperCase()}</span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Edit className="w-4 h-4 text-white" />
                </div>
              </div>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Profile</h3>
                  <p className="text-xs text-slate-500 mt-1">Update your personal account credentials and display image.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="p-1 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {profileError && (
                <div className="m-6 mb-0 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-medium">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="m-6 mb-0 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl font-medium">
                  {profileSuccess}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
                {/* Drag and Drop Profile Picture Upload Area */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    Profile Photo
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "group relative border-2 border-dashed rounded-3xl p-6 transition-all flex flex-col items-center justify-center text-center cursor-pointer",
                      dragActive 
                        ? "border-blue-500 bg-blue-500/10" 
                        : "border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-slate-950/60"
                    )}
                    onClick={() => document.getElementById("profile-photo-picker")?.click()}
                  >
                    <input
                      type="file"
                      id="profile-photo-picker"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {profilePhoto ? (
                      <div className="relative group/avatar">
                        <img
                          src={profilePhoto}
                          alt="Avatar Prev"
                          className="w-24 h-24 rounded-2xl object-cover border border-white/10 shadow-lg"
                        />
                        <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-105">
                        <UserIcon className="w-10 h-10" />
                      </div>
                    )}

                    <div className="mt-4 space-y-1">
                      <p className="text-xs font-bold text-slate-300">
                        Drag & drop your picture, or <span className="text-blue-400 font-semibold underline">browse</span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Supports JPEG, PNG, GIF, WEBP up to 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1">
                      Full Name Or Nickname
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1">
                      New Password <span className="text-slate-600 lowercase font-normal">(leave blank to keep current)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={profilePassword}
                        onChange={(e) => setProfilePassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-650 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {profileSaving ? "Saving details..." : "Save Profile Details"}
                  </button>
                  <button
                    type="button"
                    disabled={profileSaving}
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-6 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-400 font-bold py-3 rounded-2xl transition-all text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
