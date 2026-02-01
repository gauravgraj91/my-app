// Error handling utilities for bill operations

export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMIT: 'rate_limit',
  UNKNOWN: 'unknown'
};

export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  OFFLINE: 'OFFLINE',
  
  // Validation errors
  INVALID_BILL_DATA: 'INVALID_BILL_DATA',
  DUPLICATE_BILL_NUMBER: 'DUPLICATE_BILL_NUMBER',
  INVALID_DATE: 'INVALID_DATE',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Permission errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Resource errors
  BILL_NOT_FOUND: 'BILL_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  
  // Conflict errors
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  BILL_ALREADY_EXISTS: 'BILL_ALREADY_EXISTS',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Enhanced error class
export class BillError extends Error {
  constructor(message, code = ERROR_CODES.UNKNOWN_ERROR, type = ERROR_TYPES.UNKNOWN, details = {}) {
    super(message);
    this.name = 'BillError';
    this.code = code;
    this.type = type;
    this.details = details;
    this.timestamp = new Date();
    this.retryable = this.isRetryable();
  }

  isRetryable() {
    const retryableCodes = [
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.TIMEOUT,
      ERROR_CODES.TOO_MANY_REQUESTS
    ];
    return retryableCodes.includes(this.code);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      details: this.details,
      timestamp: this.timestamp,
      retryable: this.retryable
    };
  }
}

// Error classification function
export const classifyError = (error) => {
  // Firebase/Firestore errors
  if (error.code) {
    switch (error.code) {
      case 'unavailable':
      case 'deadline-exceeded':
        return new BillError(
          'Service temporarily unavailable. Please try again.',
          ERROR_CODES.NETWORK_ERROR,
          ERROR_TYPES.NETWORK,
          { originalError: error }
        );
      
      case 'permission-denied':
        return new BillError(
          'You do not have permission to perform this action.',
          ERROR_CODES.FORBIDDEN,
          ERROR_TYPES.PERMISSION,
          { originalError: error }
        );
      
      case 'unauthenticated':
        return new BillError(
          'Please sign in to continue.',
          ERROR_CODES.UNAUTHORIZED,
          ERROR_TYPES.PERMISSION,
          { originalError: error }
        );
      
      case 'not-found':
        return new BillError(
          'The requested resource was not found.',
          ERROR_CODES.BILL_NOT_FOUND,
          ERROR_TYPES.NOT_FOUND,
          { originalError: error }
        );
      
      case 'already-exists':
        return new BillError(
          'A bill with this number already exists.',
          ERROR_CODES.BILL_ALREADY_EXISTS,
          ERROR_TYPES.CONFLICT,
          { originalError: error }
        );
      
      case 'resource-exhausted':
        return new BillError(
          'Too many requests. Please wait a moment and try again.',
          ERROR_CODES.TOO_MANY_REQUESTS,
          ERROR_TYPES.RATE_LIMIT,
          { originalError: error }
        );
    }
  }

  // Network errors
  if (error.name === 'NetworkError' || error.message.includes('fetch')) {
    return new BillError(
      'Network connection error. Please check your internet connection.',
      ERROR_CODES.NETWORK_ERROR,
      ERROR_TYPES.NETWORK,
      { originalError: error }
    );
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    return new BillError(
      'Request timed out. Please try again.',
      ERROR_CODES.TIMEOUT,
      ERROR_TYPES.NETWORK,
      { originalError: error }
    );
  }

  // Validation errors (custom)
  if (error.name === 'ValidationError') {
    return new BillError(
      error.message,
      ERROR_CODES.INVALID_BILL_DATA,
      ERROR_TYPES.VALIDATION,
      { originalError: error }
    );
  }

  // Default unknown error
  return new BillError(
    error.message || 'An unexpected error occurred.',
    ERROR_CODES.UNKNOWN_ERROR,
    ERROR_TYPES.UNKNOWN,
    { originalError: error }
  );
};

// User-friendly error messages
export const getErrorMessage = (error) => {
  const billError = error instanceof BillError ? error : classifyError(error);
  
  const messages = {
    [ERROR_CODES.NETWORK_ERROR]: {
      title: 'Connection Problem',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      action: 'Retry'
    },
    [ERROR_CODES.TIMEOUT]: {
      title: 'Request Timeout',
      message: 'The request took too long to complete. This might be due to a slow connection.',
      action: 'Try Again'
    },
    [ERROR_CODES.OFFLINE]: {
      title: 'You\'re Offline',
      message: 'No internet connection detected. Changes will be saved when you\'re back online.',
      action: 'Retry When Online'
    },
    [ERROR_CODES.INVALID_BILL_DATA]: {
      title: 'Invalid Data',
      message: 'Please check the bill information and correct any errors.',
      action: 'Fix Errors'
    },
    [ERROR_CODES.DUPLICATE_BILL_NUMBER]: {
      title: 'Duplicate Bill Number',
      message: 'A bill with this number already exists. Please use a different bill number.',
      action: 'Change Number'
    },
    [ERROR_CODES.UNAUTHORIZED]: {
      title: 'Sign In Required',
      message: 'Please sign in to your account to continue.',
      action: 'Sign In'
    },
    [ERROR_CODES.FORBIDDEN]: {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      action: 'Contact Support'
    },
    [ERROR_CODES.BILL_NOT_FOUND]: {
      title: 'Bill Not Found',
      message: 'The bill you\'re looking for doesn\'t exist or may have been deleted.',
      action: 'Go Back'
    },
    [ERROR_CODES.CONCURRENT_MODIFICATION]: {
      title: 'Conflict Detected',
      message: 'This bill was modified by someone else. Please refresh and try again.',
      action: 'Refresh'
    },
    [ERROR_CODES.TOO_MANY_REQUESTS]: {
      title: 'Too Many Requests',
      message: 'You\'re making requests too quickly. Please wait a moment and try again.',
      action: 'Wait and Retry'
    }
  };

  return messages[billError.code] || {
    title: 'Something Went Wrong',
    message: billError.message || 'An unexpected error occurred. Please try again.',
    action: 'Try Again'
  };
};

// Recovery suggestions
export const getRecoveryOptions = (error) => {
  const billError = error instanceof BillError ? error : classifyError(error);
  
  const options = {
    [ERROR_CODES.NETWORK_ERROR]: [
      { label: 'Retry', action: 'retry', primary: true },
      { label: 'Check Connection', action: 'check_connection' },
      { label: 'Work Offline', action: 'offline_mode' }
    ],
    [ERROR_CODES.TIMEOUT]: [
      { label: 'Try Again', action: 'retry', primary: true },
      { label: 'Reduce Data', action: 'reduce_scope' }
    ],
    [ERROR_CODES.INVALID_BILL_DATA]: [
      { label: 'Fix Errors', action: 'fix_validation', primary: true },
      { label: 'Reset Form', action: 'reset_form' }
    ],
    [ERROR_CODES.DUPLICATE_BILL_NUMBER]: [
      { label: 'Generate New Number', action: 'generate_number', primary: true },
      { label: 'Edit Manually', action: 'edit_manual' }
    ],
    [ERROR_CODES.BILL_NOT_FOUND]: [
      { label: 'Go Back', action: 'go_back', primary: true },
      { label: 'Search Bills', action: 'search_bills' },
      { label: 'Create New', action: 'create_new' }
    ],
    [ERROR_CODES.CONCURRENT_MODIFICATION]: [
      { label: 'Refresh Data', action: 'refresh', primary: true },
      { label: 'View Changes', action: 'view_changes' },
      { label: 'Force Save', action: 'force_save' }
    ]
  };

  return options[billError.code] || [
    { label: 'Try Again', action: 'retry', primary: true },
    { label: 'Go Back', action: 'go_back' }
  ];
};

// Error reporting
export const reportError = (error, context = {}) => {
  const billError = error instanceof BillError ? error : classifyError(error);
  
  const errorReport = {
    ...billError.toJSON(),
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ...context
    }
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Bill Error Report');
    console.error('Error:', billError);
    console.log('Context:', context);
    console.log('Full Report:', errorReport);
    console.groupEnd();
  }

  // In production, you would send this to your error reporting service
  // Example: Sentry, LogRocket, etc.
  
  return errorReport;
};

// Retry mechanism with exponential backoff
export const createRetryHandler = (maxRetries = 3, baseDelay = 1000) => {
  return async (operation, context = {}) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        // Only classify if it's not already a BillError
        lastError = error instanceof BillError ? error : classifyError(error);
        
        // Don't retry if error is not retryable
        if (!lastError.retryable || attempt === maxRetries) {
          reportError(lastError, { ...context, attempt, maxRetries });
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };
};

// Validation helpers
export const validateBillData = (billData) => {
  const errors = {};
  
  if (!billData.billNumber?.trim()) {
    errors.billNumber = 'Bill number is required';
  }
  
  if (!billData.vendor?.trim()) {
    errors.vendor = 'Vendor is required';
  }
  
  if (!billData.date) {
    errors.date = 'Date is required';
  } else {
    const date = new Date(billData.date);
    if (isNaN(date.getTime())) {
      errors.date = 'Invalid date format';
    }
  }
  
  if (Object.keys(errors).length > 0) {
    throw new BillError(
      'Please correct the following errors',
      ERROR_CODES.INVALID_BILL_DATA,
      ERROR_TYPES.VALIDATION,
      { validationErrors: errors }
    );
  }
  
  return true;
};

export default {
  BillError,
  ERROR_TYPES,
  ERROR_CODES,
  classifyError,
  getErrorMessage,
  getRecoveryOptions,
  reportError,
  createRetryHandler,
  validateBillData
};