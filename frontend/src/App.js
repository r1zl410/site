import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import LandingPage from "@/pages/LandingPage";
import BeatsPage from "@/pages/BeatsPage";
import PacksPage from "@/pages/PacksPage";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUpload from "@/pages/AdminUpload";
import AdminUploadPack from "@/pages/AdminUploadPack";

const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID || "test";

function App() {
  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "EUR" }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/beats" element={<BeatsPage />} />
          <Route path="/packs" element={<PacksPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/upload" element={<AdminUpload />} />
          <Route path="/admin/upload-pack" element={<AdminUploadPack />} />
        </Routes>
        <Toaster position="bottom-right" theme="dark" />
      </BrowserRouter>
    </PayPalScriptProvider>
  );
}

export default App;
