import { useState, useMemo } from 'react';

export const useTaskFilters = (todos) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTags, setFilterTags] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredAndSortedTodos = useMemo(() => {
    return todos
      .filter(todo => {
        // Search filter - enhanced to search in tags as well
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const titleMatch = todo.title.toLowerCase().includes(searchLower);
          const descriptionMatch = todo.description?.toLowerCase().includes(searchLower);
          const tagsMatch = todo.tags?.some(tag => tag.toLowerCase().includes(searchLower));
          
          if (!titleMatch && !descriptionMatch && !tagsMatch) {
            return false;
          }
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
        
        // Tags filter
        if (filterTags.length > 0) {
          const todoTags = todo.tags || [];
          const hasMatchingTag = filterTags.some(filterTag => 
            todoTags.some(todoTag => todoTag.toLowerCase().includes(filterTag.toLowerCase()))
          );
          if (!hasMatchingTag) return false;
        }
        
        // Date range filter
        if (dateRange.start || dateRange.end) {
          if (!todo.dueDate) return false;
          const todoDate = new Date(todo.dueDate);
          
          if (dateRange.start) {
            const startDate = new Date(dateRange.start);
            if (todoDate < startDate) return false;
          }
          
          if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            if (todoDate > endDate) return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
            break;
          case 'dueDate':
            if (!a.dueDate && !b.dueDate) comparison = 0;
            else if (!a.dueDate) comparison = 1;
            else if (!b.dueDate) comparison = -1;
            else comparison = new Date(a.dueDate) - new Date(b.dueDate);
            break;
          case 'category':
            comparison = a.category.localeCompare(b.category);
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'status':
            // Completed tasks last when ascending, first when descending
            if (a.isCompleted !== b.isCompleted) {
              comparison = a.isCompleted ? 1 : -1;
            } else {
              comparison = 0;
            }
            break;
          case 'createdAt':
          default:
            comparison = new Date(b.createdAt) - new Date(a.createdAt);
            break;
        }
        
        // Apply sort order (asc/desc)
        return sortOrder === 'desc' ? comparison : -comparison;
      });
  }, [todos, searchTerm, filterCategory, filterPriority, filterStatus, filterTags, dateRange, sortBy, sortOrder]);

  // Get unique tags from all todos for filter suggestions
  const availableTags = useMemo(() => {
    const tagSet = new Set();
    todos.forEach(todo => {
      if (todo.tags) {
        todo.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [todos]);

  // Get filter statistics
  const filterStats = useMemo(() => {
    const stats = {
      total: todos.length,
      filtered: filteredAndSortedTodos.length,
      categories: {},
      priorities: {},
      statuses: {
        completed: todos.filter(t => t.isCompleted).length,
        pending: todos.filter(t => !t.isCompleted).length,
        overdue: todos.filter(t => {
          if (!t.dueDate || t.isCompleted) return false;
          const dueDate = new Date(t.dueDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return dueDate < today;
        }).length
      }
    };

    // Count by categories
    todos.forEach(todo => {
      stats.categories[todo.category] = (stats.categories[todo.category] || 0) + 1;
    });

    // Count by priorities
    todos.forEach(todo => {
      stats.priorities[todo.priority] = (stats.priorities[todo.priority] || 0) + 1;
    });

    return stats;
  }, [todos, filteredAndSortedTodos]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterPriority('all');
    setFilterStatus('all');
    setFilterTags([]);
    setDateRange({ start: '', end: '' });
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const toggleSortOrder = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  const addTagFilter = (tag) => {
    if (!filterTags.includes(tag)) {
      setFilterTags([...filterTags, tag]);
    }
  };

  const removeTagFilter = (tag) => {
    setFilterTags(filterTags.filter(t => t !== tag));
  };

  const setQuickFilter = (type) => {
    clearFilters();
    switch (type) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        setDateRange({ start: today, end: today });
        break;
      case 'thisWeek':
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        setDateRange({ 
          start: startOfWeek.toISOString().split('T')[0], 
          end: endOfWeek.toISOString().split('T')[0] 
        });
        break;
      case 'overdue':
        setFilterStatus('overdue');
        break;
      case 'highPriority':
        setFilterPriority('high');
        break;
      case 'urgent':
        setFilterPriority('urgent');
        break;
      default:
        break;
    }
  };

  return {
    // Filters
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    filterPriority,
    setFilterPriority,
    filterStatus,
    setFilterStatus,
    filterTags,
    setFilterTags,
    dateRange,
    setDateRange,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    
    // Results
    filteredAndSortedTodos,
    availableTags,
    filterStats,
    
    // Actions
    clearFilters,
    toggleSortOrder,
    addTagFilter,
    removeTagFilter,
    setQuickFilter,
    
    // Filter state
    hasActiveFilters: searchTerm || 
                     filterCategory !== 'all' || 
                     filterPriority !== 'all' || 
                     filterStatus !== 'all' ||
                     filterTags.length > 0 ||
                     dateRange.start ||
                     dateRange.end
  };
};