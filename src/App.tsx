import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import SearchGlobal from "@/components/SearchGlobal";
import Home from "@/pages/Home";
import Explorar from "@/pages/Explorar";
import Company from "@/pages/Company";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Checkout from "@/pages/Checkout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center">Cargando...</div>;
  return token ? <Navigate to="/dashboard" /> : <>{children}</>;
}

function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <AuthProvider>
      <CartProvider>
        <ThemeProvider>
          <Toaster position="top-right" richColors />
          <BrowserRouter>
            <Navbar onSearchOpen={() => setIsSearchOpen(true)} />
            <SearchGlobal isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explorar" element={<Explorar />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/negocio/:slug" element={<Company />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />          </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
