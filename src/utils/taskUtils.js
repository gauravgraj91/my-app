// Task-specific utility functions
import { isOverdue, isToday, isTomorrow, isThisWeek, generateId } from './index';

export const createTask = (taskData) => {
  return {
    id: generateId(),
    title: taskData.title || '',
    description: taskData.description || '',
    category: taskData.category || 'personal',
    priority: taskData.priority || 'medium',
    dueDate: taskData.dueDate || '',
    tags: taskData.tags || [],
    estimatedTime: taskData.estimatedTime || '',
    isCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    ...taskData
  };
};

export const updateTask = (task, updates) => {
  return {
    ...task,
    ...updates,
    updatedAt: new Date().toISOString(),
    completedAt: updates.isCompleted && !task.isCompleted ? new Date().toISOString() : task.completedAt
  };
};

export const duplicateTask = (task) => {
  return createTask({
    ...task,
    title: `${task.title} (Copy)`,
    isCompleted: false,
    completedAt: null
  });
};

export const getTaskStatus = (task) => {
  if (task.isCompleted) return 'completed';
  if (isOverdue(task.dueDate)) return 'overdue';
  if (isToday(task.dueDate)) return 'due-today';
  if (isTomorrow(task.dueDate)) return 'due-tomorrow';
  if (isThisWeek(task.dueDate)) return 'due-this-week';
  return 'pending';
};

export const getTaskStatusColor = (task) => {
  const status = getTaskStatus(task);
  const colors = {
    'completed': '#10b981',
    'overdue': '#ef4444',
    'due-today': '#f59e0b',
    'due-tomorrow': '#3b82f6',
    'due-this-week': '#8b5cf6',
    'pending': '#6b7280'
  };
  return colors[status] || colors.pending;
};

export const sortTasksByPriority = (tasks) => {
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
  return [...tasks].sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
};

export const sortTasksByDueDate = (tasks) => {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
};

export const getTaskCompletionRate = (tasks, timeframe = 'all') => {
  let filteredTasks = tasks;
  
  if (timeframe !== 'all') {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        break;
    }
    
    filteredTasks = tasks.filter(task => new Date(task.createdAt) >= startDate);
  }
  
  if (filteredTasks.length === 0) return 0;
  const completed = filteredTasks.filter(task => task.isCompleted).length;
  return Math.round((completed / filteredTasks.length) * 100);
};

export const getProductivityScore = (tasks) => {
  if (tasks.length === 0) return 0;
  
  let score = 0;
  const weights = {
    completed: 10,
    onTime: 5,
    highPriority: 3,
    overdue: -5
  };
  
  tasks.forEach(task => {
    if (task.isCompleted) {
      score += weights.completed;
      
      // Bonus for completing on time
      if (task.dueDate && task.completedAt) {
        const dueDate = new Date(task.dueDate);
        const completedDate = new Date(task.completedAt);
        if (completedDate <= dueDate) {
          score += weights.onTime;
        }
      }
      
      // Bonus for high priority tasks
      if (task.priority === 'high' || task.priority === 'urgent') {
        score += weights.highPriority;
      }
    } else if (isOverdue(task.dueDate)) {
      score += weights.overdue;
    }
  });
  
  return Math.max(0, Math.round(score / tasks.length));
};

export const getTaskInsights = (tasks) => {
  const insights = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.isCompleted).length,
    overdueTasks: tasks.filter(t => !t.isCompleted && isOverdue(t.dueDate)).length,
    dueTodayTasks: tasks.filter(t => !t.isCompleted && isToday(t.dueDate)).length,
    highPriorityTasks: tasks.filter(t => !t.isCompleted && (t.priority === 'high' || t.priority === 'urgent')).length,
    completionRate: 0,
    productivityScore: 0,
    averageCompletionTime: 0,
    mostProductiveCategory: null,
    leastProductiveCategory: null
  };
  
  if (insights.totalTasks > 0) {
    insights.completionRate = Math.round((insights.completedTasks / insights.totalTasks) * 100);
    insights.productivityScore = getProductivityScore(tasks);
    
    // Calculate average completion time
    const completedWithDates = tasks.filter(t => t.isCompleted && t.createdAt && t.completedAt);
    if (completedWithDates.length > 0) {
      const totalTime = completedWithDates.reduce((sum, task) => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.completedAt);
        return sum + (completed - created);
      }, 0);
      insights.averageCompletionTime = Math.round(totalTime / completedWithDates.length / (1000 * 60 * 60 * 24)); // in days
    }
    
    // Find most and least productive categories
    const categoryStats = {};
    tasks.forEach(task => {
      if (!categoryStats[task.category]) {
        categoryStats[task.category] = { total: 0, completed: 0 };
      }
      categoryStats[task.category].total++;
      if (task.isCompleted) {
        categoryStats[task.category].completed++;
      }
    });
    
    let highestRate = -1;
    let lowestRate = 101;
    
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const rate = (stats.completed / stats.total) * 100;
      if (rate > highestRate) {
        highestRate = rate;
        insights.mostProductiveCategory = category;
      }
      if (rate < lowestRate) {
        lowestRate = rate;
        insights.leastProductiveCategory = category;
      }
    });
  }
  
  return insights;
};

export const exportTasks = (tasks, format = 'json') => {
  switch (format) {
    case 'csv':
      const headers = ['Title', 'Description', 'Category', 'Priority', 'Due Date', 'Status', 'Created', 'Completed'];
      const csvContent = [
        headers.join(','),
        ...tasks.map(task => [
          `"${task.title}"`,
          `"${task.description || ''}"`,
          task.category,
          task.priority,
          task.dueDate || '',
          task.isCompleted ? 'Completed' : 'Pending',
          task.createdAt,
          task.completedAt || ''
        ].join(','))
      ].join('\n');
      return csvContent;
    
    case 'json':
    default:
      return JSON.stringify(tasks, null, 2);
  }
};

export const importTasks = (data, format = 'json') => {
  try {
    let tasks = [];
    
    if (format === 'json') {
      tasks = Array.isArray(data) ? data : JSON.parse(data);
    } else if (format === 'csv') {
      // Simple CSV parsing (would need a proper CSV parser for production)
      const lines = data.split('\n');
      const headers = lines[0].split(',');
      tasks = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          title: values[0]?.replace(/"/g, '') || '',
          description: values[1]?.replace(/"/g, '') || '',
          category: values[2] || 'personal',
          priority: values[3] || 'medium',
          dueDate: values[4] || '',
          isCompleted: values[5] === 'Completed',
          createdAt: values[6] || new Date().toISOString(),
          completedAt: values[7] || null
        };
      });
    }
    
    // Validate and normalize imported tasks
    return tasks.map(task => createTask(task));
  } catch (error) {
    throw new Error(`Failed to import tasks: ${error.message}`);
  }
};