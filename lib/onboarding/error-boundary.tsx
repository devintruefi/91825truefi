'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackUI?: ReactNode;
  onReset?: () => void;
  stepName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  retryCount: number;
}

export class OnboardingErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Onboarding Error Boundary caught:', error, errorInfo);
    
    // Log to monitoring service
    this.logErrorToService(error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
    
    // Auto-retry after 3 seconds for first error
    if (this.state.retryCount === 0) {
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, 3000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  logErrorToService = (error: Error, errorInfo: any) => {
    // Send error to monitoring service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      stepName: this.props.stepName,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorData);
    }
    
    // Send to monitoring endpoint
    fetch('/api/errors/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    }).catch(err => {
      console.error('Failed to log error:', err);
    });
  };

  handleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleManualRetry = () => {
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback UI if provided
      if (this.props.fallbackUI) {
        return <>{this.props.fallbackUI}</>;
      }
      
      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Oops! Something went wrong
              </h3>
              <p className="text-sm text-gray-600">
                {this.props.stepName 
                  ? `We encountered an error while loading the ${this.props.stepName} step.`
                  : 'We encountered an error during the onboarding process.'}
              </p>
              {this.state.retryCount > 0 && (
                <p className="text-xs text-gray-500">
                  Retry attempt {this.state.retryCount} of 3
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={this.handleManualRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
                variant="outline"
              >
                Refresh Page
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withOnboardingErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  stepName?: string
) {
  return (props: P) => (
    <OnboardingErrorBoundary stepName={stepName}>
      <Component {...props} />
    </OnboardingErrorBoundary>
  );
}