'use client';

/**
 * OPTIMIZATION: Reusable safe async action hook
 * 
 * Wraps any async operation with:
 * - try/catch/finally (loading always resets)
 * - Configurable timeout (default 15s) so buttons never stay loading forever
 * - Error toast notification
 * - Deduplication (prevents double-click rapid fire)
 */

import { useState, useRef, useCallback } from 'react';
import { useToast } from './use-toast';

interface UseSafeActionOptions {
  /** Timeout in milliseconds before auto-reset (default: 15000) */
  timeout?: number;
  /** Toast title on error (default: 'Operation Failed') */
  errorTitle?: string;
  /** Suppress error toast (default: false) */
  silent?: boolean;
}

export function useSafeAction(options: UseSafeActionOptions = {}) {
  const { timeout = 15000, errorTitle = 'Operation Failed', silent = false } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const inFlightRef = useRef(false);
  const { toast } = useToast();

  const execute = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    // Prevent double-click / duplicate execution
    if (inFlightRef.current) return undefined;
    
    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    // Timeout protection — auto-reset loading state
    const timeoutId = setTimeout(() => {
      if (inFlightRef.current) {
        inFlightRef.current = false;
        setLoading(false);
        if (!silent) {
          toast({
            variant: 'destructive',
            title: 'Request Timed Out',
            description: 'The operation took too long. Please try again.',
          });
        }
      }
    }, timeout);

    try {
      const result = await fn();
      return result;
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(err?.message || 'Unknown error');
      setError(error);
      if (!silent) {
        toast({
          variant: 'destructive',
          title: errorTitle,
          description: error.message || 'An unexpected error occurred.',
        });
      }
      console.error(`[SafeAction] ${errorTitle}:`, err);
      return undefined;
    } finally {
      clearTimeout(timeoutId);
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [timeout, errorTitle, silent, toast]);

  return { execute, loading, error };
}
