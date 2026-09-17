import { useEffect, useState } from 'react';

/**
 * A clock source that re-renders on the second boundary.
 *
 * Using `setInterval(1000)` drifts: the first tick can land mid-second, so the
 * seconds hand visibly jumps by two at some point. Re-arming a timeout for the
 * exact remainder of the current second keeps every tick aligned.
 */
export function useNow(enabled = true): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return;
    let timer = 0;

    const schedule = () => {
      const delay = 1000 - (Date.now() % 1000);
      timer = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay);
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [enabled]);

  return now;
}
