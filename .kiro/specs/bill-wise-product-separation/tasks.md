# Implementation Plan

- [x] 1. Create Firebase Bills service and data models
  - Create new Firebase service for bill operations with CRUD functions
  - Implement bill data model with validation and calculation utilities
  - Add Firebase security rules for bills collection
  - Write unit tests for bill service functions
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Enhance existing ProductService for bill integration
  - Modify addShopProduct to accept billId parameter
  - Add functions to get products by billId and move products between bills
  - Implement bill-product relationship validation
  - Update existing product queries to include bill references
  - Write unit tests for enhanced product service functions
  - _Requirements: 1.1, 1.4, 6.4_

- [x] 3. Implement data migration utilities
  - Create migration function to group existing products by billNumber
  - Implement bill creation from grouped products
  - Add product update function to set billId references
  - Create data integrity validation after migration
  - Write comprehensive tests for migration process
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Create BillCard component for individual bill display
  - Implement bill summary display with totals and metadata
  - Add expandable product list within each bill card
  - Create bill action buttons (edit, delete, duplicate, export)
  - Implement bill-level editing modal
  - Write component tests for BillCard functionality
  - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4_

- [x] 5. Implement BillsView component for bill management
  - Create bill list display with pagination and sorting
  - Implement bill creation form with auto-generated bill numbers
  - Add bill search and filtering functionality
  - Create bill analytics summary section
  - Write component tests for BillsView interactions
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4_

- [x] 6. Add view mode toggle to Shop component
  - Implement toggle between bills view and products view
  - Update Shop component state management for dual views
  - Ensure shared search and filter state between views
  - Maintain existing product view functionality
  - Write integration tests for view mode switching
  - _Requirements: 2.5, 4.5_

- [x] 7. Enhance analytics for bill-wise insights
  - Create bill-based analytics charts (vendor, date, value)
  - Implement average bill value and profit margin calculations
  - Add vendor performance analytics based on bills
  - Update existing analytics to support both product and bill views
  - Write tests for analytics calculations and chart data
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Implement bill-level operations and bulk actions
  - Add bill duplication functionality with all products
  - Implement bill deletion with cascade to products
  - Create bill-specific CSV export functionality
  - Add bulk operations for multiple bill selection
  - Write tests for all bill-level operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 9. Add advanced filtering and search capabilities
  - Implement bill date range filtering
  - Add bill amount range filtering
  - Create vendor-based bill filtering
  - Enhance search to work across bills and products
  - Write tests for all filtering and search functionality
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10. Create bill management forms and modals
  - Implement bill creation modal with vendor and date selection
  - Create bill editing form for metadata updates
  - Add product addition modal within bill context
  - Implement form validation and error handling
  - Write tests for all form components and validation
  - _Requirements: 1.1, 1.3, 1.4, 3.4_

- [x] 11. Integrate real-time updates for bill-product relationships
  - Update Firebase subscriptions to handle bill changes
  - Implement real-time bill total calculations
  - Add optimistic updates for better user experience
  - Handle concurrent updates and conflict resolution
  - Write tests for real-time functionality and edge cases
  - _Requirements: 2.1, 2.2, 2.3, 6.5_

- [x] 12. Add comprehensive error handling and user feedback
  - Implement error boundaries for bill-related components
  - Add loading states for all bill operations
  - Create user-friendly error messages and recovery options
  - Add success notifications for completed operations
  - Write tests for error scenarios and user feedback
  - _Requirements: 6.5_

- [x] 13. Optimize performance for large datasets
  - Implement pagination for bills and products lists
  - Add virtual scrolling for large bill collections
  - Optimize Firebase queries with proper indexing
  - Implement caching for frequently accessed bill data
  - Write performance tests and benchmarks
  - _Requirements: 4.5, 5.5_

- [x] 14. Create migration UI and data validation tools
  - Build migration progress indicator and status display
  - Implement data validation dashboard for post-migration
  - Add rollback functionality for failed migrations
  - Create data integrity checking tools
  - Write end-to-end tests for complete migration workflow
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 15. Final integration testing and bug fixes
  - Perform comprehensive integration testing across all components
  - Test bill-product relationships under various scenarios
  - Validate analytics accuracy with bill-based calculations
  - Fix any bugs discovered during integration testing
  - Ensure backward compatibility with existing product workflows
  - _Requirements: All requirements validation_