import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { usePreferences, useSavedArticles, useReadArticles } from "@/hooks/usePreferences";
import { useLanguage } from "@/hooks/useLanguage";
import Dashboard from "./pages/Dashboard";
import Saved from "./pages/Saved";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { prefs, setPrefs } = usePreferences();
  const { saved, toggle: toggleSave } = useSavedArticles();
  const { read, markRead } = useReadArticles();
  const { lang, setLang } = useLanguage();

  const handleMuteSource = (source: string) => {
    setPrefs(p => ({
      ...p,
      mutedSources: p.mutedSources.includes(source) ? p.mutedSources : [...p.mutedSources, source],
    }));
  };

  return (
    <Routes>
      <Route path="/" element={<Dashboard prefs={prefs} setPrefs={setPrefs} saved={saved} read={read} onToggleSave={toggleSave} onMarkRead={markRead} onMuteSource={handleMuteSource} lang={lang} setLang={setLang} />} />
      <Route path="/saved" element={<Saved saved={saved} read={read} onToggleSave={toggleSave} onMarkRead={markRead} lang={lang} />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
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
