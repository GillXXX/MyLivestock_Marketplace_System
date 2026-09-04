import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

/* =========================
   PUBLIC PAGES
========================= */
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";


/* =========================
   FARMER PAGES
========================= */
import FarmerDashboard from "./pages/FarmerDashboard";
import Listings from "./pages/Listings";
import Post from "./pages/Post";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import FarmerTransactions from "./pages/FarmerTransactions";
import FarmerNotifications from "./pages/FarmerNotifications";
import AccountSettings from "./pages/AccountSettings";
import FarmerLayout from "./components/FarmerLayout";

/* =========================
   ADMIN PAGES
========================= */
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminListings from "./pages/AdminListings";
import AdminVerification from "./pages/AdminVerification";
import AdminTransactions from "./pages/AdminTransactions";
import AdminReports from "./pages/AdminReports";
import AdminNotifications from "./pages/AdminNotifications";
import AdminSettings from "./pages/AdminSettings";
import AdminMapMonitoring from "./pages/AdminMapMonitoring";
import AdminLayout from "./components/AdminLayout";

/* =========================
   BUYER PAGES
========================= */
import BuyerDashboard from "./pages/BuyerDashboard";

/* FUTURE BUYER PAGES */
import Marketplace from "./pages/Marketplace";
import BuyerFavorites from "./pages/BuyerFavorites";
import BuyerTransactions from "./pages/BuyerTransactions";
import BuyerNotifications from "./pages/BuyerNotifications";
import BuyerMapExplorer from "./pages/BuyerMap";
import BuyerProfile from "./pages/BuyerProfile";
import BuyerLayout from "./components/BuyerLayout";

function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* =========================
            PUBLIC ROUTES
        ========================= */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* =========================
            FARMER ROUTES
            (nested under FarmerLayout so the sidebar persists
            across navigation instead of remounting per page)
        ========================= */}

        <Route element={<FarmerLayout />}>
          <Route
            path="/farmer-dashboard"
            element={<FarmerDashboard />}
          />

          <Route
            path="/listings"
            element={<Listings />}
          />

          <Route
            path="/post"
            element={<Post />}
          />

          <Route
            path="/post/:id"
            element={<Post />}
          />

          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            path="/farmer-messages"
            element={<Messages />}
          />

          <Route
            path="/farmer-transactions"
            element={<FarmerTransactions />}
          />

          <Route
            path="/farmer-notifications"
            element={<FarmerNotifications />}
          />

          <Route
            path="/farmer-settings"
            element={<AccountSettings role="farmer" />}
          />
        </Route>

        {/* =========================
            ADMIN ROUTES
            (nested under AdminLayout so the sidebar persists
            across navigation instead of remounting per page)
        ========================= */}

        <Route element={<AdminLayout />}>
          <Route
            path="/admin-dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin-users"
            element={<AdminUsers />}
          />

          <Route
            path="/admin-listings"
            element={<AdminListings />}
          />

          <Route
            path="/admin-verification"
            element={<AdminVerification />}
          />

          <Route
            path="/admin-transactions"
            element={<AdminTransactions />}
          />

          <Route
            path="/admin-reports"
            element={<AdminReports />}
          />

          <Route
            path="/admin-notifications"
            element={<AdminNotifications />}
          />

          <Route
            path="/admin-settings"
            element={<AdminSettings />}
          />

          <Route
            path="/admin-map"
            element={<AdminMapMonitoring />}
          />
        </Route>

        {/* =========================
            BUYER ROUTES
            (nested under BuyerLayout so the sidebar persists
            across navigation instead of remounting per page)
        ========================= */}

        <Route element={<BuyerLayout />}>
          <Route
            path="/buyer-dashboard"
            element={<BuyerDashboard />}
          />

          <Route
            path="/marketplace"
            element={<Marketplace />}
          />

          <Route
            path="/buyer-favorites"
            element={<BuyerFavorites />}
          />

          <Route
            path="/buyer-messages"
            element={<Messages />}
          />

          <Route
            path="/buyer-transactions"
            element={<BuyerTransactions />}
          />

          <Route
            path="/buyer-notifications"
            element={<BuyerNotifications />}
          />

          <Route
            path="/buyer-map"
            element={<BuyerMapExplorer />}
          />

          <Route
            path="/buyer-profile"
            element={<BuyerProfile />}
          />

          <Route
            path="/buyer-settings"
            element={<AccountSettings role="buyer" />}
          />
        </Route>

        {/* =========================
            FALLBACK
        ========================= */}

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>

    </BrowserRouter>

  );
}

export default App;