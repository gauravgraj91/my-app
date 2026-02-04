import React, { useState, useEffect, createContext, useContext } from 'react';
import { CheckCircle, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

// Notification Context
const NotificationContext = createContext();

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Custom hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification item component
const NotificationItem = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-remove after duration
    if (notification.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.duration]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300); // Match exit animation duration
  };

  const getIcon = () => {
    switch (notification.type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return <CheckCircle size={20} />;
      case NOTIFICATION_TYPES.ERROR:
        return <AlertCircle size={20} />;
      case NOTIFICATION_TYPES.WARNING:
        return <AlertTriangle size={20} />;
      case NOTIFICATION_TYPES.INFO:
        return <Info size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getStyles = () => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      marginBottom: '12px',
      minWidth: '320px',
      maxWidth: '500px',
      position: 'relative',
      transform: isRemoving
        ? 'translateX(100%)'
        : isVisible
          ? 'translateX(0)'
          : 'translateX(100%)',
      opacity: isRemoving ? 0 : isVisible ? 1 : 0,
      transition: 'all 0.3s ease-in-out',
      cursor: 'pointer'
    };

    const typeStyles = {
      [NOTIFICATION_TYPES.SUCCESS]: {
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: 'white'
      },
      [NOTIFICATION_TYPES.ERROR]: {
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: 'white'
      },
      [NOTIFICATION_TYPES.WARNING]: {
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: 'white'
      },
      [NOTIFICATION_TYPES.INFO]: {
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        color: 'white'
      }
    };

    return { ...baseStyles, ...typeStyles[notification.type] };
  };

  return (
    <div
      style={getStyles()}
      onClick={handleRemove}
      role="alert"
      aria-live="polite"
    >
      <div style={{ flexShrink: 0 }}>
        {getIcon()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {notification.title && (
          <div style={{
            fontWeight: '600',
            fontSize: '14px',
            marginBottom: '4px'
          }}>
            {notification.title}
          </div>
        )}
        <div style={{
          fontSize: '14px',
          lineHeight: '1.4',
          wordBreak: 'break-word'
        }}>
          {notification.message}
        </div>

        {notification.action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              notification.action.onClick();
              handleRemove();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              marginTop: '8px',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            {notification.action.label}
          </button>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'currentColor',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          opacity: 0.7,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = 1;
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = 0.7;
        }}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Notification container component
export const NotificationContainer = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
      aria-live="polite"
      aria-label="Notifications"
    >
      <div style={{ pointerEvents: 'auto' }}>
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
};

// Notification Provider component
export const NotificationProvider = ({ children, maxNotifications = 5 }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: NOTIFICATION_TYPES.INFO,
      duration: 5000, // 5 seconds default
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Limit number of notifications
      return updated.slice(0, maxNotifications);
    });

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Convenience methods
  const showSuccess = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      message,
      ...options
    });
  };

  const showError = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      message,
      duration: 8000, // Longer duration for errors
      ...options
    });
  };

  const showWarning = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      message,
      duration: 6000,
      ...options
    });
  };

  const showInfo = (message, options = {}) => {
    return addNotification({
      type: NOTIFICATION_TYPES.INFO,
      message,
      ...options
    });
  };

  const contextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;