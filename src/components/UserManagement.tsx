import React, { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";
import { Users, UserPlus, Edit2, Trash2, Shield, Key } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";

const ROLES = ["Admin", "Manager", "Billing Executive", "Employee", "Technician"];

export const UserManagement: React.FC<{ user: any }> = ({ user }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    role: "Employee"
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Users fetch failed (expected during dev server restarts):", error);
      } else {
        console.error("Failed to fetch users:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add a small delay in dev to avoid race conditions with server restart
    const timeout = setTimeout(fetchUsers, process.env.NODE_ENV === "development" ? 1000 : 0);
    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
    const method = editingUser ? "PUT" : "POST";
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ username: "", password: "", name: "", role: "Employee" });
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save user");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const res = await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) fetchUsers();
  };

  if (loading) return <div className="text-slate-400">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-white">User Management</h3>
          <p className="text-slate-500">Manage system access and roles</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setError(null); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
        >
          <UserPlus className="w-5 h-5" /> Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <GlassCard key={u.id} className="relative group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-xl font-bold text-blue-400">
                {u.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-white">{u.name}</h4>
                <p className="text-xs text-slate-500">@{u.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                u.role === "Admin" ? "bg-red-500/10 text-red-500" : 
                u.role === "Manager" ? "bg-blue-500/10 text-blue-500" : "bg-slate-500/10 text-slate-400"
              )}>
                {u.role}
              </span>
            </div>

            <div className="flex gap-2 pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  setEditingUser(u);
                  setError(null);
                  setFormData({ username: u.username, password: "", name: u.name, role: u.role });
                  setIsModalOpen(true);
                }}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => handleDelete(u.id)}
                className="px-4 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-500 py-2 rounded-lg text-sm font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md"
          >
            <GlassCard className="bg-slate-900 border-white/10">
              <h3 className="text-xl font-bold text-white mb-6">
                {editingUser ? "Edit User" : "Add New User"}
              </h3>
              
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password {editingUser && "(Leave blank to keep current)"}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                  >
                    {ROLES.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    {editingUser ? "Update User" : "Create User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 bg-white/5 hover:bg-white/10 text-slate-400 font-bold py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </div>
  );
};
