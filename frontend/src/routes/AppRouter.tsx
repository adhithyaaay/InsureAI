import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

import LandingPage from "../pages/Landing/LandingPage";
import ApplicationPage from "../pages/ApplicationPage";
import LoginPage from "../pages/Login/LoginPage";
import RegisterPage from "../pages/Register/RegisterPage";
import UnderwriterDashboard from "../pages/Underwriter/UnderwriterDashboard";
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

          {/* Protected Underwriter Route */}
          <Route
            path="/underwriter"
            element={
              <ProtectedRoute allowedRoles={["UNDERWRITER"]}>
                <UnderwriterDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}