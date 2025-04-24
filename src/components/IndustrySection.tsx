
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
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Industries We Serve</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Tailored banking solutions for various business sectors across India
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {industries.map((industry, index) => (
            <div key={index} className="relative group overflow-hidden rounded-xl">
              <div className="aspect-square relative">
                <img
                  src={industry.image}
                  alt={industry.name}
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-semibold">{industry.name}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustrySection;
