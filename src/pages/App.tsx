import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { SimpleEditorCard } from '@/components/SimpleEditorCard';

// Error fallback component for application-level errors
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-card border border-destructive/20 rounded-lg p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Application Error
            </h2>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Something went wrong with the application. Please try refreshing the page.
          </p>

          <details className="mb-4">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Error Details
            </summary>
            <pre className="mt-2 text-xs text-destructive bg-destructive/5 p-2 rounded border overflow-auto max-h-32">
              {error.message}
            </pre>
          </details>

          <div className="flex space-x-2">
            <button
              onClick={resetErrorBoundary}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App component with performance monitoring
const App: React.FC = () => {

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log error for debugging (in production, this could be sent to an error reporting service)
        console.error('Application Error:', error);
        console.error('Error Info:', errorInfo);
      }}
      onReset={() => {
        // Optional: Clear any application state that might be causing the error
        window.location.hash = '';
      }}
    >
      <div className="min-h-screen bg-background will-change-[background-color]">
        {/* Main content area with proper responsive layout and performance optimizations */}
        <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <div className="w-full flex justify-center">
            <SimpleEditorCard className="w-full" />
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};
export default App;