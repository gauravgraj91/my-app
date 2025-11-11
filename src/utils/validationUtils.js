// Validation utility functions

export const ValidationRules = {
  REQUIRED: 'required',
  EMAIL: 'email',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  PATTERN: 'pattern',
  CUSTOM: 'custom'
};

export const createValidator = (rules) => {
  return (value) => {
    const errors = [];
    
    for (const rule of rules) {
      const error = validateRule(value, rule);
      if (error) {
        errors.push(error);
      }
    }
    
    return errors.length > 0 ? errors : null;
  };
};

export const validateRule = (value, rule) => {
  switch (rule.type) {
    case ValidationRules.REQUIRED:
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return rule.message || 'This field is required';
      }
      break;
      
    case ValidationRules.EMAIL:
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        return rule.message || 'Please enter a valid email address';
      }
      break;
      
    case ValidationRules.MIN_LENGTH:
      if (value && value.length < rule.value) {
        return rule.message || `Minimum length is ${rule.value} characters`;
      }
      break;
      
    case ValidationRules.MAX_LENGTH:
      if (value && value.length > rule.value) {
        return rule.message || `Maximum length is ${rule.value} characters`;
      }
      break;
      
    case ValidationRules.PATTERN:
      if (value && !rule.value.test(value)) {
        return rule.message || 'Invalid format';
      }
      break;
      
    case ValidationRules.CUSTOM:
      if (rule.validator && typeof rule.validator === 'function') {
        const result = rule.validator(value);
        if (result !== true) {
          return typeof result === 'string' ? result : rule.message || 'Invalid value';
        }
      }
      break;
      
    default:
      break;
  }
  
  return null;
};

// Common validation functions
export const validateTask = (task) => {
  const errors = {};
  
  // Title validation
  if (!task.title || task.title.trim() === '') {
    errors.title = 'Task title is required';
  } else if (task.title.length > 200) {
    errors.title = 'Task title must be less than 200 characters';
  }
  
  // Description validation
  if (task.description && task.description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters';
  }
  
  // Category validation
  const validCategories = ['personal', 'work', 'shopping', 'health', 'finance', 'education', 'social'];
  if (task.category && !validCategories.includes(task.category)) {
    errors.category = 'Invalid category';
  }
  
  // Priority validation
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (task.priority && !validPriorities.includes(task.priority)) {
    errors.priority = 'Invalid priority';
  }
  
  // Due date validation
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    if (isNaN(dueDate.getTime())) {
      errors.dueDate = 'Invalid due date';
    }
  }
  
  // Tags validation
  if (task.tags && Array.isArray(task.tags)) {
    if (task.tags.length > 10) {
      errors.tags = 'Maximum 10 tags allowed';
    }
    
    const invalidTags = task.tags.filter(tag => 
      typeof tag !== 'string' || tag.length > 50 || tag.trim() === ''
    );
    
    if (invalidTags.length > 0) {
      errors.tags = 'Tags must be non-empty strings with maximum 50 characters';
    }
  }
  
  // Estimated time validation
  if (task.estimatedTime) {
    const timePattern = /^(\d+)\s*(minutes?|mins?|hours?|hrs?|days?)$/i;
    if (!timePattern.test(task.estimatedTime.trim())) {
      errors.estimatedTime = 'Invalid time format. Use format like "2 hours", "30 minutes", "1 day"';
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

export const validateShopProduct = (product) => {
  const errors = {};
  
  // Name validation
  if (!product.name || product.name.trim() === '') {
    errors.name = 'Product name is required';
  } else if (product.name.length > 100) {
    errors.name = 'Product name must be less than 100 characters';
  }
  
  // Price validation
  if (product.price === undefined || product.price === null || product.price === '') {
    errors.price = 'Price is required';
  } else if (isNaN(product.price) || parseFloat(product.price) < 0) {
    errors.price = 'Price must be a valid positive number';
  }
  
  // Cost validation
  if (product.cost !== undefined && product.cost !== null && product.cost !== '') {
    if (isNaN(product.cost) || parseFloat(product.cost) < 0) {
      errors.cost = 'Cost must be a valid positive number';
    }
  }
  
  // Quantity validation
  if (product.quantity !== undefined && product.quantity !== null && product.quantity !== '') {
    if (isNaN(product.quantity) || parseInt(product.quantity) < 0) {
      errors.quantity = 'Quantity must be a valid positive number';
    }
  }
  
  // Category validation
  if (product.category && product.category.length > 50) {
    errors.category = 'Category must be less than 50 characters';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

export const validateTransaction = (transaction) => {
  const errors = {};
  
  // Description validation
  if (!transaction.description || transaction.description.trim() === '') {
    errors.description = 'Transaction description is required';
  } else if (transaction.description.length > 200) {
    errors.description = 'Description must be less than 200 characters';
  }
  
  // Amount validation
  if (transaction.amount === undefined || transaction.amount === null || transaction.amount === '') {
    errors.amount = 'Amount is required';
  } else if (isNaN(transaction.amount) || parseFloat(transaction.amount) === 0) {
    errors.amount = 'Amount must be a valid non-zero number';
  }
  
  // Type validation
  const validTypes = ['income', 'expense'];
  if (!transaction.type || !validTypes.includes(transaction.type)) {
    errors.type = 'Transaction type must be either income or expense';
  }
  
  // Date validation
  if (transaction.date) {
    const date = new Date(transaction.date);
    if (isNaN(date.getTime())) {
      errors.date = 'Invalid date';
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

// Form validation helpers
export const validateForm = (formData, validationSchema) => {
  const errors = {};
  
  Object.keys(validationSchema).forEach(field => {
    const rules = validationSchema[field];
    const value = formData[field];
    const validator = createValidator(rules);
    const fieldErrors = validator(value);
    
    if (fieldErrors) {
      errors[field] = fieldErrors[0]; // Take first error
    }
  });
  
  return Object.keys(errors).length > 0 ? errors : null;
};

// Common validation schemas
export const TaskValidationSchema = {
  title: [
    { type: ValidationRules.REQUIRED, message: 'Task title is required' },
    { type: ValidationRules.MAX_LENGTH, value: 200, message: 'Title must be less than 200 characters' }
  ],
  description: [
    { type: ValidationRules.MAX_LENGTH, value: 1000, message: 'Description must be less than 1000 characters' }
  ],
  category: [
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => {
        const validCategories = ['personal', 'work', 'shopping', 'health', 'finance', 'education', 'social'];
        return !value || validCategories.includes(value);
      },
      message: 'Invalid category'
    }
  ],
  priority: [
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        return !value || validPriorities.includes(value);
      },
      message: 'Invalid priority'
    }
  ]
};

export const ProductValidationSchema = {
  name: [
    { type: ValidationRules.REQUIRED, message: 'Product name is required' },
    { type: ValidationRules.MAX_LENGTH, value: 100, message: 'Name must be less than 100 characters' }
  ],
  price: [
    { type: ValidationRules.REQUIRED, message: 'Price is required' },
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => !isNaN(value) && parseFloat(value) >= 0,
      message: 'Price must be a valid positive number'
    }
  ]
};

export const TransactionValidationSchema = {
  description: [
    { type: ValidationRules.REQUIRED, message: 'Description is required' },
    { type: ValidationRules.MAX_LENGTH, value: 200, message: 'Description must be less than 200 characters' }
  ],
  amount: [
    { type: ValidationRules.REQUIRED, message: 'Amount is required' },
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => !isNaN(value) && parseFloat(value) !== 0,
      message: 'Amount must be a valid non-zero number'
    }
  ],
  type: [
    { type: ValidationRules.REQUIRED, message: 'Transaction type is required' },
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => ['income', 'expense'].includes(value),
      message: 'Type must be either income or expense'
    }
  ]
};/
/ Bill validation function
export const validateBill = (bill) => {
  const errors = {};
  
  // Bill number validation
  if (!bill.billNumber || bill.billNumber.trim() === '') {
    errors.billNumber = 'Bill number is required';
  } else if (bill.billNumber.length > 20) {
    errors.billNumber = 'Bill number must be less than 20 characters';
  }
  
  // Date validation
  if (!bill.date) {
    errors.date = 'Bill date is required';
  } else {
    const date = new Date(bill.date);
    if (isNaN(date.getTime())) {
      errors.date = 'Invalid date format';
    }
  }
  
  // Vendor validation
  if (!bill.vendor || bill.vendor.trim() === '') {
    errors.vendor = 'Vendor is required';
  } else if (bill.vendor.length > 100) {
    errors.vendor = 'Vendor name must be less than 100 characters';
  }
  
  // Notes validation (optional)
  if (bill.notes && bill.notes.length > 500) {
    errors.notes = 'Notes must be less than 500 characters';
  }
  
  // Status validation
  const validStatuses = ['active', 'archived', 'returned'];
  if (bill.status && !validStatuses.includes(bill.status)) {
    errors.status = 'Invalid status. Must be active, archived, or returned';
  }
  
  // Numeric field validations
  if (bill.totalAmount !== undefined && (isNaN(bill.totalAmount) || bill.totalAmount < 0)) {
    errors.totalAmount = 'Total amount must be a valid positive number';
  }
  
  if (bill.totalQuantity !== undefined && (isNaN(bill.totalQuantity) || bill.totalQuantity < 0)) {
    errors.totalQuantity = 'Total quantity must be a valid positive number';
  }
  
  if (bill.totalProfit !== undefined && isNaN(bill.totalProfit)) {
    errors.totalProfit = 'Total profit must be a valid number';
  }
  
  if (bill.productCount !== undefined && (isNaN(bill.productCount) || bill.productCount < 0)) {
    errors.productCount = 'Product count must be a valid positive number';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

// Bill validation schema for form validation
export const BillValidationSchema = {
  billNumber: [
    { type: ValidationRules.REQUIRED, message: 'Bill number is required' },
    { type: ValidationRules.MAX_LENGTH, value: 20, message: 'Bill number must be less than 20 characters' }
  ],
  date: [
    { type: ValidationRules.REQUIRED, message: 'Bill date is required' },
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => {
        if (!value) return false;
        const date = new Date(value);
        return !isNaN(date.getTime());
      },
      message: 'Invalid date format'
    }
  ],
  vendor: [
    { type: ValidationRules.REQUIRED, message: 'Vendor is required' },
    { type: ValidationRules.MAX_LENGTH, value: 100, message: 'Vendor name must be less than 100 characters' }
  ],
  notes: [
    { type: ValidationRules.MAX_LENGTH, value: 500, message: 'Notes must be less than 500 characters' }
  ],
  status: [
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => {
        const validStatuses = ['active', 'archived', 'returned'];
        return !value || validStatuses.includes(value);
      },
      message: 'Invalid status. Must be active, archived, or returned'
    }
  ],
  totalAmount: [
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => value === undefined || (!isNaN(value) && parseFloat(value) >= 0),
      message: 'Total amount must be a valid positive number'
    }
  ],
  totalQuantity: [
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => value === undefined || (!isNaN(value) && parseFloat(value) >= 0),
      message: 'Total quantity must be a valid positive number'
    }
  ],
  totalProfit: [
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => value === undefined || !isNaN(value),
      message: 'Total profit must be a valid number'
    }
  ],
  productCount: [
    { 
      type: ValidationRules.CUSTOM, 
      validator: (value) => value === undefined || (!isNaN(value) && parseInt(value) >= 0),
      message: 'Product count must be a valid positive number'
    }
  ]
};