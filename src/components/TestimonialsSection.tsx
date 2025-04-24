
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Rajesh Kumar",
    position: "Founder, TechSpark Solutions",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTJ8fHByb2ZpbGUlMjBpbmRpYW58ZW58MHx8MHx8&auto=format&fit=crop&w=200&q=80",
    quote: "SMEPower has been a game-changer for our business. The instant loan feature helped us expand operations when we needed it most.",
    rating: 5,
  },
  {
    id: 2,
    name: "Priya Sharma",
    position: "CEO, Artisan Handicrafts",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8cHJvZmlsZXxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=200&q=80",
    quote: "The cash flow insights feature gives me visibility I never had before. I can now make confident decisions about investments and expenses.",
    rating: 5,
  },
  {
    id: 3,
    name: "Amit Patel",
    position: "Director, Sunrise Electronics",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTB8fHByb2ZpbGV8ZW58MHx8MHx8&auto=format&fit=crop&w=200&q=80",
    quote: "Managing our GST invoices was always a hassle until we switched to SMEPower. The automation saves us hours every week.",
    rating: 4,
  },
  {
    id: 4,
    name: "Meera Iyer",
    position: "Founder, Organic Essentials",
    image: "https://images.unsplash.com/photo-1619946794135-5bc917a27793?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MzB8fHByb2ZpbGV8ZW58MHx8MHx8&auto=format&fit=crop&w=200&q=80",
    quote: "The 24/7 support is exceptional. Our dedicated relationship manager understands our business needs and is always available to help.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const nextTestimonial = () => {
    setActiveIndex((current) => (current + 1) % testimonials.length);
  };
  
  const prevTestimonial = () => {
    setActiveIndex((current) => 
      current === 0 ? testimonials.length - 1 : current - 1
    );
  };

  // Auto-rotate testimonials
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(nextTestimonial, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isPaused]);

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Join thousands of satisfied SME owners who've transformed their business banking experience
          </p>
        </div>
        
        <div 
          className="relative max-w-4xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="overflow-hidden relative">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div 
                  key={testimonial.id} 
                  className="w-full flex-shrink-0 px-4"
                >
                  <div className="bg-white rounded-2xl p-8 shadow-lg">
                    <div className="flex items-center gap-4 mb-6">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name} 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-semibold text-xl">{testimonial.name}</h4>
                        <p className="text-gray-500">{testimonial.position}</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 italic mb-6">"{testimonial.quote}"</p>
                    
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-5 w-5 ${
                            i < testimonial.rating 
                              ? "text-smeorange-500 fill-smeorange-500" 
                              : "text-gray-300"
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation buttons */}
          <button 
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white shadow-md rounded-full p-2 z-10"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          
          <button 
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white shadow-md rounded-full p-2 z-10"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>
          
          {/* Indicators */}
          <div className="flex justify-center mt-8 gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`w-3 h-3 rounded-full ${
                  i === activeIndex ? "bg-smebank-600" : "bg-gray-300"
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
