import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../store/toast';
import { Icon } from '../ui/Icon';

export function Toaster() {
  const toast = useToast(s => s.toast);
  const hide = useToast(s => s.hide);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hide, 3800);
    return () => clearTimeout(t);
  }, [toast, hide]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      {toast && (
        <div key={toast.id} className="rise pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-pop">
          <Icon name="check" size={18} className="shrink-0 text-white" />
          <span className="min-w-0 flex-1">{toast.text}</span>
          {toast.actionTo && (
            <Link to={toast.actionTo} onClick={hide} className="shrink-0 rounded-md px-2 py-1 font-semibold underline underline-offset-2">
              {toast.actionLabel}
            </Link>
          )}
          <button type="button" onClick={hide} aria-label="Dismiss" className="shrink-0 rounded-md p-1 text-white/70 hover:text-white">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
