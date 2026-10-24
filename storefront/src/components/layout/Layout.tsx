import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useT } from '../../i18n';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { SubNav } from './SubNav';
import { Footer } from './Footer';
import { BackToTop } from './BackToTop';
import { Toaster } from './Toaster';

// Browsing pages show the main links.
// Checkout and sign-in stay calm and uncluttered.
const CALM = new Set(['/checkout', '/login', '/register']);

export function Layout() {
  const t = useT();
  const { pathname } = useLocation();

  // A new page starts at the top (the browser keeps its place for back/forward on its own).
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);

  // min-w-0 on every child: a flex column child otherwise grows to the width of its widest
  // content (such as a row of chips) and pushes the whole page sideways on phones.
  // overflow-x-clip (not hidden) keeps the sticky header and tab bar working.
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip [&>*]:min-w-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand">
        {t('common.skip')}
      </a>
      <AnnouncementBar />
      <Header />
      {!CALM.has(pathname) && <SubNav />}
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
      <Toaster />
    </div>
  );
}
