'use client';

/**
 * OPTIMIZATION: Error Boundary
 * 
 * Catches React rendering errors and displays a graceful fallback
 * instead of crashing the entire application. Matches the app's
 * dark theme design.
 */

import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for monitoring
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="p-6 bg-red-500/10 rounded-3xl border border-red-500/20 mb-6">
            <svg
              className="w-16 h-16 text-red-500 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="font-headline text-2xl font-black uppercase italic text-white mb-2 tracking-tighter">
            SYSTEM <span className="text-red-500">ERROR</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mb-6 font-medium">
            Something went wrong in this section. Your data is safe. 
            Try refreshing or navigate to another page.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-colors"
            >
              TRY AGAIN
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-xl border border-white/10 transition-colors"
            >
              RELOAD PAGE
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-6 text-left text-xs text-red-400 bg-black/40 p-4 rounded-xl max-w-lg overflow-auto border border-red-500/10">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
