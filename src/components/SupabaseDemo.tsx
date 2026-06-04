import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { Database, List, Loader2, AlertCircle, Plus, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SupabaseDemo: React.FC = () => {
  const [todos, setTodos] = useState<any[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase.from('todos').select('*').order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      setTodos(data || []);
    } catch (err: any) {
      console.error('Error fetching todos:', err);
      setError(err.message || 'Failed to fetch todos from Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTodos();
  }, []);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      setAdding(true);
      const { data, error: supabaseError } = await supabase
        .from('todos')
        .insert([{ name: newTodo, is_completed: false }])
        .select();

      if (supabaseError) throw supabaseError;
      
      if (data) {
        setTodos([data[0], ...todos]);
        setNewTodo('');
      }
    } catch (err: any) {
      console.error('Error adding todo:', err);
      setError(err.message || 'Failed to add todo');
    } finally {
      setAdding(false);
    }
  };

  const toggleTodo = async (id: any, currentStatus: boolean) => {
    try {
      const { error: supabaseError } = await supabase
        .from('todos')
        .update({ is_completed: !currentStatus })
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      
      setTodos(todos.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
    } catch (err: any) {
      console.error('Error updating todo:', err);
      setError(err.message || 'Failed to update todo');
    }
  };

  const deleteTodo = async (id: any) => {
    try {
      const { error: supabaseError } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;
      
      setTodos(todos.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Error deleting todo:', err);
      setError(err.message || 'Failed to delete todo');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Supabase Todos</h2>
            <p className="text-sm text-gray-500">Real-time database test</p>
          </div>
        </div>

        <form onSubmit={addTodo} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding || !newTodo.trim()}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </form>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 items-start"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Connection Error</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Loading your tasks...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="py-12 text-center rounded-xl border-2 border-dashed border-gray-100">
              <List className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">Your task list is empty</p>
              <p className="text-gray-400 text-xs mt-1">Start by adding a task above</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {todos.map((todo) => (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    todo.is_completed 
                      ? 'bg-gray-50 border-gray-100 opacity-75' 
                      : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-md'
                  }`}
                >
                  <button 
                    onClick={() => toggleTodo(todo.id, todo.is_completed)}
                    className="flex-shrink-0 transition-transform active:scale-90"
                  >
                    {todo.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-50" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 hover:text-blue-400 transition-colors" />
                    )}
                  </button>
                  <span className={`flex-1 text-sm font-medium transition-all ${
                    todo.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'
                  }`}>
                    {todo.name}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <AlertCircle className="w-4 h-4 rotate-45" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
      
      <p className="mt-4 text-center text-[10px] text-gray-400 font-medium uppercase tracking-wider">
        Connected to Supabase Project
      </p>
    </div>
  );
};

