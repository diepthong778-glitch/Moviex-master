import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

function useInView({
  threshold = 0.12,
  root = null,
  rootMargin = '0px 0px -8% 0px',
  once = true,
  fallbackMs = null,
} = {}) {
  const elementRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsInView(true);
      return undefined;
    }

    if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
      setIsInView(true);
      return undefined;
    }

    const element = elementRef.current;
    if (!element) {
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (once) {
              observer.unobserve(entry.target);
            }
            return;
          }

          if (!once) {
            setIsInView(false);
          }
        });
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, prefersReducedMotion, root, rootMargin, threshold]);

  useEffect(() => {
    if (isInView || prefersReducedMotion || !once) return undefined;
    if (!Number.isFinite(fallbackMs) || fallbackMs <= 0) return undefined;

    const timerId = window.setTimeout(() => {
      setIsInView(true);
    }, fallbackMs);

    return () => window.clearTimeout(timerId);
  }, [fallbackMs, isInView, once, prefersReducedMotion]);

  return {
    ref: elementRef,
    isInView,
    prefersReducedMotion,
  };
}

export default useInView;
