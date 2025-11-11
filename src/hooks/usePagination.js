import { useState, useMemo } from 'react';

/**
 * Custom hook for pagination with performance optimizations
 * @param {Array} data - The data to paginate
 * @param {number} itemsPerPage - Number of items per page
 * @param {Object} options - Additional options
 * @returns {Object} Pagination state and controls
 */
export const usePagination = (data = [], itemsPerPage = 20, options = {}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);
  
  const {
    enableVirtualization = false,
    bufferSize = 5, // Number of pages to keep in memory for virtual scrolling
    onPageChange,
    resetOnDataChange = true
  } = options;

  // Reset to first page when data changes (if enabled)
  const dataLength = data.length;
  useMemo(() => {
    if (resetOnDataChange && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [dataLength, resetOnDataChange]);

  // Calculate pagination values
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);
  
  // Get current page data
  const currentPageData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  // Virtual scrolling support - keep buffer pages in memory
  const virtualizedData = useMemo(() => {
    if (!enableVirtualization) return currentPageData;
    
    const bufferStart = Math.max(1, currentPage - bufferSize);
    const bufferEnd = Math.min(totalPages, currentPage + bufferSize);
    const bufferStartIndex = (bufferStart - 1) * pageSize;
    const bufferEndIndex = Math.min(bufferEnd * pageSize, data.length);
    
    return data.slice(bufferStartIndex, bufferEndIndex);
  }, [data, currentPage, pageSize, bufferSize, totalPages, enableVirtualization]);

  // Navigation functions
  const goToPage = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    if (onPageChange) {
      onPageChange(validPage);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);

  // Page size change
  const changePageSize = (newSize) => {
    const newTotalPages = Math.ceil(data.length / newSize);
    const newCurrentPage = Math.min(currentPage, newTotalPages);
    
    setPageSize(newSize);
    setCurrentPage(newCurrentPage);
    
    if (onPageChange) {
      onPageChange(newCurrentPage);
    }
  };

  // Get page numbers for pagination UI
  const getPageNumbers = (maxVisible = 7) => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];
    
    // Add first page and ellipsis if needed
    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push('...');
      }
    }

    // Add visible pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  // Pagination info
  const paginationInfo = {
    currentPage,
    totalPages,
    pageSize,
    totalItems: data.length,
    startIndex: startIndex + 1,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages
  };

  return {
    // Data
    currentPageData,
    virtualizedData,
    
    // Pagination info
    ...paginationInfo,
    
    // Navigation
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    
    // UI helpers
    getPageNumbers,
    
    // State setters (for external control)
    setCurrentPage,
    setPageSize
  };
};

export default usePagination;