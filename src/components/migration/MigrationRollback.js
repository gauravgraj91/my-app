import React, { useState } from 'react';
import { 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Database,
  Trash2,
  FileText,
  Clock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { getShopProducts, updateShopProduct } from '../../firebase/shopProductService';
import { getBills, deleteBill } from '../../firebase/billService';

const MigrationRollback = ({ rollbackState, setRollbackState, addNotification }) => {
  const [confirmationStep, setConfirmationStep] = useState(0); // 0: initial, 1: confirm, 2: final confirm
  const [rollbackPreview, setRollbackPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const generateRollbackPreview = async () => {
    setIsLoadingPreview(true);
    
    try {
      // Get current state
      const products = await getShopProducts();
      const bills = await getBills();
      
      // Analyze what would be rolled back
      const productsWithBillId = products.filter(p => p.billId);
      const productsWithoutBillId = products.filter(p => !p.billId);
      
      const preview = {
        billsToDelete: bills.length,
        productsToUpdate: productsWithBillId.length,
        productsAlreadyOrphaned: productsWithoutBillId.length,
        totalProducts: products.length,
        estimatedDuration: Math.ceil((bills.length + productsWithBillId.length) / 10), // rough estimate
        risks: []
      };

      // Identify potential risks
      if (bills.length > 100) {
        preview.risks.push('Large number of bills to delete - operation may take several minutes');
      }
      
      if (productsWithBillId.length > 1000) {
        preview.risks.push('Large number of products to update - consider running during low usage');
      }
      
      if (productsWithoutBillId.length > 0) {
        preview.risks.push(`${productsWithoutBillId.length} products are already orphaned and will remain unchanged`);
      }

      setRollbackPreview(preview);
      setConfirmationStep(1);
      
    } catch (error) {
      console.error('Error generating rollback preview:', error);
      addNotification('error', `Failed to generate rollback preview: ${error.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const executeRollback = async () => {
    setRollbackState(prev => ({
      ...prev,
      status: 'running',
      result: null,
      error: null,
      progress: 0,
      currentStep: 'Initializing rollback...'
    }));

    addNotification('info', 'Starting rollback process...');

    try {
      const startTime = Date.now();
      
      // Step 1: Remove billId references from all products
      setRollbackState(prev => ({
        ...prev,
        progress: 10,
        currentStep: 'Removing bill references from products...'
      }));

      const products = await getShopProducts();
      const productsWithBillId = products.filter(p => p.billId);
      
      let updatedProducts = 0;
      let updateErrors = 0;
      
      for (let i = 0; i < productsWithBillId.length; i++) {
        const product = productsWithBillId[i];
        try {
          await updateShopProduct(product.id, {
            billId: null
            // Keep billNumber for historical reference
          });
          updatedProducts++;
          
          // Update progress
          const productProgress = Math.floor((i + 1) / productsWithBillId.length * 40);
          setRollbackState(prev => ({
            ...prev,
            progress: 10 + productProgress,
            currentStep: `Updating product ${i + 1} of ${productsWithBillId.length}...`
          }));
        } catch (error) {
          console.error(`Failed to update product ${product.id}:`, error);
          updateErrors++;
        }
      }

      // Step 2: Delete all bills
      setRollbackState(prev => ({
        ...prev,
        progress: 50,
        currentStep: 'Deleting bills...'
      }));

      const bills = await getBills();
      let deletedBills = 0;
      let deleteErrors = 0;
      
      for (let i = 0; i < bills.length; i++) {
        const bill = bills[i];
        try {
          await deleteBill(bill.id);
          deletedBills++;
          
          // Update progress
          const billProgress = Math.floor((i + 1) / bills.length * 40);
          setRollbackState(prev => ({
            ...prev,
            progress: 50 + billProgress,
            currentStep: `Deleting bill ${i + 1} of ${bills.length}...`
          }));
        } catch (error) {
          console.error(`Failed to delete bill ${bill.id}:`, error);
          deleteErrors++;
        }
      }

      setRollbackState(prev => ({
        ...prev,
        progress: 90,
        currentStep: 'Finalizing rollback...'
      }));

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      const result = {
        success: true,
        duration: `${duration.toFixed(2)}s`,
        timestamp: new Date().toISOString(),
        productsUpdated: updatedProducts,
        productUpdateErrors: updateErrors,
        billsDeleted: deletedBills,
        billDeleteErrors: deleteErrors,
        totalErrors: updateErrors + deleteErrors
      };

      setRollbackState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        currentStep: 'Rollback completed',
        result,
        available: false // Rollback no longer available after execution
      }));

      if (result.totalErrors === 0) {
        addNotification('success', `Rollback completed successfully! Updated ${updatedProducts} products and deleted ${deletedBills} bills.`);
      } else {
        addNotification('warning', `Rollback completed with ${result.totalErrors} errors. Check the results for details.`);
      }

      setConfirmationStep(0);

    } catch (error) {
      console.error('Rollback failed:', error);
      
      setRollbackState(prev => ({
        ...prev,
        status: 'failed',
        error: error.message
      }));

      addNotification('error', `Rollback failed: ${error.message}`);
      setConfirmationStep(0);
    }
  };

  const resetRollback = () => {
    setRollbackState(prev => ({
      ...prev,
      status: 'idle',
      result: null,
      error: null
    }));
    setConfirmationStep(0);
    setRollbackPreview(null);
  };

  const cancelRollback = () => {
    setConfirmationStep(0);
    setRollbackPreview(null);
  };

  if (!rollbackState.available) {
    return (
      <Card className="rollback-unavailable">
        <div className="unavailable-content">
          <Database size={48} className="text-gray-400" />
          <h3>Rollback Not Available</h3>
          <p>No migration data found. Rollback is only available after a migration has been performed.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="rollback-dashboard">
      <Card className="rollback-warning">
        <div className="warning-header">
          <AlertTriangle size={24} className="text-red-500" />
          <div>
            <h3>Migration Rollback</h3>
            <p>This will reverse the bill-wise product separation migration</p>
          </div>
        </div>
        
        <div className="warning-details">
          <h4>What will happen:</h4>
          <ul>
            <li>All bills will be permanently deleted</li>
            <li>Products will lose their bill associations (billId will be removed)</li>
            <li>Original billNumber fields will be preserved for reference</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>
      </Card>

      {confirmationStep === 0 && (
        <Card className="rollback-controls">
          <div className="controls-header">
            <h3>Rollback Control</h3>
            <p>Generate a preview to see what will be affected by the rollback</p>
          </div>
          
          <div className="controls-actions">
            <Button
              onClick={generateRollbackPreview}
              disabled={isLoadingPreview || rollbackState.status === 'running'}
              variant="secondary"
            >
              {isLoadingPreview ? (
                <>
                  <LoadingSpinner size="sm" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Generate Preview
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {confirmationStep === 1 && rollbackPreview && (
        <Card className="rollback-preview">
          <div className="preview-header">
            <FileText size={20} />
            <h3>Rollback Preview</h3>
          </div>
          
          <div className="preview-stats">
            <div className="stat-item">
              <Trash2 size={16} className="text-red-500" />
              <div>
                <span className="stat-value">{rollbackPreview.billsToDelete}</span>
                <span className="stat-label">Bills to Delete</span>
              </div>
            </div>
            <div className="stat-item">
              <Database size={16} className="text-blue-500" />
              <div>
                <span className="stat-value">{rollbackPreview.productsToUpdate}</span>
                <span className="stat-label">Products to Update</span>
              </div>
            </div>
            <div className="stat-item">
              <Clock size={16} className="text-gray-500" />
              <div>
                <span className="stat-value">~{rollbackPreview.estimatedDuration}s</span>
                <span className="stat-label">Estimated Duration</span>
              </div>
            </div>
          </div>

          {rollbackPreview.risks.length > 0 && (
            <div className="preview-risks">
              <h4>Potential Risks:</h4>
              <ul>
                {rollbackPreview.risks.map((risk, index) => (
                  <li key={index}>
                    <AlertTriangle size={14} className="text-yellow-500" />
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="preview-actions">
            <Button onClick={cancelRollback} variant="secondary">
              Cancel
            </Button>
            <Button 
              onClick={() => setConfirmationStep(2)} 
              variant="danger"
            >
              <AlertTriangle size={16} />
              Proceed with Rollback
            </Button>
          </div>
        </Card>
      )}

      {confirmationStep === 2 && (
        <Card className="rollback-final-confirm">
          <div className="final-confirm-header">
            <XCircle size={24} className="text-red-500" />
            <div>
              <h3>Final Confirmation</h3>
              <p>Are you absolutely sure you want to proceed with the rollback?</p>
            </div>
          </div>
          
          <div className="final-confirm-warning">
            <AlertTriangle size={20} className="text-red-500" />
            <div>
              <strong>This action is irreversible!</strong>
              <p>All {rollbackPreview.billsToDelete} bills will be permanently deleted and {rollbackPreview.productsToUpdate} products will lose their bill associations.</p>
            </div>
          </div>

          <div className="final-confirm-actions">
            <Button onClick={cancelRollback} variant="secondary">
              Cancel
            </Button>
            <Button 
              onClick={executeRollback}
              variant="danger"
              disabled={rollbackState.status === 'running'}
            >
              {rollbackState.status === 'running' ? (
                <>
                  <LoadingSpinner size="sm" />
                  Rolling Back...
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  Execute Rollback
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {rollbackState.status === 'running' && (
        <Card className="rollback-progress">
          <div className="progress-content">
            <LoadingSpinner />
            <h3>Rollback in Progress</h3>
            <p>Removing bill associations and deleting bills...</p>
            
            {rollbackState.progress !== undefined && (
              <div className="progress-details">
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${rollbackState.progress}%` }}
                    />
                  </div>
                  <span className="progress-percentage">{rollbackState.progress}%</span>
                </div>
                
                {rollbackState.currentStep && (
                  <div className="current-step">
                    <LoadingSpinner size="xs" />
                    <span>{rollbackState.currentStep}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="progress-warning">
              <AlertTriangle size={16} className="text-yellow-500" />
              <span>Do not close this window until the rollback is complete</span>
            </div>
          </div>
        </Card>
      )}

      {rollbackState.status === 'completed' && rollbackState.result && (
        <Card className="rollback-result">
          <div className="result-header">
            <CheckCircle size={24} className="text-green-500" />
            <div>
              <h3>Rollback Completed</h3>
              <p>Migration has been successfully rolled back</p>
            </div>
          </div>
          
          <div className="result-stats">
            <div className="stat-item">
              <span className="stat-value">{rollbackState.result.billsDeleted}</span>
              <span className="stat-label">Bills Deleted</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{rollbackState.result.productsUpdated}</span>
              <span className="stat-label">Products Updated</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{rollbackState.result.duration}</span>
              <span className="stat-label">Duration</span>
            </div>
            <div className="stat-item">
              <span className={`stat-value ${rollbackState.result.totalErrors > 0 ? 'error' : 'success'}`}>
                {rollbackState.result.totalErrors}
              </span>
              <span className="stat-label">Errors</span>
            </div>
          </div>

          {rollbackState.result.totalErrors > 0 && (
            <div className="result-errors">
              <AlertTriangle size={16} className="text-yellow-500" />
              <span>
                Rollback completed with {rollbackState.result.totalErrors} errors. 
                Some items may need manual cleanup.
              </span>
            </div>
          )}

          <div className="result-actions">
            <Button onClick={resetRollback} variant="primary">
              Close
            </Button>
          </div>
        </Card>
      )}

      {rollbackState.status === 'failed' && (
        <Card className="rollback-error">
          <div className="error-content">
            <XCircle size={48} className="text-red-500" />
            <h3>Rollback Failed</h3>
            <p>{rollbackState.error}</p>
            <div className="error-actions">
              <Button onClick={resetRollback} variant="secondary">
                Close
              </Button>
              <Button onClick={() => setConfirmationStep(1)} variant="primary">
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MigrationRollback;