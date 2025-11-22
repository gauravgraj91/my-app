import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Play, 
  Pause, 
  RotateCcw,
  FileText,
  BarChart3,
  Settings
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { NotificationSystem } from '../ui/NotificationSystem';
import MigrationService from '../../firebase/migrationService';
import MigrationProgressIndicator from './MigrationProgressIndicator';
import DataValidationDashboard from './DataValidationDashboard';
import MigrationRollback from './MigrationRollback';
import './Migration.css';

const MigrationDashboard = () => {
  const [migrationState, setMigrationState] = useState({
    status: 'idle', // idle, running, completed, failed, validating
    progress: 0,
    currentStep: '',
    result: null,
    error: null,
    startTime: null,
    endTime: null
  });

  const [validationState, setValidationState] = useState({
    status: 'idle', // idle, running, completed, failed
    result: null,
    error: null
  });

  const [rollbackState, setRollbackState] = useState({
    available: false,
    status: 'idle', // idle, running, completed, failed
    result: null,
    error: null
  });

  const [activeTab, setActiveTab] = useState('migration');
  const [notifications, setNotifications] = useState([]);

  // Check if migration has been run before
  useEffect(() => {
    checkMigrationHistory();
  }, []);

  const checkMigrationHistory = async () => {
    try {
      // Check if there are any bills in the system (indicates migration was run)
      const { getBills } = await import('../../firebase/billService');
      const bills = await getBills();
      
      if (bills.length > 0) {
        setRollbackState(prev => ({ ...prev, available: true }));
      }
    } catch (error) {
      console.error('Error checking migration history:', error);
    }
  };

  const addNotification = (type, message) => {
    const notification = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const startMigration = async () => {
    setMigrationState({
      status: 'running',
      progress: 0,
      currentStep: 'Initializing migration...',
      result: null,
      error: null,
      startTime: new Date(),
      endTime: null
    });

    addNotification('info', 'Migration started');

    try {
      // Step 1: Group products by bill number
      setMigrationState(prev => ({
        ...prev,
        progress: 10,
        currentStep: 'Grouping products by bill number...'
      }));

      const groupingResult = await MigrationService.groupProductsByBillNumber();
      
      // Step 2: Create bills from groups
      setMigrationState(prev => ({
        ...prev,
        progress: 30,
        currentStep: 'Creating bills from product groups...'
      }));

      const billCreationResult = await MigrationService.createBillsFromGroups(
        groupingResult.groupedProducts
      );

      // Step 3: Update products with bill references
      setMigrationState(prev => ({
        ...prev,
        progress: 50,
        currentStep: 'Updating products with bill references...'
      }));

      const productUpdateResult = await MigrationService.updateProductsWithBillReferences(
        billCreationResult.createdBills,
        groupingResult.groupedProducts
      );

      // Step 4: Handle orphaned products
      setMigrationState(prev => ({
        ...prev,
        progress: 70,
        currentStep: 'Handling orphaned products...'
      }));

      const orphanHandlingResult = await MigrationService.handleOrphanedProducts(
        groupingResult.orphanedProducts
      );

      // Step 5: Validate data integrity
      setMigrationState(prev => ({
        ...prev,
        progress: 90,
        currentStep: 'Validating data integrity...'
      }));

      const validationResult = await MigrationService.validateDataIntegrity();

      // Complete migration
      const endTime = new Date();
      const duration = endTime - migrationState.startTime;

      const migrationSummary = {
        success: true,
        duration: `${(duration / 1000).toFixed(2)}s`,
        timestamp: endTime.toISOString(),
        
        // Input data
        totalProductsProcessed: groupingResult.totalProducts,
        billGroupsFound: groupingResult.groupCount,
        orphanedProductsFound: groupingResult.orphanedProducts.length,
        
        // Bills created
        billsCreatedFromGroups: billCreationResult.successCount,
        billsCreatedForOrphans: orphanHandlingResult.successCount,
        totalBillsCreated: billCreationResult.successCount + orphanHandlingResult.successCount,
        
        // Products updated
        productsUpdatedFromGroups: productUpdateResult.successCount,
        productsUpdatedFromOrphans: orphanHandlingResult.updateResults.length,
        totalProductsUpdated: productUpdateResult.successCount + orphanHandlingResult.updateResults.length,
        
        // Errors
        billCreationErrors: billCreationResult.errorCount,
        productUpdateErrors: productUpdateResult.errorCount,
        orphanHandlingErrors: orphanHandlingResult.errorCount,
        totalErrors: billCreationResult.errorCount + productUpdateResult.errorCount + orphanHandlingResult.errorCount,
        
        // Validation
        dataIntegrityValid: validationResult.isValid,
        validationIssues: validationResult.issues,
        
        // Detailed results
        details: {
          groupingResult,
          billCreationResult,
          productUpdateResult,
          orphanHandlingResult,
          validationResult
        }
      };

      setMigrationState({
        status: 'completed',
        progress: 100,
        currentStep: 'Migration completed successfully',
        result: migrationSummary,
        error: null,
        startTime: migrationState.startTime,
        endTime
      });

      setRollbackState(prev => ({ ...prev, available: true }));
      
      addNotification('success', `Migration completed successfully! Created ${migrationSummary.totalBillsCreated} bills and updated ${migrationSummary.totalProductsUpdated} products.`);

    } catch (error) {
      console.error('Migration failed:', error);
      
      setMigrationState(prev => ({
        ...prev,
        status: 'failed',
        error: error.message,
        endTime: new Date()
      }));

      addNotification('error', `Migration failed: ${error.message}`);
    }
  };

  const runValidation = async () => {
    setValidationState({
      status: 'running',
      result: null,
      error: null
    });

    addNotification('info', 'Running data validation...');

    try {
      const result = await MigrationService.validateDataIntegrity();
      
      setValidationState({
        status: 'completed',
        result,
        error: null
      });

      if (result.isValid) {
        addNotification('success', 'Data validation passed - no issues found');
      } else {
        addNotification('warning', `Data validation found ${result.issues.length} issues`);
      }

    } catch (error) {
      console.error('Validation failed:', error);
      
      setValidationState({
        status: 'failed',
        result: null,
        error: error.message
      });

      addNotification('error', `Validation failed: ${error.message}`);
    }
  };

  const fixValidationIssues = async () => {
    if (!validationState.result || validationState.result.isValid) {
      return;
    }

    addNotification('info', 'Attempting to fix validation issues...');

    try {
      const fixResult = await MigrationService.fixDataIntegrityIssues(validationState.result);
      
      if (fixResult.success) {
        addNotification('success', `Fixed ${fixResult.fixedIssues.length} issues`);
        // Re-run validation to confirm fixes
        await runValidation();
      } else {
        addNotification('warning', `Fixed ${fixResult.fixedIssues.length} issues, but ${fixResult.unfixedIssues.length} issues remain`);
      }

    } catch (error) {
      console.error('Failed to fix issues:', error);
      addNotification('error', `Failed to fix issues: ${error.message}`);
    }
  };

  const resetMigration = () => {
    setMigrationState({
      status: 'idle',
      progress: 0,
      currentStep: '',
      result: null,
      error: null,
      startTime: null,
      endTime: null
    });
  };

  const canStartMigration = migrationState.status === 'idle' || migrationState.status === 'failed';
  const canRunValidation = validationState.status !== 'running';

  return (
    <div className="migration-dashboard">
      <div className="migration-header">
        <Database size={24} />
        <h2>Migration Dashboard</h2>
        <p>Manage bill-wise product separation migration and data validation</p>
      </div>

      <div className="migration-tabs">
        <button 
          className={`tab-button ${activeTab === 'migration' ? 'active' : ''}`}
          onClick={() => setActiveTab('migration')}
        >
          <Play size={16} />
          Migration
        </button>
        <button 
          className={`tab-button ${activeTab === 'validation' ? 'active' : ''}`}
          onClick={() => setActiveTab('validation')}
        >
          <CheckCircle size={16} />
          Validation
        </button>
        <button 
          className={`tab-button ${activeTab === 'rollback' ? 'active' : ''}`}
          onClick={() => setActiveTab('rollback')}
          disabled={!rollbackState.available}
        >
          <RotateCcw size={16} />
          Rollback
        </button>
      </div>

      <div className="migration-content">
        {activeTab === 'migration' && (
          <div className="migration-tab">
            <Card className="migration-controls">
              <div className="migration-controls-header">
                <h3>Migration Control</h3>
                <div className="migration-actions">
                  <Button
                    onClick={startMigration}
                    disabled={!canStartMigration}
                    variant="primary"
                  >
                    {migrationState.status === 'running' ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Running Migration
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Start Migration
                      </>
                    )}
                  </Button>
                  
                  {migrationState.status !== 'idle' && (
                    <Button
                      onClick={resetMigration}
                      variant="secondary"
                      disabled={migrationState.status === 'running'}
                    >
                      <RefreshCw size={16} />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              <MigrationProgressIndicator 
                status={migrationState.status}
                progress={migrationState.progress}
                currentStep={migrationState.currentStep}
                result={migrationState.result}
                error={migrationState.error}
                startTime={migrationState.startTime}
                endTime={migrationState.endTime}
              />
            </Card>

            {migrationState.result && (
              <Card className="migration-summary">
                <h3>Migration Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Duration</span>
                    <span className="summary-value">{migrationState.result.duration}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Products Processed</span>
                    <span className="summary-value">{migrationState.result.totalProductsProcessed}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Bills Created</span>
                    <span className="summary-value">{migrationState.result.totalBillsCreated}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Products Updated</span>
                    <span className="summary-value">{migrationState.result.totalProductsUpdated}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Errors</span>
                    <span className={`summary-value ${migrationState.result.totalErrors > 0 ? 'error' : 'success'}`}>
                      {migrationState.result.totalErrors}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Data Integrity</span>
                    <span className={`summary-value ${migrationState.result.dataIntegrityValid ? 'success' : 'error'}`}>
                      {migrationState.result.dataIntegrityValid ? 'Valid' : 'Issues Found'}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="validation-tab">
            <Card className="validation-controls">
              <div className="validation-controls-header">
                <h3>Data Validation</h3>
                <div className="validation-actions">
                  <Button
                    onClick={runValidation}
                    disabled={!canRunValidation}
                    variant="primary"
                  >
                    {validationState.status === 'running' ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Validating
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Run Validation
                      </>
                    )}
                  </Button>
                  
                  {validationState.result && !validationState.result.isValid && (
                    <Button
                      onClick={fixValidationIssues}
                      variant="secondary"
                    >
                      <Settings size={16} />
                      Fix Issues
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <DataValidationDashboard 
              validationState={validationState}
              onRunValidation={runValidation}
              onFixIssues={fixValidationIssues}
            />
          </div>
        )}

        {activeTab === 'rollback' && rollbackState.available && (
          <div className="rollback-tab">
            <MigrationRollback 
              rollbackState={rollbackState}
              setRollbackState={setRollbackState}
              addNotification={addNotification}
            />
          </div>
        )}
      </div>

      <NotificationSystem 
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

export default MigrationDashboard;