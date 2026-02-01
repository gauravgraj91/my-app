import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * Custom hook for virtual scrolling with performance optimizations
 * @param {Array} items - Array of items to virtualize
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of the scroll container
 * @param {Object} options - Additional options
 * @returns {Object} Virtual scrolling state and utilities
 */
export const useVirtualScrolling = (
  items = [], 
  itemHeight = 60, 
  containerHeight = 400, 
  options = {}
) => {
  const {
    overscan = 5, // Number of items to render outside visible area
    scrollDebounceMs = 16, // Debounce scroll events (60fps)
    enableSmoothScrolling = true,
    onScroll,
    estimatedItemHeight = itemHeight, // For dynamic heights
    getItemHeight, // Function to get dynamic item height
    cacheSize = 1000 // Maximum number of items to keep in cache
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollElementRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const itemHeightCache = useRef(new Map());
  const measurementCache = useRef(new Map());

  // Calculate item heights (static or dynamic)
  const getItemHeightMemo = useCallback((index) => {
    if (getItemHeight) {
      const cacheKey = `height-${index}`;
      if (itemHeightCache.current.has(cacheKey)) {
        return itemHeightCache.current.get(cacheKey);
      }
      
      const height = getItemHeight(index, items[index]);
      
      // Limit cache size
      if (itemHeightCache.current.size >= cacheSize) {
        const firstKey = itemHeightCache.current.keys().next().value;
        itemHeightCache.current.delete(firstKey);
      }
      
      itemHeightCache.current.set(cacheKey, height);
      return height;
    }
    return estimatedItemHeight;
  }, [getItemHeight, items, estimatedItemHeight, cacheSize]);

  // Calculate total height and item positions
  const { totalHeight, itemPositions } = useMemo(() => {
    let height = 0;
    const positions = [];
    
    for (let i = 0; i < items.length; i++) {
      positions[i] = height;
      height += getItemHeightMemo(i);
    }
    
    return {
      totalHeight: height,
      itemPositions: positions
    };
  }, [items.length, getItemHeightMemo]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (items.length === 0) {
      return { start: 0, end: 0 };
    }

    // Binary search for start index
    let start = 0;
    let end = items.length - 1;
    
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const itemTop = itemPositions[mid];
      const itemBottom = itemTop + getItemHeightMemo(mid);
      
      if (itemBottom < scrollTop) {
        start = mid + 1;
      } else if (itemTop > scrollTop + containerHeight) {
        end = mid - 1;
      } else {
        start = mid;
        break;
      }
    }

    // Find end index
    let visibleEnd = start;
    let currentTop = itemPositions[start] || 0;
    
    while (visibleEnd < items.length && currentTop < scrollTop + containerHeight) {
      currentTop += getItemHeightMemo(visibleEnd);
      visibleEnd++;
    }

    // Apply overscan
    const overscanStart = Math.max(0, start - overscan);
    const overscanEnd = Math.min(items.length, visibleEnd + overscan);

    return {
      start: overscanStart,
      end: overscanEnd
    };
  }, [scrollTop, containerHeight, items.length, itemPositions, getItemHeightMemo, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      top: itemPositions[visibleRange.start + index] || 0,
      height: getItemHeightMemo(visibleRange.start + index)
    }));
  }, [items, visibleRange, itemPositions, getItemHeightMemo]);

  // Debounced scroll handler
  const handleScroll = useCallback((event) => {
    const newScrollTop = event.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after debounce period
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, scrollDebounceMs + 50);

    // Call external scroll handler
    if (onScroll) {
      onScroll(event, {
        scrollTop: newScrollTop,
        visibleRange,
        isScrolling: true
      });
    }
  }, [onScroll, visibleRange, scrollDebounceMs]);

  // Scroll to specific item
  const scrollToItem = useCallback((index, align = 'auto') => {
    if (!scrollElementRef.current || index < 0 || index >= items.length) {
      return;
    }

    const itemTop = itemPositions[index] || 0;
    const itemHeight = getItemHeightMemo(index);
    const itemBottom = itemTop + itemHeight;

    let targetScrollTop = scrollTop;

    switch (align) {
      case 'start':
        targetScrollTop = itemTop;
        break;
      case 'end':
        targetScrollTop = itemBottom - containerHeight;
        break;
      case 'center':
        targetScrollTop = itemTop - (containerHeight - itemHeight) / 2;
        break;
      case 'auto':
      default:
        if (itemTop < scrollTop) {
          targetScrollTop = itemTop;
        } else if (itemBottom > scrollTop + containerHeight) {
          targetScrollTop = itemBottom - containerHeight;
        }
        break;
    }

    // Clamp scroll position
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight - containerHeight));

    if (enableSmoothScrolling) {
      scrollElementRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    } else {
      scrollElementRef.current.scrollTop = targetScrollTop;
    }
  }, [scrollTop, containerHeight, totalHeight, itemPositions, getItemHeightMemo, enableSmoothScrolling, items.length]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    scrollToItem(0, 'start');
  }, [scrollToItem]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (items.length > 0) {
      scrollToItem(items.length - 1, 'end');
    }
  }, [scrollToItem, items.length]);

  // Get scroll progress (0-1)
  const scrollProgress = useMemo(() => {
    if (totalHeight <= containerHeight) return 0;
    return scrollTop / (totalHeight - containerHeight);
  }, [scrollTop, totalHeight, containerHeight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Clear caches when items change significantly
  useEffect(() => {
    if (items.length === 0) {
      itemHeightCache.current.clear();
      measurementCache.current.clear();
    }
  }, [items.length]);

  return {
    // Refs
    scrollElementRef,
    
    // Visible items data
    visibleItems,
    visibleRange,
    
    // Scroll state
    scrollTop,
    isScrolling,
    scrollProgress,
    
    // Dimensions
    totalHeight,
    containerHeight,
    
    // Event handlers
    handleScroll,
    
    // Scroll controls
    scrollToItem,
    scrollToTop,
    scrollToBottom,
    
    // Utilities
    getItemHeight: getItemHeightMemo,
    
    // Performance metrics
    renderedItemCount: visibleItems.length,
    totalItemCount: items.length,
    overscanCount: overscan
  };
};

export default useVirtualScrolling;