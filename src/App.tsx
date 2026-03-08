import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { usePreferences, useSavedArticles, useReadArticles } from "@/hooks/usePreferences";
import Onboarding from "./pages/Onboarding";
import Today from "./pages/Today";
import Saved from "./pages/Saved";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { prefs, setPrefs } = usePreferences();
  const { saved, toggle: toggleSave } = useSavedArticles();
  const { read, toggleRead } = useReadArticles();

  const handleMuteSource = (source: string) => {
    setPrefs(p => ({
      ...p,
      mutedSources: p.mutedSources.includes(source) ? p.mutedSources : [...p.mutedSources, source],
    }));
  };

  if (!prefs.onboardingComplete) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding prefs={prefs} setPrefs={setPrefs} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Today prefs={prefs} saved={saved} read={read} onToggleSave={toggleSave} onToggleRead={toggleRead} onMuteSource={handleMuteSource} />} />
      <Route path="/saved" element={<Saved saved={saved} read={read} onToggleSave={toggleSave} onToggleRead={toggleRead} />} />
      <Route path="/settings" element={<SettingsPage prefs={prefs} setPrefs={setPrefs} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
