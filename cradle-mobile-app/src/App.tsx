import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/components/NotificationPopup";
import { SensorProvider } from "@/contexts/SensorContext";
import Splash    from "./pages/Splash";
import Dashboard from "./pages/Dashboard";
import History   from "./pages/History";
import Settings  from "./pages/Settings";
import NotFound  from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { pathname } = useLocation();
  const showNav = pathname !== "/" && pathname !== "/splash";

  return (
    <>
      <Routes>
        <Route path="/"          element={<Splash />} />
        <Route path="/splash"    element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history"   element={<History />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="*"          element={<NotFound />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationProvider>
          <SensorProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </SensorProvider>
        </NotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
