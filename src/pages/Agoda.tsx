import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Agoda = () => {
  // Add the meta tag in a useEffect hook
  useEffect(() => {
    const metaTag = document.createElement("meta");
    metaTag.name = "agd-partner-manual-verification";
    document.head.appendChild(metaTag);

    // Clean up function to remove the meta tag when component unmounts
    return () => {
      document.head.removeChild(metaTag);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="flex items-center justify-center py-20">
        <div className="text-center">
          agoda-partner-site-verification: AgodaPartnerVerification.html
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Agoda; 