"use client";

import { Reveal } from "@/components/motion";

const PartnersSection = () => {
  const partners = [
    {
      name: "Axis Bank",
      logo: "/images/axis-bank.png",
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
      logo: "/images/meri-pehchan.jpg",
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
    // Served locally rather than hotlinked, so the marquee never depends on a
    // third-party CDN staying up.
    {
      name: "Google for Startups",
      logo: "/images/google-for-startups.png",
      alt: "Google for Startups logo",
    },
    {
      name: "T-Hub",
      logo: "/images/t-hub.png",
      alt: "T-Hub logo",
    },
    {
      name: "Blackbaud",
      logo: "/images/global-partner.png",
      alt: "Blackbaud logo",
    },
  ];

  // Duplicate the list so the marquee can loop seamlessly (0% -> -50%).
  const marquee = [...partners, ...partners];

  return (
    <section id="partners" className="py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Trusted Partners
          </h2>
          <p className="text-gray-600">Building India's financial future together</p>
        </Reveal>
      </div>

      {/* Continuously swiping logo marquee — pauses while hovered */}
      <div className="group relative w-full overflow-hidden">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-32 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-32 bg-gradient-to-l from-white to-transparent" />

        <div className="flex w-max items-center gap-12 md:gap-20 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {marquee.map((partner, index) => (
            <div key={index} className="flex shrink-0 items-center justify-center">
              <img
                src={partner.logo}
                alt={partner.alt}
                className="h-10 md:h-14 w-auto object-contain mix-blend-multiply opacity-70 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 hover:scale-110"
              />
            </div>
          ))}
        </div>
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
