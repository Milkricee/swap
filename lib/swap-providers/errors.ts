/**
 * Swap Error Handling
 * Structured error classes for swap operations
 */

/**
 * Base class for swap-related errors
 */
export class SwapError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SwapError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

/**
 * Network-related errors (retryable)
 */
export class NetworkError extends SwapError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', true, details);
    this.name = 'NetworkError';
  }
}

/**
 * API-related errors (HTTP 4xx/5xx)
 */
export class APIError extends SwapError {
  constructor(
    message: string,
    public readonly statusCode: number,
    details?: unknown,
    retryable: boolean = statusCode >= 500 // 5xx errors are retryable
  ) {
    super(message, 'API_ERROR', retryable, details);
    this.name = 'APIError';
  }
}

/**
 * Provider-specific errors
 */
export class ProviderError extends SwapError {
  constructor(
    message: string,
    public readonly provider: string,
    retryable: boolean = false,
    details?: unknown
  ) {
    super(message, 'PROVIDER_ERROR', retryable, details);
    this.name = 'ProviderError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends SwapError {
  constructor(message: string, details?: unknown) {
    super(message, 'TIMEOUT', false, details);
    this.name = 'TimeoutError';
  }
}

/**
 * Validation errors (non-retryable)
 */
export class ValidationError extends SwapError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', false, details);
    this.name = 'ValidationError';
  }
}

/**
 * Insufficient funds errors
 */
export class InsufficientFundsError extends SwapError {
  constructor(
    message: string,
    public readonly required: number,
    public readonly available: number
  ) {
    super(message, 'INSUFFICIENT_FUNDS', false, { required, available });
    this.name = 'InsufficientFundsError';
  }
}

/**
 * Parse error from various sources
 */
export function parseSwapError(error: unknown): SwapError {
  // Already a SwapError
  if (error instanceof SwapError) {
    return error;
  }

  // Network errors (fetch failures)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError('Network request failed. Check your connection.', error);
  }

  // Standard errors
  if (error instanceof Error) {
    // Check for timeout keywords
    if (error.message.toLowerCase().includes('timeout')) {
      return new TimeoutError(error.message, error);
    }

    // Check for network keywords
    if (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('connection') ||
      error.message.toLowerCase().includes('unreachable')
    ) {
      return new NetworkError(error.message, error);
    }

    // Generic error
    return new SwapError(error.message, 'UNKNOWN_ERROR', false, error);
  }

  // Unknown error type
  return new SwapError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    false,
    error
  );
}

/**
 * Error message for UI display
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof SwapError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof SwapError) {
    return error.retryable;
  }

  // Network errors are generally retryable
  if (error instanceof TypeError) {
    return true;
  }

  return false;
}

/**
 * Log error (client-side only, no sensitive data)
 */
export function logSwapError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  const timestamp = new Date().toISOString();
  const parsedError = parseSwapError(error);

  const logEntry = {
    timestamp,
    context,
    error: parsedError.toJSON(),
    metadata: {
      ...metadata,
      userAgent: navigator.userAgent,
      url: window.location.href,
    },
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, logEntry);
  }

  // Store in localStorage (limit to last 20 errors)
  try {
    const logs = JSON.parse(localStorage.getItem('swap_error_logs') || '[]');
    logs.unshift(logEntry);
    logs.splice(20); // Keep only last 20
    localStorage.setItem('swap_error_logs', JSON.stringify(logs));
  } catch (e) {
    console.warn('Failed to store error log:', e);
  }
}

/**
 * Get error logs (for debugging)
 */
export function getErrorLogs(): Array<{
  timestamp: string;
  context: string;
  error: ReturnType<SwapError['toJSON']>;
  metadata?: Record<string, unknown>;
}> {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem('swap_error_logs') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear error logs
 */
export function clearErrorLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('swap_error_logs');
}
