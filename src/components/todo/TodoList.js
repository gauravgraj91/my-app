import React, { useState, useEffect } from 'react';
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { v4 as uuidv4 } from "uuid";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Shop from '../shop/shop';
import ShopTransactions from '../shop/shopTransactions';
import PriceList from '../shop/PriceList';
import Settings from '../settings/Settings';
import './Todolist.css';
import { CheckCircle, Clock, AlertCircle, Plus, Filter, Calendar, Tag, Flag, Search, MoreVertical, Edit2, Trash2, Copy, Archive } from 'lucide-react';

const TodoList = () => {
  // Load todos from localStorage
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });

  const [tab, setTab] = useState(0);
  const [editableTaskId, setEditableTaskId] = useState(null);
  const [taskInput, setTaskInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    dueDate: '',
    tags: [],
    estimatedTime: ''
  });

  // Categories and priorities
  const categories = [
    { id: 'personal', name: 'Personal', color: '#3b82f6', icon: '👤' },
    { id: 'work', name: 'Work', color: '#8b5cf6', icon: '💼' },
    { id: 'shopping', name: 'Shopping', color: '#10b981', icon: '🛒' },
    { id: 'health', name: 'Health', color: '#f59e0b', icon: '🏥' },
    { id: 'finance', name: 'Finance', color: '#ef4444', icon: '💰' },
    { id: 'learning', name: 'Learning', color: '#06b6d4', icon: '📚' }
  ];

  const priorities = [
    { id: 'low', name: 'Low', color: '#6b7280', icon: '⬇️' },
    { id: 'medium', name: 'Medium', color: '#f59e0b', icon: '➡️' },
    { id: 'high', name: 'High', color: '#ef4444', icon: '⬆️' },
    { id: 'urgent', name: 'Urgent', color: '#dc2626', icon: '🚨' }
  ];

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      alert("Task title cannot be empty");
      return;
    }

    const task = {
      id: uuidv4(),
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      category: newTask.category,
      priority: newTask.priority,
      dueDate: newTask.dueDate || null,
      tags: newTask.tags,
      estimatedTime: newTask.estimatedTime || null,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };

    setTodos([task, ...todos]);
    setNewTask({
      title: '',
      description: '',
      category: 'personal',
      priority: 'medium',
      dueDate: '',
      tags: [],
      estimatedTime: ''
    });
    setShowAddForm(false);
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      setTodos(todos.filter((todo) => todo.id !== taskId));
    }
  };

  const handleEditTask = (taskId) => {
    const taskToEdit = todos.find((task) => task.id === taskId);
    if (taskToEdit) {
      setEditableTaskId(taskId);
      setTaskInput(taskToEdit.title);
    }
  };

  const handleSaveEdit = () => {
    if (!taskInput.trim()) {
      alert("Task title cannot be empty");
      return;
    }

    setTodos(todos.map((todo) =>
      todo.id === editableTaskId
        ? { ...todo, title: taskInput.trim(), updatedAt: new Date().toISOString() }
        : todo
    ));
    setEditableTaskId(null);
    setTaskInput('');
  };

  const handleToggleTaskCompletion = (taskId) => {
    setTodos(todos.map((todo) => {
      if (todo.id === taskId) {
        return {
          ...todo,
          isCompleted: !todo.isCompleted,
          completedAt: !todo.isCompleted ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        };
      }
      return todo;
    }));
  };

  const handleDuplicateTask = (taskId) => {
    const taskToDuplicate = todos.find(task => task.id === taskId);
    if (taskToDuplicate) {
      const duplicatedTask = {
        ...taskToDuplicate,
        id: uuidv4(),
        title: `${taskToDuplicate.title} (Copy)`,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };
      setTodos([duplicatedTask, ...todos]);
    }
  };

  const handleArchiveCompleted = () => {
    if (window.confirm("Archive all completed tasks?")) {
      setTodos(todos.filter(todo => !todo.isCompleted));
    }
  };

  // Filter and sort todos
  const filteredAndSortedTodos = todos
    .filter(todo => {
      // Search filter
      if (searchTerm && !todo.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !todo.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Category filter
      if (filterCategory !== 'all' && todo.category !== filterCategory) {
        return false;
      }

      // Priority filter
      if (filterPriority !== 'all' && todo.priority !== filterPriority) {
        return false;
      }

      // Status filter
      if (filterStatus === 'completed' && !todo.isCompleted) return false;
      if (filterStatus === 'pending' && todo.isCompleted) return false;
      if (filterStatus === 'overdue') {
        if (!todo.dueDate || todo.isCompleted) return false;
        const dueDate = new Date(todo.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate >= today) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'createdAt':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

  // Helper for stats
  const now = new Date();
  const completedCount = todos.filter(t => t.isCompleted).length;
  const pendingCount = todos.filter(t => !t.isCompleted).length;
  const overdueTasks = todos.filter(t => {
    if (!t.dueDate || t.isCompleted) return false;
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  });
  const overdueCount = overdueTasks.length;

  const todayTasks = todos.filter(t => {
    if (!t.dueDate || t.isCompleted) return false;
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  });
  const todayCount = todayTasks.length;

  const getCategoryInfo = (categoryId) => categories.find(c => c.id === categoryId) || categories[0];
  const getPriorityInfo = (priorityId) => priorities.find(p => p.id === priorityId) || priorities[1];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  return (
    <Box>
      <div>
        <div>
          <Tabs value={tab} onChange={handleTabChange}>
            <Tab label="Home" />
            <Tab label="Tasks" />
            <Tab label="Office" />
            <Tab label="Shop Bills" />
            <Tab label="Shop Transactions" />
            <Tab label="Price List" />
            <Tab label="Settings" />
          </Tabs>
        </div>
      </div>

      {/* Comprehensive Home Dashboard */}
      {tab === 0 && (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px 0', color: '#111827' }}>Dashboard</h1>
            <p style={{ fontSize: 16, color: '#6b7280', margin: 0 }}>Overview of all your activities</p>
          </div>

          {/* Main Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>

            {/* Tasks Widget */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>📝 Tasks</h3>
                <button
                  onClick={() => setTab(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  View All
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{completedCount}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Completed</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>{pendingCount}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Pending</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#ef4444' }}>{overdueCount}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Overdue</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#f59e0b' }}>{todayCount}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Due Today</div>
                </div>
              </div>
            </div>

            {/* Shop Bills Widget */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>🛒 Shop Bills</h3>
                <button
                  onClick={() => setTab(3)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  View All
                </button>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>₹0</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Total Sales</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#8b5cf6' }}>0</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Products</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#f59e0b' }}>₹0</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Profit</div>
                </div>
              </div>
            </div>

            {/* Transactions Widget */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>💰 Transactions</h3>
                <button
                  onClick={() => setTab(4)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  View All
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#22c55e' }}>₹0</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Cash In</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#ef4444' }}>₹0</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Cash Out</div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>₹0</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Net Balance</div>
              </div>
            </div>

            {/* Price List Widget */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>📋 Price List</h3>
                <button
                  onClick={() => setTab(5)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  View All
                </button>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>9</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Total Items</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Manage your product pricing and inventory</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, marginBottom: 32, border: '1px solid #f3f4f6' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>⚡ Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                <Plus size={18} /> Add New Task
              </button>
              <button
                onClick={() => setTab(3)}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
              >
                🛒 Add Product
              </button>
              <button
                onClick={() => setTab(4)}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                }}
              >
                💰 Add Transaction
              </button>
              <button
                onClick={() => setTab(6)}
                style={{
                  background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(107, 114, 128, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.3)';
                }}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            {/* Recent Tasks */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>📝 Recent Tasks</h3>
                <button
                  onClick={() => setTab(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  View All
                </button>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {todos.slice(0, 3).map(todo => (
                  <div key={todo.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f3f4f6'
                  }}>
                    <input
                      type="checkbox"
                      checked={todo.isCompleted}
                      onChange={() => handleToggleTaskCompletion(todo.id)}
                      style={{ marginRight: 12 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        textDecoration: todo.isCompleted ? 'line-through' : 'none',
                        color: todo.isCompleted ? '#9ca3af' : '#111827'
                      }}>
                        {todo.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {getCategoryInfo(todo.category).icon} {getCategoryInfo(todo.category).name}
                      </div>
                    </div>
                  </div>
                ))}
                {todos.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>
                    No tasks yet. Create your first task!
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, border: '1px solid #f3f4f6' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>📊 System Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>Data Storage</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#22c55e' }}>✅ Local</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>Last Backup</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>Auto-saved</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>Total Records</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#2563eb' }}>{todos.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>App Version</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>v1.0.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tasks Tab */}
      {tab === 1 && (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header with Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Tasks</h1>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  background: showFilters ? '#3b82f6' : '#f3f4f6',
                  color: showFilters ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Filter size={16} /> Filters
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Plus size={16} /> New Task
              </button>
              {completedCount > 0 && (
                <button
                  onClick={handleArchiveCompleted}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Archive size={16} /> Archive Completed
                </button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 20, marginBottom: 24 }}>
            {/* Search Bar */}
            <div style={{ position: 'relative', marginBottom: showFilters ? 16 : 0 }}>
              <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 44px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            {/* Filters */}
            {showFilters && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Priority</label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                  >
                    <option value="all">All Priorities</option>
                    {priorities.map(pri => (
                      <option key={pri.id} value={pri.id}>{pri.icon} {pri.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                  >
                    <option value="all">All Tasks</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                  >
                    <option value="createdAt">Created Date</option>
                    <option value="dueDate">Due Date</option>
                    <option value="priority">Priority</option>
                    <option value="category">Category</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Task List */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            {filteredAndSortedTodos.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
                <CheckCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>No tasks found</div>
                <div style={{ fontSize: 14 }}>
                  {searchTerm || filterCategory !== 'all' || filterPriority !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first task to get started!'}
                </div>
              </div>
            ) : (
              filteredAndSortedTodos.map((todo, index) => (
                <div
                  key={todo.id}
                  style={{
                    padding: 20,
                    borderBottom: index < filteredAndSortedTodos.length - 1 ? '1px solid #f3f4f6' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16
                  }}
                >
                  <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={() => handleToggleTaskCompletion(todo.id)}
                    style={{ marginTop: 4 }}
                  />

                  <div style={{ flex: 1 }}>
                    {editableTaskId === todo.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={taskInput}
                          onChange={(e) => setTaskInput(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            fontSize: 14
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            padding: '8px 12px',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditableTaskId(null)}
                          style={{
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            padding: '8px 12px',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 500,
                          color: todo.isCompleted ? '#9ca3af' : '#111827',
                          textDecoration: todo.isCompleted ? 'line-through' : 'none',
                          marginBottom: 8
                        }}>
                          {todo.title}
                        </div>

                        {todo.description && (
                          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                            {todo.description}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
                          <span style={{
                            background: getCategoryInfo(todo.category).color + '20',
                            color: getCategoryInfo(todo.category).color,
                            padding: '4px 8px',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            {getCategoryInfo(todo.category).icon} {getCategoryInfo(todo.category).name}
                          </span>

                          <span style={{
                            background: getPriorityInfo(todo.priority).color + '20',
                            color: getPriorityInfo(todo.priority).color,
                            padding: '4px 8px',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            {getPriorityInfo(todo.priority).icon} {getPriorityInfo(todo.priority).name}
                          </span>

                          {todo.dueDate && (
                            <span style={{
                              color: isOverdue(todo.dueDate) && !todo.isCompleted ? '#ef4444' : '#6b7280',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <Calendar size={12} /> {formatDate(todo.dueDate)}
                            </span>
                          )}

                          {todo.estimatedTime && (
                            <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} /> {todo.estimatedTime}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEditTask(todo.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: 4
                      }}
                      title="Edit task"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDuplicateTask(todo.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: 4
                      }}
                      title="Duplicate task"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(todo.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: 4
                      }}
                      title="Delete task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 500,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600 }}>Add New Task</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Title *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14
                }}
                placeholder="What needs to be done?"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  minHeight: 80,
                  resize: 'vertical'
                }}
                placeholder="Add more details..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Category</label>
                <select
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                >
                  {priorities.map(pri => (
                    <option key={pri.id} value={pri.id}>{pri.icon} {pri.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Estimated Time</label>
                <input
                  type="text"
                  value={newTask.estimatedTime}
                  onChange={(e) => setNewTask({ ...newTask, estimatedTime: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14
                  }}
                  placeholder="e.g., 2 hours"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="todo-container">
          <h1 className="todo-heading">Office Tasks</h1>
          <p style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>
            Office-specific tasks coming soon! For now, use the Tasks tab to manage all your tasks.
          </p>
        </div>
      )}
      {tab === 3 && <Shop />}
      {tab === 4 && <ShopTransactions />}
      {tab === 5 && <PriceList />}
      {tab === 6 && <Settings />}
    </Box>
  );
};

export default TodoList;