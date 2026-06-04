import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { IncomeForm } from "./components/IncomeForm";
import { ExpenseForm } from "./components/ExpenseForm";
import { ApprovalList } from "./components/ApprovalList";
import { UserManagement } from "./components/UserManagement";
import { Reports } from "./components/Reports";
import { PettyCashBook } from "./components/PettyCashBook";
import { Settings } from "./components/Settings";
import { Requisition } from "./components/Requisition";
import { Inventory } from "./components/Inventory";
import { Chat } from "./components/Chat";
import { SupabaseDemo } from "./components/SupabaseDemo";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setLoading(false);

    // Client-side keep-alive ping (every 30 seconds)
    const pingInterval = setInterval(() => {
      fetch("/api/health").catch(() => {});
    }, 30 * 1000);

    return () => clearInterval(pingInterval);
  }, []);

  const handleLogin = (userData: any, token: string) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  const handleUserUpdate = (updatedUser: any) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/" 
          element={user ? <Layout user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard user={user} />} />
          <Route path="income" element={<IncomeForm user={user} />} />
          <Route path="expense" element={<ExpenseForm user={user} />} />
          <Route path="approvals" element={<ApprovalList user={user} />} />
          <Route path="users" element={<UserManagement user={user} />} />
          <Route path="reports" element={<Reports user={user} />} />
          <Route path="petty-cash" element={<PettyCashBook user={user} />} />
          <Route path="requisition" element={<Requisition user={user} />} />
          <Route path="inventory" element={<Inventory user={user} />} />
          <Route path="chat" element={<Chat user={user} />} />
          <Route path="supabase-test" element={<SupabaseDemo />} />
          <Route path="settings" element={<Settings user={user} />} />
        </Route>
      </Routes>
    </Router>
  );
}
