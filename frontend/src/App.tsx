import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { ADMIN_TABS, CLIENT_TABS, TabsLayout } from './layout';
import { Loading, Toaster } from './ui';
import AdminLogin from './pages/auth/Login';
import Menu from './pages/client/Menu';
import Cart from './pages/client/Cart';
import Checkout from './pages/client/Checkout';
import Orders from './pages/client/Orders';
import OrderDetail from './pages/client/OrderDetail';
import About from './pages/client/About';
import Dashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import Products from './pages/admin/Products';
import Delivery from './pages/admin/Delivery';
import Finance from './pages/admin/Finance';
import Settings from './pages/admin/Settings';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (user?.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Toaster />
      <Routes>
        {/* Cliente: sem login, identificado pelo celular */}
        <Route element={<TabsLayout tabs={CLIENT_TABS} />}>
          <Route path="/" element={<Menu />} />
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/pedidos/:id" element={<OrderDetail />} />
          <Route path="/sobre" element={<About />} />
        </Route>
        <Route path="/finalizar" element={<Checkout />} />

        {/* Loja: login obrigatório */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          element={
            <RequireAdmin>
              <TabsLayout tabs={ADMIN_TABS} admin />
            </RequireAdmin>
          }
        >
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/pedidos" element={<AdminOrders />} />
          <Route path="/admin/produtos" element={<Products />} />
          <Route path="/admin/entrega" element={<Delivery />} />
          <Route path="/admin/financeiro" element={<Finance />} />
          <Route path="/admin/config" element={<Settings />} />
        </Route>
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
