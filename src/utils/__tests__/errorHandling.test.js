import {
  BillError,
  ERROR_TYPES,
  ERROR_CODES,
  classifyError,
  getErrorMessage,
  getRecoveryOptions,
  createRetryHandler,
  validateBillData,
  reportError
} from '../errorHandling';

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe('BillError', () => {
  it('creates error with default values', () => {
    const error = new BillError('Test message');
    
    expect(error.message).toBe('Test message');
    expect(error.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
    expect(error.type).toBe(ERROR_TYPES.UNKNOWN);
    expect(error.details).toEqual({});
    expect(error.timestamp).toBeInstanceOf(Date);
    expect(error.retryable).toBe(false);
  });

  it('creates error with custom values', () => {
    const details = { field: 'billNumber' };
    const error = new BillError(
      'Custom message',
      ERROR_CODES.NETWORK_ERROR,
      ERROR_TYPES.NETWORK,
      details
    );
    
    expect(error.message).toBe('Custom message');
    expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR);
    expect(error.type).toBe(ERROR_TYPES.NETWORK);
    expect(error.details).toBe(details);
    expect(error.retryable).toBe(true);
  });

  it('correctly identifies retryable errors', () => {
    const networkError = new BillError('Network error', ERROR_CODES.NETWORK_ERROR);
    const timeoutError = new BillError('Timeout error', ERROR_CODES.TIMEOUT);
    const rateLimitError = new BillError('Rate limit error', ERROR_CODES.TOO_MANY_REQUESTS);
    const validationError = new BillError('Validation error', ERROR_CODES.INVALID_BILL_DATA);
    
    expect(networkError.retryable).toBe(true);
    expect(timeoutError.retryable).toBe(true);
    expect(rateLimitError.retryable).toBe(true);
    expect(validationError.retryable).toBe(false);
  });

  it('serializes to JSON correctly', () => {
    const error = new BillError(
      'Test message',
      ERROR_CODES.NETWORK_ERROR,
      ERROR_TYPES.NETWORK,
      { test: 'data' }
    );
    
    const json = error.toJSON();
    
    expect(json.name).toBe('BillError');
    expect(json.message).toBe('Test message');
    expect(json.code).toBe(ERROR_CODES.NETWORK_ERROR);
    expect(json.type).toBe(ERROR_TYPES.NETWORK);
    expect(json.details).toEqual({ test: 'data' });
    expect(json.retryable).toBe(true);
    expect(json.timestamp).toBeInstanceOf(Date);
  });
});

describe('classifyError', () => {
  it('classifies Firebase errors correctly', () => {
    const firebaseError = { code: 'unavailable', message: 'Service unavailable' };
    const classified = classifyError(firebaseError);
    
    expect(classified).toBeInstanceOf(BillError);
    expect(classified.code).toBe(ERROR_CODES.NETWORK_ERROR);
    expect(classified.type).toBe(ERROR_TYPES.NETWORK);
  });

  it('classifies permission errors correctly', () => {
    const permissionError = { code: 'permission-denied', message: 'Permission denied' };
    const classified = classifyError(permissionError);
    
    expect(classified.code).toBe(ERROR_CODES.FORBIDDEN);
    expect(classified.type).toBe(ERROR_TYPES.PERMISSION);
  });

  it('classifies network errors correctly', () => {
    const networkError = new Error('fetch failed');
    networkError.name = 'NetworkError';
    const classified = classifyError(networkError);
    
    expect(classified.code).toBe(ERROR_CODES.NETWORK_ERROR);
    expect(classified.type).toBe(ERROR_TYPES.NETWORK);
  });

  it('classifies validation errors correctly', () => {
    const validationError = new Error('Invalid data');
    validationError.name = 'ValidationError';
    const classified = classifyError(validationError);
    
    expect(classified.code).toBe(ERROR_CODES.INVALID_BILL_DATA);
    expect(classified.type).toBe(ERROR_TYPES.VALIDATION);
  });

  it('classifies unknown errors correctly', () => {
    const unknownError = new Error('Unknown error');
    const classified = classifyError(unknownError);
    
    expect(classified.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
    expect(classified.type).toBe(ERROR_TYPES.UNKNOWN);
  });
});

describe('getErrorMessage', () => {
  it('returns correct message for network errors', () => {
    const error = new BillError('Network error', ERROR_CODES.NETWORK_ERROR);
    const message = getErrorMessage(error);
    
    expect(message.title).toBe('Connection Problem');
    expect(message.message).toContain('Unable to connect to the server');
    expect(message.action).toBe('Retry');
  });

  it('returns correct message for validation errors', () => {
    const error = new BillError('Validation error', ERROR_CODES.INVALID_BILL_DATA);
    const message = getErrorMessage(error);
    
    expect(message.title).toBe('Invalid Data');
    expect(message.message).toContain('Please check the bill information');
    expect(message.action).toBe('Fix Errors');
  });

  it('returns default message for unknown errors', () => {
    const error = new BillError('Unknown error', 'UNKNOWN_CODE');
    const message = getErrorMessage(error);
    
    expect(message.title).toBe('Something Went Wrong');
    expect(message.message).toBe('Unknown error');
    expect(message.action).toBe('Try Again');
  });
});

describe('getRecoveryOptions', () => {
  it('returns correct options for network errors', () => {
    const error = new BillError('Network error', ERROR_CODES.NETWORK_ERROR);
    const options = getRecoveryOptions(error);
    
    expect(options).toHaveLength(3);
    expect(options[0]).toEqual({ label: 'Retry', action: 'retry', primary: true });
    expect(options[1]).toEqual({ label: 'Check Connection', action: 'check_connection' });
    expect(options[2]).toEqual({ label: 'Work Offline', action: 'offline_mode' });
  });

  it('returns correct options for validation errors', () => {
    const error = new BillError('Validation error', ERROR_CODES.INVALID_BILL_DATA);
    const options = getRecoveryOptions(error);
    
    expect(options).toHaveLength(2);
    expect(options[0]).toEqual({ label: 'Fix Errors', action: 'fix_validation', primary: true });
    expect(options[1]).toEqual({ label: 'Reset Form', action: 'reset_form' });
  });

  it('returns default options for unknown errors', () => {
    const error = new BillError('Unknown error', 'UNKNOWN_CODE');
    const options = getRecoveryOptions(error);
    
    expect(options).toHaveLength(2);
    expect(options[0]).toEqual({ label: 'Try Again', action: 'retry', primary: true });
    expect(options[1]).toEqual({ label: 'Go Back', action: 'go_back' });
  });
});

describe('createRetryHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('succeeds on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const retryHandler = createRetryHandler(3, 100);
    
    const result = await retryHandler(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable errors', async () => {
    const networkError = new BillError('Network error', ERROR_CODES.NETWORK_ERROR);
    const operation = jest.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');
    
    const retryHandler = createRetryHandler(3, 10);
    
    const result = await retryHandler(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable errors', async () => {
    const operation = jest.fn()
      .mockRejectedValue(new BillError('Validation error', ERROR_CODES.INVALID_BILL_DATA));
    
    const retryHandler = createRetryHandler(3, 10);
    
    await expect(retryHandler(operation)).rejects.toThrow('Validation error');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('exhausts all retries and throws last error', async () => {
    const networkError = new BillError('Network error', ERROR_CODES.NETWORK_ERROR);
    const operation = jest.fn().mockRejectedValue(networkError);
    
    const retryHandler = createRetryHandler(2, 10);
    
    await expect(retryHandler(operation)).rejects.toThrow('Network error');
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('waits with exponential backoff', async () => {
    const networkError = new BillError('Network error', ERROR_CODES.NETWORK_ERROR);
    const operation = jest.fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');
    
    const retryHandler = createRetryHandler(3, 100);
    
    const startTime = Date.now();
    const result = await retryHandler(operation);
    const endTime = Date.now();
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
    // Should have waited at least 100ms + 200ms = 300ms
    expect(endTime - startTime).toBeGreaterThanOrEqual(300);
  });
});

describe('validateBillData', () => {
  it('validates correct bill data', () => {
    const validBillData = {
      billNumber: 'B001',
      vendor: 'Test Vendor',
      date: '2023-01-01'
    };
    
    expect(() => validateBillData(validBillData)).not.toThrow();
  });

  it('throws error for missing bill number', () => {
    const invalidBillData = {
      vendor: 'Test Vendor',
      date: '2023-01-01'
    };
    
    expect(() => validateBillData(invalidBillData)).toThrow(BillError);
    expect(() => validateBillData(invalidBillData)).toThrow('Please correct the following errors');
  });

  it('throws error for missing vendor', () => {
    const invalidBillData = {
      billNumber: 'B001',
      date: '2023-01-01'
    };
    
    expect(() => validateBillData(invalidBillData)).toThrow(BillError);
  });

  it('throws error for invalid date', () => {
    const invalidBillData = {
      billNumber: 'B001',
      vendor: 'Test Vendor',
      date: 'invalid-date'
    };
    
    expect(() => validateBillData(invalidBillData)).toThrow(BillError);
  });

  it('includes validation errors in error details', () => {
    const invalidBillData = {
      vendor: 'Test Vendor',
      date: 'invalid-date'
    };
    
    try {
      validateBillData(invalidBillData);
    } catch (error) {
      expect(error.details.validationErrors).toEqual({
        billNumber: 'Bill number is required',
        date: 'Invalid date format'
      });
    }
  });
});

describe('reportError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports error with context in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const error = new BillError('Test error', ERROR_CODES.NETWORK_ERROR);
    const context = { billId: '123', action: 'create' };
    
    const report = reportError(error, context);
    
    expect(report.message).toBe('Test error');
    expect(report.code).toBe(ERROR_CODES.NETWORK_ERROR);
    expect(report.context.billId).toBe('123');
    expect(report.context.action).toBe('create');
    expect(report.context.url).toBe('http://localhost/');
    expect(report.context.userAgent).toBeDefined();
    
    expect(console.group).toHaveBeenCalledWith('🚨 Bill Error Report');
    expect(console.error).toHaveBeenCalledWith('Error:', error);
    expect(console.log).toHaveBeenCalledWith('Context:', context);
    expect(console.groupEnd).toHaveBeenCalled();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('classifies non-BillError instances', () => {
    const regularError = new Error('Regular error');
    const context = { test: 'context' };
    
    const report = reportError(regularError, context);
    
    expect(report.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
    expect(report.type).toBe(ERROR_TYPES.UNKNOWN);
    expect(report.context.test).toBe('context');
  });
});