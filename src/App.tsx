import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import JobDetails from "./pages/JobDetails";
import Escrow from "./pages/Escrow";
import ArbitratorDashboard from "./pages/ArbitratorDashboard";
import AdminAuth from "./pages/AdminAuth";
import PlatformReviews from "./pages/PlatformReviews";
import AssignAdmin from "./pages/AssignAdmin";
import SocialMediaMarketplace from "./pages/SocialMediaMarketplace";
import SocialMediaFavorites from "./pages/SocialMediaFavorites";
import SocialMediaListingDetail from "./pages/SocialMediaListingDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/escrow" element={<Escrow />} />
          <Route path="/admin" element={<AdminAuth />} />
          <Route path="/assign-admin" element={<AssignAdmin />} />
          <Route path="/arbitrator" element={<ArbitratorDashboard />} />
          <Route path="/reviews" element={<PlatformReviews />} />
          <Route path="/social-media" element={<SocialMediaMarketplace />} />
          <Route path="/social-media/:id" element={<SocialMediaListingDetail />} />
          <Route path="/social-media/favorites" element={<SocialMediaFavorites />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
