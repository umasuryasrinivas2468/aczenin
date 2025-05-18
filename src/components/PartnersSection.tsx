
import { useState, useEffect } from 'react';

const PartnersSection = () => {
  // These would be replaced with actual partner logos
  const partners = [
    {
      name: "Axis Bank",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Axis_Bank_logo.svg/2560px-Axis_Bank_logo.svg.png",
      alt: "Axis Bank logo"
    },
    {
      name: "Augomont",
      logo: "https://augmont.com/assets/logos/augmont-logo.webp",
      alt: "go"
    },
    {
      name: "Cashfree Payments",
      logo: "https://mma.prnewswire.com/media/1714361/Cashfree_Payments_Logo.jpg?p=facebook",
      alt: "Cashfree Payments logo"
    },
    {
      name: "DigiLocker",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRJ1dekE-1WtmOmfZl_UTAIeUMV450jmAE9g&s",
      alt: "DigiLocker logo"
    },
    {
      name: "Meri Pehchan",
      logo: "https://img1.digitallocker.gov.in/ndh/smart/images/meripehchaan-logo.png",
      alt: "Meri Pehchan logo"
    }
  ];

  // Placeholder function for responsive logos
  const [logoClasses, setLogoClasses] = useState("h-12 md:h-16");
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setLogoClasses("h-10");
      } else {
        setLogoClasses("h-12 md:h-16");
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section id="partners" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Trusted Partners</h2>
          <p className="text-gray-600">Building India's financial future together</p>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {partners.map((partner, index) => (
            <div key={index} className="flex items-center justify-center">
              <img 
                src={partner.logo} 
                alt={partner.alt} 
                className={`${logoClasses} object-contain filter grayscale hover:grayscale-0 transition-all duration-300`} 
              />
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto">
            We've partnered with India's leading financial institutions to provide you with the best banking services tailored for SMEs.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
