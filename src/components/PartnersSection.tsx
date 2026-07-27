"use client";

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

  return (
    <section id="partners" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="eyebrow">Trusted Partners</p>
            <h2 className="section-title text-slate-900">
              Building India's financial future together
            </h2>
          </div>
          <span className="tabular inline-flex items-center text-sm font-semibold text-secondary-foreground bg-secondary rounded px-2.5 py-1">
            {partners.length} partners
          </span>
        </div>

        {/* Ruled trust strip: full-colour logos scroll over a brand-tinted band */}
        <div className="marquee-pause border-y-2 border-slate-900 overflow-hidden no-scrollbar bg-gradient-to-r from-smebank-50 via-white to-smeteal-50">
          <div className="flex w-max animate-marquee">
            {[...partners, ...partners].map((partner, i) => (
              <div
                key={`${partner.name}-${i}`}
                className="flex w-44 md:w-56 shrink-0 items-center justify-center border-r border-slate-200 p-6 md:p-8"
                aria-hidden={i >= partners.length}
              >
                <img
                  src={partner.logo}
                  alt={i < partners.length ? partner.alt : ""}
                  className="h-9 md:h-12 w-auto object-contain transition-transform duration-300 hover:scale-105 motion-reduce:transition-none"
                />
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-sm md:text-base text-muted-foreground max-w-2xl">
          We've partnered with India's leading financial institutions to provide you
          with the best banking services tailored for SMEs.
        </p>
      </div>
    </section>
  );
};

export default PartnersSection;
