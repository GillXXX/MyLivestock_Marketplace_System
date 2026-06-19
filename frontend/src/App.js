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


/* =========================
   FARMER PAGES
========================= */
import FarmerDashboard from "./pages/FarmerDashboard";
import Listings from "./pages/Listings";
import Post from "./pages/Post";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";

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

/* =========================
   BUYER PAGES
========================= */
import BuyerDashboard from "./pages/BuyerDashboard";

/* FUTURE BUYER PAGES */
import Marketplace from "./pages/Marketplace";
import BuyerFavorites from "./pages/BuyerFavorites";
import BuyerMessages from "./pages/BuyerMessages";
import BuyerTransactions from "./pages/BuyerTransactions";
import BuyerNotifications from "./pages/BuyerNotifications";
import BuyerMapExplorer from "./pages/BuyerMap";
import BuyerProfile from "./pages/BuyerProfile";
import BuyerSettings from "./pages/BuyerSettings";

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

        {/* =========================
            FARMER ROUTES
        ========================= */}

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
          path="/messages"
          element={<Messages />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        {/* =========================
            ADMIN ROUTES
        ========================= */}

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

        {/* =========================
            BUYER ROUTES
        ========================= */}

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

        <Route path="/buyer-messages" element={<BuyerMessages />} />

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
          element={<BuyerSettings />}
        />

      </Routes>

    </BrowserRouter>

  );
}

export default App;