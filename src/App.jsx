
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AppointmentBooking from "./pages/AppointmentBooking.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminAppointments from "./pages/admin/AdminAppointments.jsx";
import AdminArchives from "./pages/admin/AdminArchives.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminTreatments from "./pages/admin/AdminTreatments.jsx";
import Reports from "./pages/admin/Reports.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import CustomerLayout from "./pages/CustomerLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import Inbox from "./pages/Inbox.jsx";
import PendingApproval from "./pages/PendingApproval.jsx";
import { supabase } from "./lib/supabase.js";
import { isAdminUser, isProfileApproved } from "./lib/profileApproval.js";
import { loadUserProfile } from "./lib/profileSync.js";

function ProtectedRoute({ children, session, profile, profileReady, requireAdmin }) {
  const location = useLocation();
  const email = session?.user?.email;

  if (session === undefined || (session && !profileReady)) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && !isAdminUser(profile, email)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!requireAdmin && isAdminUser(profile, email)) {
    return <Navigate to="/admin" replace />;
  }

  if (!requireAdmin && !isProfileApproved(profile, email)) {
    return <Navigate to="/pending-approval" replace />;
  }

  return children;
}

function AuthRedirect({ session, profile, profileReady }) {
  const email = session?.user?.email;

  if (session === undefined || (session && !profileReady)) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isAdminUser(profile, email)) {
    return <Navigate to="/admin" replace />;
  }

  if (!isProfileApproved(profile, email)) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);

  const syncProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      setProfileReady(true);
      return;
    }

    setProfileReady(false);

    try {
      const loadedProfile = await loadUserProfile(userId);
      setProfile(loadedProfile);
    } catch (error) {
      console.error("Profile lookup failed:", error.message);
      setProfile(null);
    } finally {
      setProfileReady(true);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
      if (currentSession?.user?.id) {
        await syncProfile(currentSession.user.id);
      } else {
        setProfile(null);
        setProfileReady(true);
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
          setProfileReady(true);
        }
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  const userEmail = session?.user?.email;

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/"
          element={<AuthRedirect session={session} profile={profile} profileReady={profileReady} />}
        />
        <Route
          path="/login"
          element={
            session ? (
              <AuthRedirect session={session} profile={profile} profileReady={profileReady} />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/register"
          element={
            session ? (
              <AuthRedirect session={session} profile={profile} profileReady={profileReady} />
            ) : (
              <Register />
            )
          }
        />
        <Route
          element={
            <ProtectedRoute session={session} profile={profile} profileReady={profileReady}>
              <CustomerLayout session={session} profile={profile} />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={<Dashboard session={session} profile={profile} />}
          />
          <Route
            path="/inbox"
            element={<Inbox session={session} profile={profile} />}
          />
          <Route
            path="/book"
            element={<AppointmentBooking session={session} profile={profile} />}
          />
          <Route
            path="/profile"
            element={<Profile session={session} profile={profile} />}
          />
        </Route>
        <Route
          path="/pending-approval"
          element={
            session === undefined || (session && !profileReady) ? (
              <div className="loading-screen">Loading...</div>
            ) : !session ? (
              <Navigate to="/login" replace />
            ) : isAdminUser(profile, userEmail) || isProfileApproved(profile, userEmail) ? (
              <Navigate to={isAdminUser(profile, userEmail) ? "/admin" : "/dashboard"} replace />
            ) : (
              <PendingApproval profile={profile} />
            )
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute session={session} profile={profile} profileReady={profileReady} requireAdmin>
              <AdminPanel session={session} profile={profile} />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="archives" element={<AdminArchives />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="treatments" element={<AdminTreatments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={
          <div className="not-found-page">
            <h1>404</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href={`${import.meta.env.BASE_URL}login`}>Back to Home</a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
