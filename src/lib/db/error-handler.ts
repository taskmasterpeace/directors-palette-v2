import { PostgrestError } from '@supabase/supabase-js';

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
}

export class DatabaseErrorHandler {
  static handle(error: PostgrestError | Error | unknown): DatabaseError {
    // Always log the raw error for debugging
    console.error('[DatabaseErrorHandler] Raw error:', error);

    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
      };
    }

    if (this.isPostgrestError(error)) {
      return this.handlePostgrestError(error);
    }

    // Log unknown error types with more detail
    console.error('[DatabaseErrorHandler] Unknown error type:', typeof error, JSON.stringify(error, null, 2));

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