import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      errorCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Track error count to prevent infinite loops
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Try to report error to backend (don't let this fail)
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(() => {
        // Silently fail - don't cause another error
      });
    } catch (e) {
      // Absolutely don't let logging break things
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorCount: 0 });
    // Optionally reload the page
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Prevent infinite error loops
      if (this.state.errorCount > 3) {
        return (
          <div className="min-h-[400px] flex items-center justify-center p-8">
            <div className="bg-red-900/20 backdrop-blur-sm rounded-xl p-8 border border-red-800/50 max-w-2xl w-full">
              <div className="flex items-start space-x-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-red-400 mb-2">
                    Critical Error - Too Many Failures
                  </h2>
                  <p className="text-gray-300 mb-4">
                    Multiple errors detected. The page needs to be refreshed to continue.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="bg-red-900/20 backdrop-blur-sm rounded-xl p-8 border border-red-800/50 max-w-2xl w-full">
            <div className="flex items-start space-x-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-red-400 mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-300 mb-4">
                  {this.props.fallbackMessage || 'An unexpected error occurred. Please try refreshing the page.'}
                </p>
                
                {/* Show error details in development */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                      Error details (development only)
                    </summary>
                    <pre className="mt-2 text-xs text-gray-500 overflow-auto bg-gray-900/50 p-3 rounded">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
                
                <div className="flex space-x-3">
                  <button
                    onClick={this.handleReset}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;