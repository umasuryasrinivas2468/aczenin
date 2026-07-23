"use client";

import { motion } from "framer-motion";

const PartnersSection = () => {
  const partners = [
    {
      name: "Axis Bank",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Axis_Bank_logo.svg/2560px-Axis_Bank_logo.svg.png",
      alt: "Axis Bank logo",
    },
    {
      name: "RBIH",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBXpkhDkGNcO17AabAgyRuAN0qWfsgHskVPFQIoVqziQ&s=10",
      alt: "RBIH logo",
    },
    {
      name: "Cashfree Payments",
      logo: "https://mma.prnewswire.com/media/1714361/Cashfree_Payments_Logo.jpg?p=facebook",
      alt: "Cashfree Payments logo",
    },
    {
      name: "Razorpay Payments",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4ZINwbuS7as4WWbZ9ExK5nnik9YQR3ENtSyMIM1NfkEXCgOGDQhZQ2Lyh&s=10",
      alt: "Razorpay Payments logo",
    },
    {
      name: "DigiLocker",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRJ1dekE-1WtmOmfZl_UTAIeUMV450jmAE9g&s",
      alt: "DigiLocker logo",
    },
    {
      name: "Meri Pehchan",
      logo: "https://img1.digitallocker.gov.in/ndh/smart/images/meripehchaan-logo.png",
      alt: "Meri Pehchan logo",
    },
    {
      name: "mistral",
      logo: "https://www.datocms-assets.com/14946/1760515594-mistral-ai-logo.jpg?auto=format&fit=max&w=1200",
      alt: "Mistral AI logo",
    },
    {
      name: "trust",
      logo: "https://dka575ofm4ao0.cloudfront.net/pages-transactional_logos/retina/280215/TrustCloud-cloud-logo-78288c52-9e8b-482f-abc2-83cda4f3722c.png",
      alt: "TrustCloud logo",
    },
  ];

  // Duplicate the list so the marquee can loop seamlessly (0% -> -50%).
  const marquee = [...partners, ...partners];

  return (
    <section id="partners" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
        <div className="border-2 border-slate-900 bg-smebank-50 shadow-soft p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <span className="eyebrow mb-4">
              <span className="h-1.5 w-1.5 bg-smeteal-400" />
              Our network
            </span>
            <h2 className="section-title text-slate-900">Trusted Partners</h2>
          </div>
          <p className="text-slate-900 md:text-right md:max-w-xs">
            Building India's financial future together
          </p>
        </div>
      </div>

      {/* Full-width bordered ticker band of partner cells */}
      <div className="relative w-full overflow-hidden border-y-2 border-slate-900 bg-white">
        <motion.div
          className="flex w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          {marquee.map((partner, index) => (
            <div
              key={index}
              className="flex shrink-0 items-center justify-center gap-3 border-r-2 border-slate-900 bg-white px-8 md:px-12 py-8"
            >
              <img
                src={partner.logo}
                alt={partner.alt}
                className="h-10 md:h-12 w-auto object-contain"
              />
            </div>
          ))}
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mt-12 border-2 border-slate-900 bg-white shadow-soft p-6 md:p-8 max-w-2xl mx-auto text-center">
          <p className="text-sm md:text-base text-slate-900">
            We've partnered with India's leading financial institutions to provide you
            with the best banking services tailored for SMEs.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
