import React, { Component } from 'react';
import type {  ReactNode } from 'react';
import { EditorError, ErrorType, logError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface EditorErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

export class EditorErrorBoundary extends Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  private maxRetries = 3;

  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EditorErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error with context
    const editorError = new EditorError(
      ErrorType.EDITOR_INITIALIZATION,
      `Editor component error: ${error.message}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'EditorErrorBoundary',
        retryCount: this.state.retryCount,
      }
    );

    logError(editorError, 'EditorErrorBoundary');

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount <= this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: newRetryCount,
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-destructive-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-destructive">
                Editor Error
              </h3>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The editor encountered an error and couldn't load properly.
            </p>

            {this.state.error && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  Error Details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-24">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex space-x-2">
              {this.state.retryCount < this.maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Try Again ({this.maxRetries - this.state.retryCount} left)
                </Button>
              )}
              
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Reset Editor
              </Button>
            </div>

            {this.state.retryCount >= this.maxRetries && (
              <p className="text-xs text-muted-foreground">
                Maximum retry attempts reached. Please refresh the page or contact support.
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}