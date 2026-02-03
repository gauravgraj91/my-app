import React, { useState, useEffect } from 'react';
import Box from "@mui/material/Box";
import { v4 as uuidv4 } from "uuid";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Shop from '../shop/shop';
import ShopTransactions from '../shop/shopTransactions';
import PriceList from '../shop/PriceList';
import Settings from '../settings/Settings';
import './Todolist.css';
import { CheckCircle, Clock, Plus, Filter, Calendar, Search, Edit2, Trash2, Copy, Archive } from 'lucide-react';
import { TASK_CATEGORIES, TASK_PRIORITIES, getCategoryInfo, getPriorityInfo } from '../../constants';
import { formatDate, isOverdue } from '../../utils';

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

  // Use shared constants for categories and priorities
  const categories = TASK_CATEGORIES;
  const priorities = TASK_PRIORITIES;

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

  // getCategoryInfo, getPriorityInfo, formatDate, isOverdue are imported from shared modules

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
        <div className="p-6 max-w-screen-xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
            <p className="text-lg text-gray-700">Overview of all your activities</p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

            {/* Tasks Widget */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">📝 Tasks</h3>
                <button
                  onClick={() => setTab(1)}
                  className="text-blue-600 text-sm underline"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">{completedCount}</div>
                  <div className="text-sm text-gray-700">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">{pendingCount}</div>
                  <div className="text-sm text-gray-700">Pending</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-red-600">{overdueCount}</div>
                  <div className="text-sm text-gray-700">Overdue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-yellow-600">{todayCount}</div>
                  <div className="text-sm text-gray-700">Due Today</div>
                </div>
              </div>
            </div>

            {/* Shop Bills Widget */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">🛒 Shop Bills</h3>
                <button
                  onClick={() => setTab(3)}
                  className="text-blue-600 text-sm underline"
                >
                  View All
                </button>
              </div>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-green-600">₹0</div>
                <div className="text-sm text-gray-700">Total Sales</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-purple-600">0</div>
                  <div className="text-sm text-gray-700">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-yellow-600">₹0</div>
                  <div className="text-sm text-gray-700">Profit</div>
                </div>
              </div>
            </div>

            {/* Transactions Widget */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">💰 Transactions</h3>
                <button
                  onClick={() => setTab(4)}
                  className="text-blue-600 text-sm underline"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-green-600">₹0</div>
                  <div className="text-sm text-gray-700">Cash In</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-red-600">₹0</div>
                  <div className="text-sm text-gray-700">Cash Out</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">₹0</div>
                <div className="text-sm text-gray-700">Net Balance</div>
              </div>
            </div>

            {/* Price List Widget */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">📋 Price List</h3>
                <button
                  onClick={() => setTab(5)}
                  className="text-blue-600 text-sm underline"
                >
                  View All
                </button>
              </div>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-purple-600">9</div>
                <div className="text-sm text-gray-700">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-base text-gray-700">Manage your product pricing and inventory</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">⚡ Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white rounded-lg p-4 text-lg font-semibold flex items-center gap-2 transition-transform duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg"
              >
                <Plus size={20} /> Add New Task
              </button>
              <button
                onClick={() => setTab(3)}
                className="bg-green-600 text-white rounded-lg p-4 text-lg font-semibold flex items-center gap-2 transition-transform duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg"
              >
                🛒 Add Product
              </button>
              <button
                onClick={() => setTab(4)}
                className="bg-yellow-600 text-white rounded-lg p-4 text-lg font-semibold flex items-center gap-2 transition-transform duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg"
              >
                💰 Add Transaction
              </button>
              <button
                onClick={() => setTab(6)}
                className="bg-gray-600 text-white rounded-lg p-4 text-lg font-semibold flex items-center gap-2 transition-transform duration-200 ease-in-out hover:translate-y-[-2px] hover:shadow-lg"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Tasks */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">📝 Recent Tasks</h3>
                <button
                  onClick={() => setTab(1)}
                  className="text-blue-600 text-sm underline"
                >
                  View All
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {todos.slice(0, 3).map(todo => (
                  <div key={todo.id} className="flex items-center py-2 border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={todo.isCompleted}
                      onChange={() => handleToggleTaskCompletion(todo.id)}
                      className="mr-2"
                    />
                    <div className="flex-1">
                      <div className="text-base font-medium text-gray-900">
                        {todo.title}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        {getCategoryInfo(todo.category).icon} {getCategoryInfo(todo.category).name}
                      </div>
                    </div>
                  </div>
                ))}
                {todos.length === 0 && (
                  <div className="text-center text-gray-700 py-8">
                    No tasks yet. Create your first task!
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 System Status</h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Data Storage</span>
                  <span className="text-sm font-medium text-green-600">✅ Local</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Last Backup</span>
                  <span className="text-sm font-medium text-gray-700">Auto-saved</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Total Records</span>
                  <span className="text-sm font-medium text-blue-600">{todos.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">App Version</span>
                  <span className="text-sm font-medium text-gray-700">v1.0.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tasks Tab */}
      {tab === 1 && (
        <div className="p-6 max-w-screen-xl mx-auto">
          {/* Header with Actions */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold leading-tight text-gray-900">Tasks</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`bg-gray-200 text-gray-800 rounded-md p-2 text-sm flex items-center gap-2 transition-colors duration-200 ease-in-out ${showFilters ? 'bg-blue-600 text-white' : ''}`}
              >
                <Filter size={16} /> Filters
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 text-white rounded-md p-2 text-sm font-semibold flex items-center gap-2"
              >
                <Plus size={16} /> New Task
              </button>
              {completedCount > 0 && (
                <button
                  onClick={handleArchiveCompleted}
                  className="bg-gray-600 text-white rounded-md p-2 text-sm font-semibold flex items-center gap-2"
                >
                  <Archive size={16} /> Archive Completed
                </button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-md p-5 mb-6 border border-gray-200">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm outline-none"
              />
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">Priority</label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Priorities</option>
                    {priorities.map(pri => (
                      <option key={pri.id} value={pri.id}>{pri.icon} {pri.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Tasks</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
          <div className="bg-white rounded-lg shadow-md">
            {filteredAndSortedTodos.length === 0 ? (
              <div className="p-12 text-center text-gray-700">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-30" />
                <div className="text-lg font-medium mb-2">No tasks found</div>
                <div className="text-base">
                  {searchTerm || filterCategory !== 'all' || filterPriority !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first task to get started!'}
                </div>
              </div>
            ) : (
              filteredAndSortedTodos.map((todo, index) => (
                <div
                  key={todo.id}
                  className="p-5 border-b border-gray-200 last:border-b-0 flex items-start gap-4"
                >
                  <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={() => handleToggleTaskCompletion(todo.id)}
                    className="mt-1"
                  />

                  <div className="flex-1">
                    {editableTaskId === todo.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={taskInput}
                          onChange={(e) => setTaskInput(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="bg-green-600 text-white rounded-md p-2 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditableTaskId(null)}
                          className="bg-gray-600 text-white rounded-md p-2 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-lg font-medium text-gray-900">
                          {todo.title}
                        </div>

                        {todo.description && (
                          <div className="text-base text-gray-700 mb-2">
                            {todo.description}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2">
                            {getCategoryInfo(todo.category).icon} {getCategoryInfo(todo.category).name}
                          </span>

                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full flex items-center gap-2">
                            {getPriorityInfo(todo.priority).icon} {getPriorityInfo(todo.priority).name}
                          </span>

                          {todo.dueDate && (
                            <span className="text-gray-700 flex items-center gap-2">
                              <Calendar size={12} /> {formatDate(todo.dueDate)}
                            </span>
                          )}

                          {todo.estimatedTime && (
                            <span className="text-gray-700 flex items-center gap-2">
                              <Clock size={12} /> {todo.estimatedTime}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTask(todo.id)}
                      className="bg-gray-200 text-gray-800 rounded-md p-2 text-sm"
                      title="Edit task"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDuplicateTask(todo.id)}
                      className="bg-gray-200 text-gray-800 rounded-md p-2 text-sm"
                      title="Duplicate task"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(todo.id)}
                      className="bg-red-600 text-white rounded-md p-2 text-sm"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-xl font-semibold">Add New Task</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-1">Title *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="What needs to be done?"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-20 resize-vertical"
                placeholder="Add more details..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Category</label>
                <select
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {priorities.map(pri => (
                    <option key={pri.id} value={pri.id}>{pri.icon} {pri.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Estimated Time</label>
                <input
                  type="text"
                  value={newTask.estimatedTime}
                  onChange={(e) => setNewTask({ ...newTask, estimatedTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g., 2 hours"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="bg-gray-200 text-gray-800 rounded-md p-3 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="bg-blue-600 text-white rounded-md p-3 text-sm font-semibold"
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
          <p className="text-center text-gray-700 py-8">
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