import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Play } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const MigrationProgressIndicator = ({ 
  status, 
  progress, 
  currentStep, 
  result, 
  error, 
  startTime, 
  endTime 
}) => {
  const migrationSteps = [
    { id: 1, name: 'Grouping products by bill number', minProgress: 0, maxProgress: 20 },
    { id: 2, name: 'Creating bills from product groups', minProgress: 20, maxProgress: 40 },
    { id: 3, name: 'Updating products with bill references', minProgress: 40, maxProgress: 60 },
    { id: 4, name: 'Handling orphaned products', minProgress: 60, maxProgress: 80 },
    { id: 5, name: 'Validating data integrity', minProgress: 80, maxProgress: 100 }
  ];

  const getCurrentStepIndex = () => {
    return migrationSteps.findIndex(step => 
      progress >= step.minProgress && progress < step.maxProgress
    );
  };

  const currentStepIndex = getCurrentStepIndex();
  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <Play size={20} className="text-gray-500" />;
      case 'running':
        return <LoadingSpinner size="sm" />;
      case 'completed':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'failed':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return <Clock size={20} className="text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready to start migration';
      case 'running':
        return 'Migration in progress...';
      case 'completed':
        return 'Migration completed successfully';
      case 'failed':
        return 'Migration failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDuration = () => {
    if (!startTime) return null;
    
    const end = endTime || new Date();
    const duration = end - startTime;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <div className="migration-progress">
      <div className="progress-header">
        <div className="progress-status">
          {getStatusIcon()}
          <span className={`status-text ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        
        {startTime && (
          <div className="progress-timing">
            <Clock size={16} />
            <span>
              Started: {startTime.toLocaleTimeString()}
              {endTime && ` • Duration: ${formatDuration()}`}
            </span>
          </div>
        )}
      </div>

      {status === 'running' && (
        <div className="progress-details">
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-percentage">{progress}%</span>
          </div>
          
          {currentStep && (
            <div className="current-step">
              <LoadingSpinner size="xs" />
              <span>{currentStep}</span>
            </div>
          )}

          {/* Step indicators */}
          <div className="step-indicators">
            {migrationSteps.map((step, index) => (
              <div 
                key={step.id} 
                className={`step-indicator ${
                  index < currentStepIndex ? 'completed' : 
                  index === currentStepIndex ? 'active' : 'pending'
                }`}
              >
                <div className="step-number">
                  {index < currentStepIndex ? (
                    <CheckCircle size={16} />
                  ) : index === currentStepIndex ? (
                    <LoadingSpinner size="xs" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <div className="step-info">
                  <span className="step-name">{step.name}</span>
                  <span className="step-progress">
                    {index < currentStepIndex ? 'Completed' : 
                     index === currentStepIndex ? 'In Progress' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'failed' && error && (
        <div className="error-details">
          <AlertTriangle size={16} className="text-red-500" />
          <span className="error-message">{error}</span>
        </div>
      )}

      {status === 'completed' && result && (
        <div className="completion-details">
          <div className="completion-stats">
            <div className="stat-item">
              <span className="stat-value">{result.totalBillsCreated}</span>
              <span className="stat-label">Bills Created</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{result.totalProductsUpdated}</span>
              <span className="stat-label">Products Updated</span>
            </div>
            <div className="stat-item">
              <span className={`stat-value ${result.totalErrors > 0 ? 'error' : 'success'}`}>
                {result.totalErrors}
              </span>
              <span className="stat-label">Errors</span>
            </div>
            <div className="stat-item">
              <span className={`stat-value ${result.dataIntegrityValid ? 'success' : 'warning'}`}>
                {result.dataIntegrityValid ? 'Valid' : 'Issues'}
              </span>
              <span className="stat-label">Data Integrity</span>
            </div>
          </div>

          {result.totalErrors > 0 && (
            <div className="error-summary">
              <AlertTriangle size={16} className="text-yellow-500" />
              <span>
                Migration completed with {result.totalErrors} errors. 
                Check the detailed results for more information.
              </span>
            </div>
          )}

          {!result.dataIntegrityValid && (
            <div className="validation-warning">
              <AlertTriangle size={16} className="text-yellow-500" />
              <span>
                Data integrity issues detected. 
                Please run validation to see details and fix issues.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MigrationProgressIndicator;