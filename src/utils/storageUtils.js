// Enhanced storage utilities with error handling and data migration

const STORAGE_KEYS = {
  TASKS: 'productivity_app_tasks',
  PRODUCTS: 'productivity_app_products',
  TRANSACTIONS: 'productivity_app_transactions',
  SETTINGS: 'productivity_app_settings',
  USER_PREFERENCES: 'productivity_app_preferences',
  APP_VERSION: 'productivity_app_version'
};

const CURRENT_VERSION = '1.0.0';

// Enhanced localStorage wrapper with error handling
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  },

  exists: (key) => {
    return localStorage.getItem(key) !== null;
  },

  size: () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
};

// Data-specific storage functions
export const taskStorage = {
  getTasks: () => storage.get(STORAGE_KEYS.TASKS, []),
  setTasks: (tasks) => storage.set(STORAGE_KEYS.TASKS, tasks),
  addTask: (task) => {
    const tasks = taskStorage.getTasks();
    tasks.push(task);
    return taskStorage.setTasks(tasks);
  },
  updateTask: (taskId, updates) => {
    const tasks = taskStorage.getTasks();
    const index = tasks.findIndex(task => task.id === taskId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      return taskStorage.setTasks(tasks);
    }
    return false;
  },
  deleteTask: (taskId) => {
    const tasks = taskStorage.getTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    return taskStorage.setTasks(filteredTasks);
  }
};

export const productStorage = {
  getProducts: () => storage.get(STORAGE_KEYS.PRODUCTS, []),
  setProducts: (products) => storage.set(STORAGE_KEYS.PRODUCTS, products),
  addProduct: (product) => {
    const products = productStorage.getProducts();
    products.push(product);
    return productStorage.setProducts(products);
  },
  updateProduct: (productId, updates) => {
    const products = productStorage.getProducts();
    const index = products.findIndex(product => product.id === productId);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      return productStorage.setProducts(products);
    }
    return false;
  },
  deleteProduct: (productId) => {
    const products = productStorage.getProducts();
    const filteredProducts = products.filter(product => product.id !== productId);
    return productStorage.setProducts(filteredProducts);
  }
};

export const transactionStorage = {
  getTransactions: () => storage.get(STORAGE_KEYS.TRANSACTIONS, []),
  setTransactions: (transactions) => storage.set(STORAGE_KEYS.TRANSACTIONS, transactions),
  addTransaction: (transaction) => {
    const transactions = transactionStorage.getTransactions();
    transactions.push(transaction);
    return transactionStorage.setTransactions(transactions);
  },
  updateTransaction: (transactionId, updates) => {
    const transactions = transactionStorage.getTransactions();
    const index = transactions.findIndex(transaction => transaction.id === transactionId);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updates };
      return transactionStorage.setTransactions(transactions);
    }
    return false;
  },
  deleteTransaction: (transactionId) => {
    const transactions = transactionStorage.getTransactions();
    const filteredTransactions = transactions.filter(transaction => transaction.id !== transactionId);
    return transactionStorage.setTransactions(filteredTransactions);
  }
};

export const settingsStorage = {
  getSettings: () => storage.get(STORAGE_KEYS.SETTINGS, {}),
  setSettings: (settings) => storage.set(STORAGE_KEYS.SETTINGS, settings),
  getSetting: (key, defaultValue = null) => {
    const settings = settingsStorage.getSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  },
  setSetting: (key, value) => {
    const settings = settingsStorage.getSettings();
    settings[key] = value;
    return settingsStorage.setSettings(settings);
  }
};

export const preferencesStorage = {
  getPreferences: () => storage.get(STORAGE_KEYS.USER_PREFERENCES, {}),
  setPreferences: (preferences) => storage.set(STORAGE_KEYS.USER_PREFERENCES, preferences),
  getPreference: (key, defaultValue = null) => {
    const preferences = preferencesStorage.getPreferences();
    return preferences[key] !== undefined ? preferences[key] : defaultValue;
  },
  setPreference: (key, value) => {
    const preferences = preferencesStorage.getPreferences();
    preferences[key] = value;
    return preferencesStorage.setPreferences(preferences);
  }
};

// Data migration functions
export const migrateData = () => {
  const currentVersion = storage.get(STORAGE_KEYS.APP_VERSION, '0.0.0');
  
  if (currentVersion === CURRENT_VERSION) {
    return; // No migration needed
  }
  
  console.log(`Migrating data from version ${currentVersion} to ${CURRENT_VERSION}`);
  
  try {
    // Add migration logic here for different versions
    if (compareVersions(currentVersion, '1.0.0') < 0) {
      migrateToV1();
    }
    
    // Update version after successful migration
    storage.set(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
    console.log('Data migration completed successfully');
  } catch (error) {
    console.error('Data migration failed:', error);
  }
};

const migrateToV1 = () => {
  // Example migration: ensure all tasks have required fields
  const tasks = taskStorage.getTasks();
  const migratedTasks = tasks.map(task => ({
    id: task.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
    title: task.title || 'Untitled Task',
    description: task.description || '',
    category: task.category || 'personal',
    priority: task.priority || 'medium',
    dueDate: task.dueDate || '',
    tags: task.tags || [],
    estimatedTime: task.estimatedTime || '',
    isCompleted: task.isCompleted || false,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
    ...task
  }));
  
  taskStorage.setTasks(migratedTasks);
};

// Utility function to compare version strings
const compareVersions = (version1, version2) => {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }
  
  return 0;
};

// Backup and restore functions
export const createBackup = () => {
  const backup = {
    version: CURRENT_VERSION,
    timestamp: new Date().toISOString(),
    data: {
      tasks: taskStorage.getTasks(),
      products: productStorage.getProducts(),
      transactions: transactionStorage.getTransactions(),
      settings: settingsStorage.getSettings(),
      preferences: preferencesStorage.getPreferences()
    }
  };
  
  return backup;
};

export const restoreFromBackup = (backup) => {
  try {
    if (!backup.data) {
      throw new Error('Invalid backup format');
    }
    
    // Restore data
    if (backup.data.tasks) taskStorage.setTasks(backup.data.tasks);
    if (backup.data.products) productStorage.setProducts(backup.data.products);
    if (backup.data.transactions) transactionStorage.setTransactions(backup.data.transactions);
    if (backup.data.settings) settingsStorage.setSettings(backup.data.settings);
    if (backup.data.preferences) preferencesStorage.setPreferences(backup.data.preferences);
    
    // Update version
    storage.set(STORAGE_KEYS.APP_VERSION, backup.version || CURRENT_VERSION);
    
    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return false;
  }
};

// Storage cleanup functions
export const cleanupStorage = () => {
  // Remove old completed tasks (older than 30 days)
  const tasks = taskStorage.getTasks();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const cleanedTasks = tasks.filter(task => {
    if (!task.isCompleted) return true;
    if (!task.completedAt) return true;
    return new Date(task.completedAt) > thirtyDaysAgo;
  });
  
  if (cleanedTasks.length !== tasks.length) {
    taskStorage.setTasks(cleanedTasks);
    console.log(`Cleaned up ${tasks.length - cleanedTasks.length} old completed tasks`);
  }
};

// Storage statistics
export const getStorageStats = () => {
  return {
    totalSize: storage.size(),
    tasks: taskStorage.getTasks().length,
    products: productStorage.getProducts().length,
    transactions: transactionStorage.getTransactions().length,
    version: storage.get(STORAGE_KEYS.APP_VERSION, '0.0.0'),
    lastBackup: preferencesStorage.getPreference('lastBackup', null)
  };
};

// Initialize storage on app start
export const initializeStorage = () => {
  // Run data migration if needed
  migrateData();
  
  // Set up periodic cleanup (run once per day)
  const lastCleanup = preferencesStorage.getPreference('lastCleanup', null);
  const now = new Date();
  
  if (!lastCleanup || new Date(lastCleanup).getDate() !== now.getDate()) {
    cleanupStorage();
    preferencesStorage.setPreference('lastCleanup', now.toISOString());
  }
};

export { STORAGE_KEYS };