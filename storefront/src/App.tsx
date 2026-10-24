import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { RequireAuth } from './components/layout/RequireAuth';
import Home from './pages/Home';

// The home page loads first; the rest are fetched when someone opens them.
const Shop = lazy(() => import('./pages/Shop'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

// After the first screen has appeared, fetch the other pages quietly, so moving to them is instant.
const preload = () => {
  void Promise.all([
    import('./pages/Shop'), import('./pages/ProductPage'), import('./pages/Cart'), import('./pages/Checkout'),
    import('./pages/AuthPage'), import('./pages/Orders'), import('./pages/OrderDetail'), import('./pages/Notifications'), import('./pages/Contact'),
  ]);
};
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 4000 });
  else setTimeout(preload, 2000);
}

export default function App() {
  return (
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="login" element={<AuthPage mode="login" />} />
          <Route path="register" element={<AuthPage mode="register" />} />
          <Route path="contact" element={<Contact />} />
          <Route element={<RequireAuth />}>
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
  );
}
