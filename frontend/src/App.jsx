import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { queryClient } from '@/lib/queryClient';
import { ProtectedRoute, AdminRoute, GuestRoute } from '@/routes/ProtectedRoute';

import { CustomerLayout } from '@/layouts/CustomerLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

import NotFoundPage from '@/pages/NotFoundPage';
import ForbiddenPage from '@/pages/ForbiddenPage';

import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

import HomePage from '@/pages/catalog/HomePage';
import ProductListPage from '@/pages/catalog/ProductListPage';
import ProductDetailPage from '@/pages/catalog/ProductDetailPage';

import CartPage from '@/pages/cart/CartPage';

import CheckoutPage from '@/pages/checkout/CheckoutPage';
import PaymentRedirectPage from '@/pages/checkout/PaymentRedirectPage';
import PaymentResultPage from '@/pages/checkout/PaymentResultPage';

import ProfilePage from '@/pages/account/ProfilePage';
import AddressBookPage from '@/pages/account/AddressBookPage';
import MyOrdersPage from '@/pages/orders/MyOrdersPage';
import OrderDetailPage from '@/pages/orders/OrderDetailPage';
import MyPaymentsPage from '@/pages/payments/MyPaymentsPage';
import MyShipmentsPage from '@/pages/shipping/MyShipmentsPage';

import DashboardPage from '@/pages/admin/DashboardPage';
import AdminProductListPage from '@/pages/admin/products/ProductListPage';
import AdminProductFormPage from '@/pages/admin/products/ProductFormPage';
import AdminOrderListPage from '@/pages/admin/orders/OrderListPage';
import AdminOrderDetailPage from '@/pages/admin/orders/OrderDetailPage';
import PromotionListPage from '@/pages/admin/promotions/PromotionListPage';
import PromotionFormPage from '@/pages/admin/promotions/PromotionFormPage';
import PromotionDetailPage from '@/pages/admin/promotions/PromotionDetailPage';
import AdminPaymentListPage from '@/pages/admin/payments/PaymentListPage';
import AdminPaymentDetailPage from '@/pages/admin/payments/PaymentDetailPage';
import AdminShipmentListPage from '@/pages/admin/shipping/ShipmentListPage';
import AdminShipmentDetailPage from '@/pages/admin/shipping/ShipmentDetailPage';
import AdminUserListPage from '@/pages/admin/users/UserListPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Customer-facing storefront */}
          <Route element={<CustomerLayout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="checkout/pay/:orderCode" element={<PaymentRedirectPage />} />
              <Route path="checkout/payment-result" element={<PaymentResultPage />} />

              <Route path="account/profile" element={<ProfilePage />} />
              <Route path="account/addresses" element={<AddressBookPage />} />
              <Route path="account/orders" element={<MyOrdersPage />} />
              <Route path="account/orders/:id" element={<OrderDetailPage />} />
              <Route path="account/payments" element={<MyPaymentsPage />} />
              <Route path="account/shipments" element={<MyShipmentsPage />} />
            </Route>
          </Route>

          {/* Auth pages */}
          <Route element={<GuestRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
            </Route>
          </Route>

          {/* Admin console */}
          <Route path="admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />

              <Route path="products" element={<AdminProductListPage />} />
              <Route path="products/new" element={<AdminProductFormPage />} />
              <Route path="products/:id/edit" element={<AdminProductFormPage />} />

              <Route path="orders" element={<AdminOrderListPage />} />
              <Route path="orders/:id" element={<AdminOrderDetailPage />} />

              <Route path="promotions" element={<PromotionListPage />} />
              <Route path="promotions/new" element={<PromotionFormPage />} />
              <Route path="promotions/:id" element={<PromotionDetailPage />} />
              <Route path="promotions/:id/edit" element={<PromotionFormPage />} />

              <Route path="payments" element={<AdminPaymentListPage />} />
              <Route path="payments/:id" element={<AdminPaymentDetailPage />} />

              <Route path="shipments" element={<AdminShipmentListPage />} />
              <Route path="shipments/:id" element={<AdminShipmentDetailPage />} />

              <Route path="users" element={<AdminUserListPage />} />
            </Route>
          </Route>

          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
