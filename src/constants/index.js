// Task Categories
export const TASK_CATEGORIES = [
  { id: 'personal', name: 'Personal', color: '#3b82f6', icon: '👤' },
  { id: 'work', name: 'Work', color: '#8b5cf6', icon: '💼' },
  { id: 'shopping', name: 'Shopping', color: '#10b981', icon: '🛒' },
  { id: 'health', name: 'Health', color: '#f59e0b', icon: '🏥' },
  { id: 'finance', name: 'Finance', color: '#ef4444', icon: '💰' },
  { id: 'learning', name: 'Learning', color: '#06b6d4', icon: '📚' }
];

// Task Priorities
export const TASK_PRIORITIES = [
  { id: 'low', name: 'Low', color: '#6b7280', icon: '⬇️' },
  { id: 'medium', name: 'Medium', color: '#f59e0b', icon: '➡️' },
  { id: 'high', name: 'High', color: '#ef4444', icon: '⬆️' },
  { id: 'urgent', name: 'Urgent', color: '#dc2626', icon: '🚨' }
];

// Shop Categories
export const SHOP_CATEGORIES = [
  'Clothing',
  'Electronics', 
  'Groceries',
  'Accessories',
  'Other'
];

// Shop Vendors
export const SHOP_VENDORS = [
  'ABC Suppliers',
  'XYZ Distributors', 
  'Local Market',
  'Online Store',
  'Direct Import',
  'Other'
];

// Chart Colors
export const CHART_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", 
  "#82ca9d", "#8dd1e1", "#a4de6c", "#d0ed57"
];

// Helper Functions
export const getCategoryInfo = (categoryId) => 
  TASK_CATEGORIES.find(c => c.id === categoryId) || TASK_CATEGORIES[0];

export const getPriorityInfo = (priorityId) => 
  TASK_PRIORITIES.find(p => p.id === priorityId) || TASK_PRIORITIES[1];

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};