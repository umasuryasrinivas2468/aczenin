"use client";

import { Reveal, Stagger, StaggerItem, TiltCard } from "@/components/motion";

const industries = [
  {
    name: "Retail",
    image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Manufacturing",
    image: "https://images.unsplash.com/photo-1574472374272-26e91165e036?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Services",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "E-commerce",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
  }
];

const IndustrySection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <Reveal className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Industries We Serve</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Tailored banking solutions for various business sectors across India
          </p>
        </Reveal>

        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-6" stagger={0.1}>
          {industries.map((industry, index) => (
            <StaggerItem key={index}>
              <TiltCard className="relative group overflow-hidden rounded-xl" max={6}>
                <div className="aspect-square relative">
                  <img
                    src={industry.image}
                    alt={industry.name}
                    className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  {/* Brand wash that blooms in on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-smeorange-600/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="absolute bottom-4 left-4 text-white transition-transform duration-500 ease-out group-hover:-translate-y-1">
                    <h3 className="text-xl font-semibold">{industry.name}</h3>
                  </div>
                </div>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
};

export default IndustrySection;
