import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Help from "./pages/Help";
import Status from "./pages/Status";
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/AboutUs";
import OurStory from "./pages/OurStory";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Compliance from "./pages/Compliance";
import Careers from "./pages/Careers";
import Agoda from "./pages/Agoda";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/help" element={<Help />} />
          <Route path="/status" element={<Status />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/our-story" element={<OurStory />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/agoda" element={<Agoda />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
