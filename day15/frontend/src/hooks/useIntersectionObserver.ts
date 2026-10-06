import { useEffect, useRef, RefObject } from 'react';

export interface UseIntersectionObserverOptions {
  targetRef: RefObject<HTMLElement | null>;
  onIntersect: () => void;
  enabled?: boolean;
  rootMargin?: string;
  threshold?: number;
}

/**
 * Day 15: Typed useIntersectionObserver Hook with typed RefObject<HTMLElement | null>
 */
export function useIntersectionObserver({
  targetRef,
  onIntersect,
  enabled = true,
  rootMargin = '200px',
  threshold = 0.1,
}: UseIntersectionObserverOptions): void {
  const callbackRef = useRef<() => void>(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
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
