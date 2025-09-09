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
import SMEs from "./pages/solutions/SMEs";
import CA from "./pages/solutions/CA";
import Startups from "./pages/solutions/Startups";
import Enterprises from "./pages/solutions/Enterprises";
import Freelancers from "./pages/solutions/Freelancers";
import Partners from "./pages/Partners";
import FAQ from "./pages/FAQ";
import Contacts from "./pages/Contacts";
import Security from "./pages/Security";
import PartnerPortal from "./pages/PartnerPortal";
import SocialImpact from "./pages/SocialImpact";
import Products from "./pages/Products";
import AczenCRM from "./pages/products/AczenCRM";
import AczenIDE from "./pages/products/AczenIDE";
import AczenOS from "./pages/products/AczenOS";
import Start from "./pages/Start";
import Pricing from "./pages/Pricing";

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
          <Route path="/solutions/smes" element={<SMEs />} />
          <Route path="/solutions/ca" element={<CA />} />
          <Route path="/solutions/startups" element={<Startups />} />
          <Route path="/solutions/enterprises" element={<Enterprises />} />
          <Route path="/solutions/freelancers" element={<Freelancers />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/security" element={<Security />} />
          <Route path="/partner-portal" element={<PartnerPortal />} />
          <Route path="/social-impact" element={<SocialImpact />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/aczen-crm" element={<AczenCRM />} />
          <Route path="/products/aczen-ide" element={<AczenIDE />} />
          <Route path="/products/aczen-os" element={<AczenOS />} />
          <Route path="/start" element={<Start />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
