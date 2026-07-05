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
    <section id="partners" className="py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Trusted Partners
          </h2>
          <p className="text-gray-600">Building India's financial future together</p>
        </div>
      </div>

      {/* Continuously swiping logo marquee */}
      <div className="relative w-full overflow-hidden">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-32 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-32 bg-gradient-to-l from-white to-transparent" />

        <motion.div
          className="flex w-max items-center gap-12 md:gap-20"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          {marquee.map((partner, index) => (
            <div key={index} className="flex shrink-0 items-center justify-center">
              <img
                src={partner.logo}
                alt={partner.alt}
                className="h-10 md:h-14 w-auto object-contain mix-blend-multiply opacity-80 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
          ))}
        </motion.div>
      </div>

      <div className="container mx-auto px-4">
        <div className="mt-12 text-center">
          <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto">
            We've partnered with India's leading financial institutions to provide you
            with the best banking services tailored for SMEs.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
