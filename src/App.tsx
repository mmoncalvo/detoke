import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageLoader } from '@/components/common/States';
import { useAuth } from '@/context/AuthContext';
import PublicLayout from '@/layouts/PublicLayout';

const Home = lazy(() => import('@/pages/Home'));
const Explore = lazy(() => import('@/pages/Explore'));
const BusinessPage = lazy(() => import('@/pages/BusinessPage'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout'));
const Overview = lazy(() => import('@/pages/dashboard/Overview'));
const Products = lazy(() => import('@/pages/dashboard/Products'));
const BusinessProfile = lazy(() => import('@/pages/dashboard/BusinessProfile'));
const Hours = lazy(() => import('@/pages/dashboard/Hours'));
const Gallery = lazy(() => import('@/pages/dashboard/Gallery'));
const DeliveryPayments = lazy(() => import('@/pages/dashboard/DeliveryPayments'));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="explorar" element={<Explore />} />
          <Route path="negocio/:slug" element={<BusinessPage />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="products" element={<Products />} />
          <Route path="business" element={<BusinessProfile />} />
          <Route path="hours" element={<Hours />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="delivery" element={<DeliveryPayments />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
