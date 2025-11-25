import { useState, useEffect } from "react";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Camera from "./pages/Camera";
import Tagging from "./pages/Tagging";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SplashScreen from "./components/SplashScreen";
import Upload from "./components/ui/upload";
import { VoiceTest } from "./pages/VoiceTest";
import { VoiceDebug } from "./pages/VoiceDebug";
import NavigationScreen from "./pages/NavigationScreen";
import { NavigationProvider } from "./contexts/NavigationContext";


const queryClient = new QueryClient();

/**
 * Page transition wrapper component
 * Handles fade-in animations between route changes
 */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="animate-fade-in">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/tagging" element={<Tagging />} />
        <Route path="/settings" element={<Settings />} />
        {/* Removed /navigation route - unused Navigation.tsx component */}
        {/* NavigationScreen.tsx provides turn-by-turn navigation functionality */}
        <Route path="/navigation-screen" element={<NavigationScreen />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/voice-test" element={<VoiceTest />} />
        <Route path="/voice-debug" element={<VoiceDebug />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [lastRoute, setLastRoute] = useState<string>("/");

  // Persist navigation state across reloads
  useEffect(() => {
    const savedRoute = localStorage.getItem("lastRoute");
    if (savedRoute) {
      setLastRoute(savedRoute);
    }
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      localStorage.setItem("lastRoute", window.location.pathname);
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NavigationProvider>
          <Toaster />
          <Sonner />
          {showSplash && <SplashScreen onLoadComplete={() => setShowSplash(false)} />}
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </NavigationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
