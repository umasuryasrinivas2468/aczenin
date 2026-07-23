
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <p className="eyebrow">Industries</p>
          <h2 className="section-title text-slate-900">Industries We Serve</h2>
          <p className="text-muted-foreground max-w-2xl mt-2">
            Tailored banking solutions for various business sectors across India
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded overflow-hidden">
          {industries.map((industry, index) => (
            <a
              key={index}
              href="#"
              className="group relative flex flex-col bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={industry.image}
                  alt={industry.name}
                  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                />
                <span className="tabular absolute top-3 left-3 bg-white/95 border border-border px-2 py-0.5 text-xs text-secondary">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-4 border-t border-border">
                <h3 className="text-base md:text-lg font-semibold text-slate-900">
                  {industry.name}
                </h3>
                <span
                  aria-hidden="true"
                  className="tabular text-secondary transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustrySection;
