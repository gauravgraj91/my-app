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
        background: 'color-mix(in srgb, var(--card) 90%, transparent)',
        zIndex: 10,
        minHeight: children ? 'auto' : '200px'
      }}>
        <LoadingSpinner size={32} />
        <div style={{
          marginTop: '12px',
          fontSize: '14px',
          color: 'var(--muted-foreground)',
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
        <Package size={32} color="var(--border)" />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          <LoadingSpinner size={16} />
        </div>
      </div>
      <div style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>
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
              background: 'var(--secondary)',
              borderRadius: '4px',
              marginBottom: '8px',
              animation: 'pulse 2s infinite'
            }} />
            <div style={{
              height: '14px',
              width: '200px',
              background: 'var(--secondary)',
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
                  background: 'var(--secondary)',
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
                background: 'var(--secondary)',
                borderRadius: '4px',
                marginBottom: '8px',
                animation: 'pulse 2s infinite'
              }} />
              <div style={{
                height: '18px',
                width: '100px',
                background: 'var(--secondary)',
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
      { icon: Package, color: 'var(--primary)' },
      { icon: DollarSign, color: 'var(--success)' },
      { icon: TrendingUp, color: 'var(--warning)' },
      { icon: Calendar, color: 'var(--primary)' }
    ].map((item, index) => (
      <Card key={index} padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: `color-mix(in srgb, ${item.color} 12%, transparent)`,
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
              background: 'var(--secondary)',
              borderRadius: '4px',
              marginBottom: '4px',
              animation: 'pulse 2s infinite'
            }} />
            <div style={{
              height: '14px',
              width: '60px',
              background: 'var(--secondary)',
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
        color="var(--primary)"
        style={{ animation: 'spin 1s linear infinite' }}
      />
    </div>

    <div>
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: 'var(--foreground)',
        marginBottom: '4px'
      }}>
        {operation}
        {billNumber && ` Bill ${billNumber}`}
      </div>

      <div style={{
        fontSize: '14px',
        color: 'var(--muted-foreground)'
      }}>
        Please wait while we process your request...
      </div>
    </div>

    {progress !== undefined && (
      <div style={{ width: '200px' }}>
        <div style={{
          width: '100%',
          height: '4px',
          background: 'var(--border)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--primary)',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{
          fontSize: '12px',
          color: 'var(--muted-foreground)',
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
        color="var(--primary)"
        style={{ animation: 'spin 1s linear infinite' }}
      />
    </div>

    <div>
      <div style={{
        fontSize: '18px',
        fontWeight: '600',
        color: 'var(--foreground)',
        marginBottom: '8px'
      }}>
        {operation} {total} Bills
      </div>

      {current && (
        <div style={{
          fontSize: '14px',
          color: 'var(--muted-foreground)',
          marginBottom: '4px'
        }}>
          Currently processing: {current}
        </div>
      )}

      <div style={{
        fontSize: '14px',
        color: 'var(--muted-foreground)'
      }}>
        {completed} of {total} completed
      </div>
    </div>

    <div style={{ width: '300px' }}>
      <div style={{
        width: '100%',
        height: '6px',
        background: 'var(--border)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${(completed / total) * 100}%`,
          height: '100%',
          background: 'var(--success)',
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <div style={{
        fontSize: '12px',
        color: 'var(--muted-foreground)',
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