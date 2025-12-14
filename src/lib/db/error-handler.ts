import { PostgrestError } from '@supabase/supabase-js';

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
}

export class DatabaseErrorHandler {
  static handle(error: PostgrestError | Error | unknown): DatabaseError {
    // Handle null/undefined
    if (error === null || error === undefined) {
      return {
        message: 'An unexpected error occurred (no details)',
        code: 'UNKNOWN_ERROR',
      };
    }

    // Handle standard Error instances
    if (error instanceof Error) {
      // Check for network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          message: 'Network connection error. Please check your connection and try again.',
          code: 'NETWORK_ERROR',
        };
      }
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
      };
    }

    // Handle PostgREST errors (have both message and code)
    if (this.isPostgrestError(error)) {
      return this.handlePostgrestError(error);
    }

    // Handle objects with just message property (typically network errors from Supabase)
    if (typeof error === 'object' && 'message' in error) {
      const msg = (error as { message?: string }).message;
      // Empty message typically means network/connection issue
      if (!msg || msg === '') {
        return {
          message: 'Connection error. Please refresh the page and try again.',
          code: 'CONNECTION_ERROR',
        };
      }
      return {
        message: msg,
        code: 'UNKNOWN_ERROR',
      };
    }

    // Log unknown error types (but don't spam console in production)
    if (process.env.NODE_ENV === 'development') {
      console.error('[DatabaseErrorHandler] Unknown error type:', typeof error, JSON.stringify(error, null, 2));
    }

    return {
      message: 'An unexpected database error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  private static isPostgrestError(error: unknown): error is PostgrestError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      'code' in error
    );
  }

  private static handlePostgrestError(error: PostgrestError): DatabaseError {
    const baseError = {
      message: error.message,
      code: error.code,
      details: error.details,
    };

    switch (error.code) {
      case '23505':
        return {
          ...baseError,
          message: 'A record with this information already exists',
        };
      case '23503':
        return {
          ...baseError,
          message: 'Referenced record does not exist',
        };
      case '23514':
        return {
          ...baseError,
          message: 'Invalid data provided',
        };
      case 'PGRST116':
        return {
          ...baseError,
          message: 'Record not found',
        };
      case 'PGRST301':
        return {
          ...baseError,
          message: 'Access denied',
        };
      default:
        return baseError;
    }
  }

  static isNotFoundError(error: DatabaseError): boolean {
    return error.code === 'PGRST116';
  }

  static isAccessDeniedError(error: DatabaseError): boolean {
    return error.code === 'PGRST301';
  }

  static isDuplicateError(error: DatabaseError): boolean {
    return error.code === '23505';
  }
}