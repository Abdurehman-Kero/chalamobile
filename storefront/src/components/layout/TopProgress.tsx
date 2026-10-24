import { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';

/**
 * A thin amber bar across the very top of the page while anything is being loaded or refreshed.
 * It waits a moment before appearing, so quick loads never flash.
 */
export function TopProgress() {
  const busy = useIsFetching() > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(busy), busy ? 160 : 250);
    return () => clearTimeout(timer);
  }, [busy]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="progress-sweep h-full w-2/5 rounded-full bg-brand" />
    </div>
  );
}
