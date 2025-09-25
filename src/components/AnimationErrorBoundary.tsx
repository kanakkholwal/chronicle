import React, { Component } from 'react';
import type {  ReactNode } from 'react';
import { AnimationError, logError } from '@/lib/errors';

interface AnimationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface AnimationErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class AnimationErrorBoundary extends Component<
  AnimationErrorBoundaryProps,
  AnimationErrorBoundaryState
> {
  constructor(props: AnimationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AnimationErrorBoundaryState> {
    // Check if this is an animation-related error
    const isAnimationError = 
      error.message.toLowerCase().includes('framer') ||
      error.message.toLowerCase().includes('motion') ||
      error.message.toLowerCase().includes('animation') ||
      error.stack?.includes('framer-motion');

    if (isAnimationError) {
      return {
        hasError: true,
        error,
      };
    }

    // Re-throw non-animation errors to be handled by parent boundaries
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const animationError = new AnimationError(
      `Animation system error: ${error.message}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'AnimationErrorBoundary',
      }
    );

    logError(animationError, 'AnimationErrorBoundary');
    this.props.onError?.(error);

    this.setState({ error });
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback: render children without animations
      // This provides graceful degradation
      return (
        <div className="animation-fallback">
          {this.props.children}
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with animation error handling
export const withAnimationErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <AnimationErrorBoundary fallback={fallback}>
      <Component {...props} />
    </AnimationErrorBoundary>
  );

  WrappedComponent.displayName = `withAnimationErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};