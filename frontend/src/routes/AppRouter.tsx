import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

import LandingPage from "../pages/Landing/LandingPage";
import ApplicationPage from "../pages/ApplicationPage";
import LoginPage from "../pages/Login/LoginPage";
import RegisterPage from "../pages/Register/RegisterPage";
import UnderwriterDashboard from "../pages/Underwriter/UnderwriterDashboard";
import ApplicationReviewPage from "../pages/Underwriter/ApplicationReviewPage";
import AnalyticsDashboard from "../pages/Underwriter/AnalyticsDashboard";
import UnauthorizedPage from "../pages/UnauthorizedPage";

export default function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Customer Route */}
          <Route
            path="/apply"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER", "UNDERWRITER"]}>
                <ApplicationPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Underwriter Routes */}
          <Route
            path="/underwriter"
            element={
              <ProtectedRoute allowedRoles={["UNDERWRITER"]}>
                <UnderwriterDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/underwriter/analytics"
            element={
              <ProtectedRoute allowedRoles={["UNDERWRITER"]}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/underwriter/applications/:id"
            element={
              <ProtectedRoute allowedRoles={["UNDERWRITER"]}>
                <ApplicationReviewPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}