import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing keyboard navigation in a list
 * Supports arrow keys, Enter, Space, Home, End navigation
 * 
 * @param items - Array of items to navigate through
 * @param options - Configuration options
 * @returns Object with current index and keyboard event handlers
 */
export function useListKeyboardNavigation<T>({
  items,
  enabled = true,
  onItemSelect,
  onItemActivate,
  loop = true,
}: {
  items: T[];
  enabled?: boolean;
  onItemSelect?: (item: T, index: number) => void;
  onItemActivate?: (item: T, index: number) => void;
  loop?: boolean;
}) {
  const selectedIndexRef = useRef<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Move selection up
  const moveUp = useCallback(() => {
    if (!enabled || items.length === 0) return;
    
    const newIndex = selectedIndexRef.current <= 0
      ? (loop ? items.length - 1 : 0)
      : selectedIndexRef.current - 1;
    
    selectedIndexRef.current = newIndex;
    onItemSelect?.(items[newIndex], newIndex);
    
    // Scroll into view
    scrollToIndex(newIndex);
  }, [enabled, items, loop, onItemSelect]);

  // Move selection down
  const moveDown = useCallback(() => {
    if (!enabled || items.length === 0) return;
    
    const newIndex = selectedIndexRef.current >= items.length - 1
      ? (loop ? 0 : items.length - 1)
      : selectedIndexRef.current + 1;
    
    selectedIndexRef.current = newIndex;
    onItemSelect?.(items[newIndex], newIndex);
    
    // Scroll into view
    scrollToIndex(newIndex);
  }, [enabled, items, loop, onItemSelect]);

  // Move to first item
  const moveToFirst = useCallback(() => {
    if (!enabled || items.length === 0) return;
    
    selectedIndexRef.current = 0;
    onItemSelect?.(items[0], 0);
    scrollToIndex(0);
  }, [enabled, items, onItemSelect]);

  // Move to last item
  const moveToLast = useCallback(() => {
    if (!enabled || items.length === 0) return;
    
    const lastIndex = items.length - 1;
    selectedIndexRef.current = lastIndex;
    onItemSelect?.(items[lastIndex], lastIndex);
    scrollToIndex(lastIndex);
  }, [enabled, items, onItemSelect]);

  // Activate current item
  const activateCurrent = useCallback(() => {
    if (!enabled || selectedIndexRef.current < 0 || selectedIndexRef.current >= items.length) return;
    
    onItemActivate?.(items[selectedIndexRef.current], selectedIndexRef.current);
  }, [enabled, items, onItemActivate]);

  // Scroll item into view
  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    
    const item = containerRef.current.querySelector(`[data-index="${index}"]`);
    if (item) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  // Reset selection when items change
  useEffect(() => {
    selectedIndexRef.current = -1;
  }, [items]);

  // Keyboard event handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enabled) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'j': // Vim-style
        e.preventDefault();
        moveDown();
        break;
      
      case 'ArrowUp':
      case 'k': // Vim-style
        e.preventDefault();
        moveUp();
        break;
      
      case 'Home':
      case 'g': // Vim-style
        e.preventDefault();
        moveToFirst();
        break;
      
      case 'End':
      case 'G': // Vim-style (Shift+g)
        e.preventDefault();
        moveToLast();
        break;
      
      case 'Enter':
      case ' ': // Space
        e.preventDefault();
        activateCurrent();
        break;
    }
  }, [enabled, moveDown, moveUp, moveToFirst, moveToLast, activateCurrent]);

  return {
    containerRef,
    selectedIndex: selectedIndexRef.current,
    handleKeyDown,
    moveUp,
    moveDown,
    moveToFirst,
    moveToLast,
    activateCurrent,
  };
}
