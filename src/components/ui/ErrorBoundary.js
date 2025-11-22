import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from './Button';
import Card from './Card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report error to monitoring service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default fallback UI
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          padding: '20px'
        }}>
          <Card style={{ maxWidth: '500px', textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <AlertTriangle 
                size={48} 
                color="#ef4444" 
                style={{ margin: '0 auto 16px' }}
              />
              <h2 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '20px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {this.props.title || 'Something went wrong'}
              </h2>
              <p style={{ 
                margin: '0 0 20px 0', 
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                {this.props.message || 
                 'An unexpected error occurred while loading this component. Please try refreshing the page or contact support if the problem persists.'}
              </p>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Button
                variant="primary"
                icon={<RefreshCw size={16} />}
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
              
              <Button
                variant="secondary"
                icon={<Home size={16} />}
                onClick={this.handleGoHome}
              >
                Go Home
              </Button>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ 
                marginTop: '20px', 
                textAlign: 'left',
                background: '#f9fafb',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{ 
                  fontSize: '12px', 
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {this.state.retryCount > 0 && (
              <div style={{
                marginTop: '12px',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                Retry attempts: {this.state.retryCount}
              </div>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;