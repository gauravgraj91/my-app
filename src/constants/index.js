// Task Categories
export const TASK_CATEGORIES = [
  { id: 'personal', name: 'Personal', color: 'var(--primary)', icon: '👤' },
  { id: 'work', name: 'Work', color: 'var(--primary)', icon: '💼' },
  { id: 'shopping', name: 'Shopping', color: 'var(--success)', icon: '🛒' },
  { id: 'health', name: 'Health', color: 'var(--warning)', icon: '🏥' },
  { id: 'finance', name: 'Finance', color: 'var(--danger)', icon: '💰' },
  { id: 'learning', name: 'Learning', color: 'var(--primary)', icon: '📚' }
];

// Task Priorities
export const TASK_PRIORITIES = [
  { id: 'low', name: 'Low', color: 'var(--muted-foreground)', icon: '⬇️' },
  { id: 'medium', name: 'Medium', color: 'var(--warning)', icon: '➡️' },
  { id: 'high', name: 'High', color: 'var(--danger)', icon: '⬆️' },
  { id: 'urgent', name: 'Urgent', color: 'var(--danger)', icon: '🚨' }
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

// Re-export date utilities from utils for backward compatibility
export { formatDate, isOverdue } from '../utils';