import React from 'react';
import { Loader2, Package, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import Card from './Card';

// Generic loading overlay
export const LoadingOverlay = ({
  isLoading,
  message = 'Loading...',
  children,
  blur = true
}) => {
  if (!isLoading) return children;

  return (
    <div style={{ position: 'relative' }}>
      {children && (
        <div style={{
          filter: blur ? 'blur(2px)' : 'none',
          opacity: 0.5,
          pointerEvents: 'none'
        }}>
          {children}
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        zIndex: 10,
        minHeight: children ? 'auto' : '200px'
      }}>
        <LoadingSpinner size={32} />
        <div style={{
          marginTop: '12px',
          fontSize: '14px',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          {message}
        </div>
      </div>
    </div>
  );
};

// Bill-specific loading states
export const BillLoadingCard = ({ message = 'Loading bill...' }) => (
  <Card style={{ padding: '40px', textAlign: 'center' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative' }}>
        <Package size={32} color="#e5e7eb" />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          <LoadingSpinner size={16} />
        </div>
      </div>
      <div style={{ color: '#6b7280', fontSize: '14px' }}>
        {message}
      </div>
    </div>
  </Card>
);

export const BillsListLoading = ({ count = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Bill info skeleton */}
          <div style={{ flex: 1 }}>
            <div style={{
              height: '20px',
              width: '120px',
              background: '#f3f4f6',
              borderRadius: '4px',
              marginBottom: '8px',
              animation: 'pulse 2s infinite'
            }} />
            <div style={{
              height: '14px',
              width: '200px',
              background: '#f3f4f6',
              borderRadius: '4px',
              animation: 'pulse 2s infinite'
            }} />
          </div>

          {/* Action buttons skeleton */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: 4 }).map((_, btnIndex) => (
              <div
                key={btnIndex}
                style={{
                  width: '32px',
                  height: '32px',
                  background: '#f3f4f6',
                  borderRadius: '4px',
                  animation: 'pulse 2s infinite'
                }}
              />
            ))}
          </div>
        </div>

        {/* Summary skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginTop: '20px'
        }}>
          {Array.from({ length: 4 }).map((_, summaryIndex) => (
            <div key={summaryIndex}>
              <div style={{
                height: '12px',
                width: '80px',
                background: '#f3f4f6',
                borderRadius: '4px',
                marginBottom: '8px',
                animation: 'pulse 2s infinite'
              }} />
              <div style={{
                height: '18px',
                width: '100px',
                background: '#f3f4f6',
                borderRadius: '4px',
                animation: 'pulse 2s infinite'
              }} />
            </div>
          ))}
        </div>
      </Card>
    ))}

    <style jsx>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `}</style>
  </div>
);

export const AnalyticsLoading = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  }}>
    {[
      { icon: Package, color: '#3b82f6' },
      { icon: DollarSign, color: '#10b981' },
      { icon: TrendingUp, color: '#f59e0b' },
      { icon: Calendar, color: '#8b5cf6' }
    ].map((item, index) => (
      <Card key={index} padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: `${item.color}20`,
            borderRadius: '12px',
            padding: '12px',
            position: 'relative'
          }}>
            <item.icon size={20} color={item.color} style={{ opacity: 0.3 }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}>
              <LoadingSpinner size={12} color={item.color} />
            </div>
          </div>
          <div>
            <div style={{
              height: '24px',
              width: '80px',
              background: '#f3f4f6',
              borderRadius: '4px',
              marginBottom: '4px',
              animation: 'pulse 2s infinite'
            }} />
            <div style={{
              height: '14px',
              width: '60px',
              background: '#f3f4f6',
              borderRadius: '4px',
              animation: 'pulse 2s infinite'
            }} />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

// Operation-specific loading states
export const BillOperationLoading = ({
  operation = 'Processing',
  billNumber,
  progress
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '40px',
    textAlign: 'center'
  }}>
    <div style={{ position: 'relative' }}>
      <Loader2
        size={40}
        color="#3b82f6"
        style={{ animation: 'spin 1s linear infinite' }}
      />
    </div>

    <div>
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '4px'
      }}>
        {operation}
        {billNumber && ` Bill ${billNumber}`}
      </div>

      <div style={{
        fontSize: '14px',
        color: '#6b7280'
      }}>
        Please wait while we process your request...
      </div>
    </div>

    {progress !== undefined && (
      <div style={{ width: '200px' }}>
        <div style={{
          width: '100%',
          height: '4px',
          background: '#e5e7eb',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '4px'
        }}>
          {Math.round(progress)}% complete
        </div>
      </div>
    )}
  </div>
);

// Bulk operation loading
export const BulkOperationLoading = ({
  operation = 'Processing',
  total,
  completed = 0,
  current
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '40px',
    textAlign: 'center'
  }}>
    <div style={{ position: 'relative' }}>
      <Loader2
        size={48}
        color="#3b82f6"
        style={{ animation: 'spin 1s linear infinite' }}
      />
    </div>

    <div>
      <div style={{
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '8px'
      }}>
        {operation} {total} Bills
      </div>

      {current && (
        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '4px'
        }}>
          Currently processing: {current}
        </div>
      )}

      <div style={{
        fontSize: '14px',
        color: '#6b7280'
      }}>
        {completed} of {total} completed
      </div>
    </div>

    <div style={{ width: '300px' }}>
      <div style={{
        width: '100%',
        height: '6px',
        background: '#e5e7eb',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${(completed / total) * 100}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #10b981, #059669)',
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        marginTop: '6px'
      }}>
        {Math.round((completed / total) * 100)}% complete
      </div>
    </div>
  </div>
);

const LoadingStates = {
  LoadingOverlay,
  BillLoadingCard,
  BillsListLoading,
  AnalyticsLoading,
  BillOperationLoading,
  BulkOperationLoading
};

export default LoadingStates;