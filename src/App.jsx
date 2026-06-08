
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AppointmentBooking from "./pages/AppointmentBooking.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default route */}
        {/* <Route path="/" element={<Navigate to="/login" />} /> */}

        {/* Auth */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Booking */}
        <Route path="/book" element={<AppointmentBooking />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminPanel />} />

        {/* fallback */}
        <Route path="*" element={<h1>404 Page Not Found</h1>} />

      </Routes>
    </BrowserRouter>
  );
}