import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import Test from "./pages/Test";
import Result from "./pages/Result";
import HistoryPage from "./pages/HistoryPage";
import Auth from "./pages/Auth";
import PKLobby from "./pages/PKLobby";
import PKRoom from "./pages/PKRoom";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import MyStats from "./pages/MyStats";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import WordsAdmin from "./pages/admin/WordsAdmin";
import UsersAdmin from "./pages/admin/UsersAdmin";
import Partners from "./pages/Partners";
import AIAssistant from "./components/AIAssistant";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/test" element={<Test />} />
            <Route path="/result/:id" element={<Result />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/pk" element={<PKLobby />} />
            <Route path="/pk/:matchId" element={<PKRoom />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-stats" element={<MyStats />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/words" element={<WordsAdmin />} />
            <Route path="/admin/users" element={<UsersAdmin />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIAssistant />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
