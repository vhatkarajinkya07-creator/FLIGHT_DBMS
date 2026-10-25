import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Register from "./components/Register";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-root">
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/*"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            {/* Fallback to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={user.user_type === "admin" ? "/admin" : "/user"} replace />;
  }
  return <Navigate to="/login" replace />;
}

function ProtectedRoute({ children, requiredType }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredType && user.user_type !== requiredType) {
    return <Navigate to={user.user_type === "admin" ? "/admin" : "/user"} replace />;
  }

  return children;
}

export default App;
