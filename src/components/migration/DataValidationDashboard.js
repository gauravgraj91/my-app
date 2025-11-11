import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Database,
  Users,
  Package
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const DataValidationDashboard = ({ validationState, onRunValidation, onFixIssues }) => {
  const [expandedIssues, setExpandedIssues] = useState(new Set());
  const [expandedWarnings, setExpandedWarnings] = useState(new Set());

  const toggleIssueExpansion = (index) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIssues(newExpanded);
  };

  const toggleWarningExpansion = (index) => {
    const newExpanded = new Set(expandedWarnings);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedWarnings(newExpanded);
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case 'missing_bill_id':
        return <Package size={16} className="text-red-500" />;
      case 'invalid_bill_id':
        return <Database size={16} className="text-red-500" />;
      case 'bill_total_mismatch':
        return <FileText size={16} className="text-red-500" />;
      case 'duplicate_bill_numbers':
        return <Users size={16} className="text-red-500" />;
      default:
        return <XCircle size={16} className="text-red-500" />;
    }
  };

  const getIssueDescription = (issue) => {
    switch (issue.type) {
      case 'missing_bill_id':
        return 'Products without bill ID references need to be assigned to bills';
      case 'invalid_bill_id':
        return 'Products reference bills that no longer exist in the database';
      case 'bill_total_mismatch':
        return 'Bill totals do not match the sum of their associated products';
      case 'duplicate_bill_numbers':
        return 'Multiple bills have the same bill number, which should be unique';
      default:
        return 'Unknown validation issue';
    }
  };

  const getIssueRecommendation = (issue) => {
    switch (issue.type) {
      case 'missing_bill_id':
        return 'Run migration again or manually assign products to bills';
      case 'invalid_bill_id':
        return 'Remove invalid references or recreate missing bills';
      case 'bill_total_mismatch':
        return 'Recalculate bill totals from associated products';
      case 'duplicate_bill_numbers':
        return 'Update bill numbers to ensure uniqueness';
      default:
        return 'Contact support for assistance';
    }
  };

  const getIssueSeverity = (type) => {
    switch (type) {
      case 'missing_bill_id':
      case 'invalid_bill_id':
        return 'high';
      case 'bill_total_mismatch':
      case 'duplicate_bill_numbers':
        return 'medium';
      default:
        return 'low';
    }
  };

  const canFixIssue = (type) => {
    return ['bill_total_mismatch', 'invalid_bill_id'].includes(type);
  };

  if (validationState.status === 'idle') {
    return (
      <Card className="validation-placeholder">
        <div className="placeholder-content">
          <Database size={48} className="text-gray-400" />
          <h3>Data Validation</h3>
          <p>Run validation to check data integrity and identify potential issues</p>
          <Button onClick={onRunValidation} variant="primary">
            <CheckCircle size={16} />
            Run Validation
          </Button>
        </div>
      </Card>
    );
  }

  if (validationState.status === 'running') {
    return (
      <Card className="validation-loading">
        <div className="loading-content">
          <LoadingSpinner />
          <h3>Running Validation</h3>
          <p>Checking data integrity and relationships...</p>
        </div>
      </Card>
    );
  }

  if (validationState.status === 'failed') {
    return (
      <Card className="validation-error">
        <div className="error-content">
          <XCircle size={48} className="text-red-500" />
          <h3>Validation Failed</h3>
          <p>{validationState.error}</p>
          <Button onClick={onRunValidation} variant="primary">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  const { result } = validationState;
  if (!result) return null;

  return (
    <div className="validation-dashboard">
      {/* Validation Summary */}
      <Card className="validation-summary">
        <div className="summary-header">
          <div className="summary-status">
            {result.isValid ? (
              <CheckCircle size={24} className="text-green-500" />
            ) : (
              <AlertTriangle size={24} className="text-yellow-500" />
            )}
            <div>
              <h3>
                {result.isValid ? 'Data Validation Passed' : 'Data Validation Issues Found'}
              </h3>
              <p>
                {result.isValid 
                  ? 'All data integrity checks passed successfully'
                  : `Found ${result.issues.length} issues and ${result.warnings.length} warnings`
                }
              </p>
            </div>
          </div>
          
          <div className="summary-actions">
            <Button onClick={onRunValidation} variant="secondary">
              <CheckCircle size={16} />
              Re-run Validation
            </Button>
            {!result.isValid && (
              <Button onClick={onFixIssues} variant="primary">
                Fix Issues
              </Button>
            )}
          </div>
        </div>

        <div className="summary-stats">
          <div className="stat-card">
            <Database size={20} />
            <div>
              <span className="stat-value">{result.summary.totalProducts}</span>
              <span className="stat-label">Total Products</span>
            </div>
          </div>
          <div className="stat-card">
            <FileText size={20} />
            <div>
              <span className="stat-value">{result.summary.totalBills}</span>
              <span className="stat-label">Total Bills</span>
            </div>
          </div>
          <div className="stat-card">
            <CheckCircle size={20} className="text-green-500" />
            <div>
              <span className="stat-value">{result.summary.productsWithBillId}</span>
              <span className="stat-label">Products with Bill ID</span>
            </div>
          </div>
          <div className="stat-card">
            <XCircle size={20} className="text-red-500" />
            <div>
              <span className="stat-value">{result.summary.productsWithoutBillId}</span>
              <span className="stat-label">Products without Bill ID</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Issues */}
      {result.issues && result.issues.length > 0 && (
        <Card className="validation-issues">
          <div className="issues-header">
            <XCircle size={20} className="text-red-500" />
            <h3>Issues ({result.issues.length})</h3>
          </div>
          
          <div className="issues-list">
            {result.issues.map((issue, index) => (
              <div key={index} className={`issue-item severity-${getIssueSeverity(issue.type)}`}>
                <div 
                  className="issue-header"
                  onClick={() => toggleIssueExpansion(index)}
                >
                  <div className="issue-info">
                    {getIssueIcon(issue.type)}
                    <div>
                      <h4>{issue.message}</h4>
                      <p>{getIssueDescription(issue)}</p>
                      <p className="issue-recommendation">
                        <strong>Recommendation:</strong> {getIssueRecommendation(issue)}
                      </p>
                    </div>
                  </div>
                  <div className="issue-actions">
                    <span className={`severity-badge severity-${getIssueSeverity(issue.type)}`}>
                      {getIssueSeverity(issue.type)}
                    </span>
                    {canFixIssue(issue.type) && (
                      <span className="fixable-badge">Auto-fixable</span>
                    )}
                    {expandedIssues.has(index) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                </div>
                
                {expandedIssues.has(index) && (
                  <div className="issue-details">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">{issue.type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Count:</span>
                        <span className="detail-value">{issue.count}</span>
                      </div>
                      {issue.productIds && (
                        <div className="detail-item">
                          <span className="detail-label">Affected Products:</span>
                          <span className="detail-value">
                            {issue.productIds.length > 5 
                              ? `${issue.productIds.slice(0, 5).join(', ')}... (+${issue.productIds.length - 5} more)`
                              : issue.productIds.join(', ')
                            }
                          </span>
                        </div>
                      )}
                      {issue.mismatches && (
                        <div className="detail-item full-width">
                          <span className="detail-label">Mismatches:</span>
                          <div className="mismatch-list">
                            {issue.mismatches.slice(0, 3).map((mismatch, i) => (
                              <div key={i} className="mismatch-item">
                                <span>Bill {mismatch.billNumber} ({mismatch.field}): </span>
                                <span className="expected">Expected: {mismatch.expected}</span>
                                <span className="actual">Actual: {mismatch.actual}</span>
                              </div>
                            ))}
                            {issue.mismatches.length > 3 && (
                              <div className="mismatch-more">
                                +{issue.mismatches.length - 3} more mismatches
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <Card className="validation-warnings">
          <div className="warnings-header">
            <AlertTriangle size={20} className="text-yellow-500" />
            <h3>Warnings ({result.warnings.length})</h3>
          </div>
          
          <div className="warnings-list">
            {result.warnings.map((warning, index) => (
              <div key={index} className="warning-item">
                <div 
                  className="warning-header"
                  onClick={() => toggleWarningExpansion(index)}
                >
                  <div className="warning-info">
                    <Info size={16} className="text-yellow-500" />
                    <div>
                      <h4>{warning.message}</h4>
                    </div>
                  </div>
                  <div className="warning-actions">
                    {expandedWarnings.has(index) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                </div>
                
                {expandedWarnings.has(index) && (
                  <div className="warning-details">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">{warning.type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Count:</span>
                        <span className="detail-value">{warning.count}</span>
                      </div>
                      {warning.billIds && (
                        <div className="detail-item">
                          <span className="detail-label">Affected Bills:</span>
                          <span className="detail-value">
                            {warning.billIds.length > 5 
                              ? `${warning.billIds.slice(0, 5).join(', ')}... (+${warning.billIds.length - 5} more)`
                              : warning.billIds.join(', ')
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Success State */}
      {result.isValid && (
        <Card className="validation-success">
          <div className="success-content">
            <CheckCircle size={48} className="text-green-500" />
            <h3>All Validation Checks Passed</h3>
            <p>Your data is consistent and all relationships are valid.</p>
            <div className="success-details">
              <div className="success-stat">
                <span className="stat-value">{result.summary.productsWithBillId}</span>
                <span className="stat-label">Products properly linked to bills</span>
              </div>
              <div className="success-stat">
                <span className="stat-value">{result.summary.totalBills}</span>
                <span className="stat-label">Bills with accurate totals</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DataValidationDashboard;