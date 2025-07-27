import { useState, useEffect } from 'react';

export const useTasks = () => {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTask = (taskData) => {
    if (!taskData.title?.trim()) {
      throw new Error("Task title cannot be empty");
    }
    
    const task = {
      id: Date.now().toString(),
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      category: taskData.category || 'personal',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || null,
      tags: taskData.tags || [],
      estimatedTime: taskData.estimatedTime || null,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };
    
    setTodos(prev => [task, ...prev]);
    return task;
  };

  const deleteTask = (taskId) => {
    setTodos(prev => prev.filter(todo => todo.id !== taskId));
  };

  const updateTask = (taskId, updates) => {
    setTodos(prev => prev.map(todo => 
      todo.id === taskId 
        ? { ...todo, ...updates, updatedAt: new Date().toISOString() }
        : todo
    ));
  };

  const toggleTaskCompletion = (taskId) => {
    setTodos(prev => prev.map(todo => {
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

  const duplicateTask = (taskId) => {
    const taskToDuplicate = todos.find(task => task.id === taskId);
    if (taskToDuplicate) {
      const duplicatedTask = {
        ...taskToDuplicate,
        id: Date.now().toString(),
        title: `${taskToDuplicate.title} (Copy)`,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
      };
      setTodos(prev => [duplicatedTask, ...prev]);
      return duplicatedTask;
    }
  };

  const archiveCompleted = () => {
    setTodos(prev => prev.filter(todo => !todo.isCompleted));
  };

  // Statistics
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.isCompleted).length,
    pending: todos.filter(t => !t.isCompleted).length,
    overdue: todos.filter(t => {
      if (!t.dueDate || t.isCompleted) return false;
      const dueDate = new Date(t.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length,
    dueToday: todos.filter(t => {
      if (!t.dueDate || t.isCompleted) return false;
      const dueDate = new Date(t.dueDate);
      const today = new Date();
      return dueDate.toDateString() === today.toDateString();
    }).length
  };

  return {
    todos,
    stats,
    addTask,
    deleteTask,
    updateTask,
    toggleTaskCompletion,
    duplicateTask,
    archiveCompleted
  };
};