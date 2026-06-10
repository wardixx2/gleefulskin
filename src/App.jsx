
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AppointmentBooking from "./pages/AppointmentBooking.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminAppointments from "./pages/admin/AdminAppointments.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminTreatments from "./pages/admin/AdminTreatments.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import { supabase } from "./lib/supabase.js";

function ProtectedRoute({ children, session, profile, requireAdmin }) {
  const location = useLocation();

  if (session === undefined) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);

  const syncProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
      return;
    }

    if (error && error.code !== "PGRST116") {
      console.error("Profile lookup failed:", error.message);
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setProfile(null);
      return;
    }

    const role = userData.user.email === "admin@glow.com" ? "admin" : "customer";
    const fullName = userData.user.user_metadata?.full_name || "";

    const insertResult = await supabase.from("profiles").insert({
      id: userId,
      full_name: fullName,
      role,
    });

    if (insertResult.error) {
      console.error("Failed to create profile:", insertResult.error.message);
      setProfile({ id: userId, full_name: fullName, role });
      return;
    }

    setProfile({ id: userId, full_name: fullName, role });
  };

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
      if (currentSession?.user?.id) {
        await syncProfile(currentSession.user.id);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user?.id) {
          await syncProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/"
          element={
            session === undefined ? (
              <div className="loading-screen">Loading...</div>
            ) : session ? (
              profile?.role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            session ? (
              profile?.role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/register"
          element={
            session ? (
              profile?.role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Register />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session} profile={profile}>
              <Dashboard session={session} profile={profile} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book"
          element={
            <ProtectedRoute session={session} profile={profile}>
              <AppointmentBooking session={session} profile={profile} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute session={session} profile={profile}>
              <Profile session={session} profile={profile} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute session={session} profile={profile} requireAdmin>
              <AdminPanel session={session} profile={profile} />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="treatments" element={<AdminTreatments />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<h1>404 Page Not Found</h1>} />
      </Routes>
    </BrowserRouter>
  );
}
