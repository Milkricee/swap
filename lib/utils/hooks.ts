import { useState, useEffect } from 'react';

/**
 * Debounce hook - verzögert Wert-Updates
 * Reduziert API-Calls während Eingabe
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Prefetch hook - lädt Daten im Hintergrund
 */
export function usePrefetch(urls: string[]) {
  useEffect(() => {
    urls.forEach(url => {
      fetch(url, { method: 'HEAD' }).catch(() => {});
    });
  }, []);
}

/**
 * Intersection Observer Hook - lazy load on visibility
 */
export function useIntersection(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}
