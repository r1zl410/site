import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import HomePage from "@/pages/HomePage";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUpload from "@/pages/AdminUpload";

const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID || "test";

function App() {
  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "USD" }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/upload" element={<AdminUpload />} />
        </Routes>
        <Toaster position="bottom-right" theme="dark" />
      </BrowserRouter>
    </PayPalScriptProvider>
  );
}

export default App;
