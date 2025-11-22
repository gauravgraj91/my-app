import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, Clock, RefreshCw } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Card from '../ui/Card';

const ConflictResolutionModal = ({ 
  conflicts = [], 
  onAcknowledge, 
  onClearAll, 
  isOpen, 
  onClose 
}) => {
  const [selectedConflicts, setSelectedConflicts] = useState(new Set());

  useEffect(() => {
    // Listen for real-time conflict events
    const handleConflict = (event) => {
      console.log('New conflict detected:', event.detail);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('realtimeConflict', handleConflict);
      return () => window.removeEventListener('realtimeConflict', handleConflict);
    }
  }, []);

  const handleSelectConflict = (index) => {
    const newSelected = new Set(selectedConflicts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedConflicts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedConflicts.size === conflicts.length) {
      setSelectedConflicts(new Set());
    } else {
      setSelectedConflicts(new Set(conflicts.map((_, index) => index)));
    }
  };

  const handleAcknowledgeSelected = () => {
    selectedConflicts.forEach(index => {
      onAcknowledge(index);
    });
    setSelectedConflicts(new Set());
  };

  const getResolutionIcon = (resolution) => {
    switch (resolution) {
      case 'local-wins':
        return <Check className="text-green-600" size={16} />;
      case 'server-wins':
        return <RefreshCw className="text-blue-600" size={16} />;
      case 'server-wins-error':
        return <AlertTriangle className="text-red-600" size={16} />;
      default:
        return <Clock className="text-gray-600" size={16} />;
    }
  };

  const getResolutionColor = (resolution) => {
    switch (resolution) {
      case 'local-wins':
        return 'bg-green-50 border-green-200';
      case 'server-wins':
        return 'bg-blue-50 border-blue-200';
      case 'server-wins-error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen || conflicts.length === 0) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conflict Resolution"
      size="large"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-yellow-600" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-800">
                Data Conflicts Detected
              </h3>
              <p className="text-sm text-yellow-700">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} occurred due to concurrent updates
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="small"
              onClick={handleSelectAll}
            >
              {selectedConflicts.size === conflicts.length ? 'Deselect All' : 'Select All'}
            </Button>
            {selectedConflicts.size > 0 && (
              <Button
                variant="primary"
                size="small"
                onClick={handleAcknowledgeSelected}
              >
                Acknowledge Selected ({selectedConflicts.size})
              </Button>
            )}
          </div>
        </div>

        {/* Conflicts List */}
        <div className="max-h-96 overflow-y-auto space-y-3">
          {conflicts.map((conflict, index) => (
            <Card 
              key={index}
              className={`p-4 border-l-4 ${getResolutionColor(conflict.resolution.resolution)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedConflicts.has(index)}
                    onChange={() => handleSelectConflict(index)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getResolutionIcon(conflict.resolution.resolution)}
                      <span className="font-semibold text-gray-800">
                        {conflict.resolution.resolution === 'local-wins' ? 'Local Changes Kept' :
                         conflict.resolution.resolution === 'server-wins' ? 'Server Changes Applied' :
                         'Server Changes Applied (Error Recovery)'}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {formatTimestamp(conflict.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">
                      {conflict.resolution.message}
                    </p>
                    
                    {/* Conflict Details */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Conflict Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Entity:</span>
                          <span className="ml-2 text-gray-600">
                            {conflict.resolution.resolved.billNumber || 
                             conflict.resolution.resolved.productName || 
                             conflict.resolution.resolved.id}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Resolution:</span>
                          <span className="ml-2 text-gray-600">
                            {conflict.resolution.resolution.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => onAcknowledge(index)}
                  className="ml-3"
                >
                  <Check size={14} />
                  Acknowledge
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Conflicts are automatically resolved using timestamp-based rules.
            <br />
            Review the resolutions and acknowledge to dismiss these notifications.
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onClearAll();
                onClose();
              }}
            >
              Acknowledge All & Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConflictResolutionModal;