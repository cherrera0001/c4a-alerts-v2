import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Assets from "./pages/Assets";
import CTI from "./pages/CTI";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/alerts"
            element={
              <ProtectedRoute>
                <Alerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/assets"
            element={
              <ProtectedRoute>
                <Assets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/cti"
            element={
              <ProtectedRoute>
                <CTI />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid #334155",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#e2e8f0",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#e2e8f0",
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

