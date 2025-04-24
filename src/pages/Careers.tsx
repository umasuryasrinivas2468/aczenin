import React, { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Careers = () => {
  useEffect(() => {
    // Redirect to Tally.so form
    window.location.href = "https://tally.so/r/3XB2PO";
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Redirecting to Aczen Careers...</h1>
          <p className="text-gray-600">
            If you are not redirected automatically, please{" "}
            <a 
              href="https://tally.so/r/3XB2PO" 
              className="text-smebank-600 hover:underline"
            >
              click here
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Careers; 