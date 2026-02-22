import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import VerifyEmailPage from "@/pages/verify";
import LandingPage from "@/pages/landing";
import BrowseSheep from "@/pages/browse";
import SheepDetail from "@/pages/sheep-detail";
import SellerDashboard from "@/pages/seller-dashboard";
import SellerProfile from "@/pages/seller-profile";
import AdminDashboard from "@/pages/admin-dashboard";
import VIPUpgrade from "@/pages/vip-upgrade";
import VIPPackages from "@/pages/vip-packages";
import VIPBenefits from "@/pages/vip-benefits";
import SheepCheckout from "@/pages/sheep-checkout";
import VIPCheckout from "@/pages/vip-checkout";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import ContactPage from "@/pages/contact";
import ForgotPassword from "@/pages/forgot-password";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import BottomNavigation from "@/components/BottomNavigation";

const OrderDetailPageWrapper = (params: any) => (
  <ProtectedRoute allowedRoles={["buyer", "seller", "admin"]}>
    <OrderDetailPage params={params} />
  </ProtectedRoute>
);

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/">
        <PublicRoute>
          <Login />
        </PublicRoute>
      </Route>
      <Route path="/login">
        <PublicRoute>
          <Login />
        </PublicRoute>
      </Route>
      <Route path="/landing" component={LandingPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/forgot-password">
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      </Route>
      <Route path="/register">
        <PublicRoute>
          <Register />
        </PublicRoute>
      </Route>
      <Route path="/verify" component={VerifyEmailPage} />

      {/* Buyer/Seller routes */}
      <Route path="/browse">
        <ProtectedRoute allowedRoles={["buyer", "admin", "seller"]} allowGuest={true}>
          <BrowseSheep />
        </ProtectedRoute>
      </Route>
      <Route path="/sheep/:id">
        <ProtectedRoute allowedRoles={["buyer", "admin", "seller"]} allowGuest={true}>
          <SheepDetail />
        </ProtectedRoute>
      </Route>

      {/* Seller routes */}
      <Route path="/seller">
        <ProtectedRoute allowedRoles={["seller"]}>
          <SellerDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/seller/profile">
        <ProtectedRoute allowedRoles={["seller", "buyer"]}>
          <SellerProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/vip-upgrade">
        <ProtectedRoute allowedRoles={["buyer", "seller"]}>
          <VIPUpgrade />
        </ProtectedRoute>
      </Route>
      <Route path="/vip-packages">
        <ProtectedRoute allowedRoles={["buyer", "seller"]}>
          <VIPPackages />
        </ProtectedRoute>
      </Route>
      <Route path="/vip-benefits">
        <ProtectedRoute allowedRoles={["buyer", "seller"]}>
          <VIPBenefits />
        </ProtectedRoute>
      </Route>
      <Route path="/checkout/sheep">
        <ProtectedRoute allowedRoles={["buyer", "seller"]}>
          <SheepCheckout />
        </ProtectedRoute>
      </Route>
      <Route path="/checkout/vip">
        <ProtectedRoute allowedRoles={["buyer", "seller"]}>
          <VIPCheckout />
        </ProtectedRoute>
      </Route>
      <Route path="/orders">
        <ProtectedRoute allowedRoles={["buyer", "seller"]}>
          <OrdersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/order/:id" component={OrderDetailPageWrapper} />

      {/* Admin routes */}
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <div className="flex flex-col min-h-screen">
              <Router />
              <BottomNavigation />
            </div>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;