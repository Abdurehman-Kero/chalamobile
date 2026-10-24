import { Component, type ReactNode } from 'react';
import { useT } from '../../i18n';
import { SHOP_PHONE_DISPLAY } from '../../lib/config';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

function CrashScreen() {
  const t = useT();
  return (
    <div role="alert" className="grid min-h-dvh place-items-center bg-canvas px-5 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger"><Icon name="x" size={26} /></span>
        <h1 className="text-xl font-bold">{t('crash.title')}</h1>
        <p className="mt-2 text-muted">{t('crash.text', { phone: SHOP_PHONE_DISPLAY })}</p>
        <Button className="mt-6" size="lg" onClick={() => window.location.reload()}>{t('common.reload')}</Button>
      </div>
    </div>
  );
}

/**
 * If something unexpected breaks a page, the customer sees this calm screen with a reload button and
 * the shop's number, instead of a blank page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <CrashScreen /> : this.props.children;
  }
}
