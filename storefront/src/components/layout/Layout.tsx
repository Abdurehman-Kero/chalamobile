import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { CategoryBar } from './CategoryBar';
import { Footer } from './Footer';
import { BackToTop } from './BackToTop';
import { Toaster } from './Toaster';

// Pages that browse the catalogue show the category chips; checkout-style pages stay calm.
const SHOWS_CATEGORIES = new Set(['/', '/shop']);

export function Layout() {
  const { pathname } = useLocation();

  // A new page starts at the top (the browser keeps its place for back/forward on its own).
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);

  // min-w-0 on every child: a flex column child otherwise grows to the width of its widest
  // content (such as a row of chips) and pushes the whole page sideways on phones.
  // overflow-x-clip (not hidden) keeps the sticky header and tab bar working.
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip [&>*]:min-w-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      {SHOWS_CATEGORIES.has(pathname) && <CategoryBar />}
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
      <Toaster />
    </div>
  );
}
