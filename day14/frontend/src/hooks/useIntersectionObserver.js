import { useEffect, useRef } from 'react';

/**
 * Day 14: useIntersectionObserver Hook
 * Observes a DOM element and triggers callback when it intersects the viewport.
 * Used for Infinite Scrolling pagination and on-demand lazy asset loading.
 */
export function useIntersectionObserver({
  targetRef,
  onIntersect,
  enabled = true,
  rootMargin = '200px',
  threshold = 0.1,
}) {
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    if (!enabled) return;
    const element = targetRef?.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callbackRef.current();
          }
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, enabled, rootMargin, threshold]);
}

export default useIntersectionObserver;
