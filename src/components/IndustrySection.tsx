
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
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-12">
          <span className="eyebrow mb-4">
            <span className="h-1.5 w-1.5 bg-smeteal-500" />
            Built for every industry
          </span>
          <h2 className="section-title text-slate-900 mb-4">Industries We Serve</h2>
          <p className="text-slate-900 max-w-2xl">
            Tailored banking solutions for various business sectors across India
          </p>
        </div>

        <ul className="border-2 border-slate-900 shadow-soft-lg">
          {industries.map((industry, index) => (
            <li
              key={index}
              className={`group flex items-center gap-4 sm:gap-8 p-4 sm:p-6 border-b-2 border-slate-900 last:border-b-0 transition-all duration-150 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none ${
                index % 2 === 1 ? "bg-smeteal-400" : "bg-white"
              }`}
            >
              <span className="display text-slate-900 shrink-0 w-16 sm:w-24 tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="flex-1 text-2xl sm:text-4xl font-bold text-slate-900">
                {industry.name}
              </h3>
              <div className="shrink-0 w-16 h-16 sm:w-24 sm:h-24 border-2 border-slate-900 bg-white overflow-hidden">
                <img
                  src={industry.image}
                  alt={industry.name}
                  className="object-cover w-full h-full"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default IndustrySection;
