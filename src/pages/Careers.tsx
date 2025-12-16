import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const Careers = () => {
  const benefits = [
    {
      title: "Competitive Salary",
      description: "We offer industry-competitive compensation packages."
    },
    {
      title: "Health & Wellness",
      description: "Comprehensive health insurance and wellness programs for you and your family."
    },
    {
      title: "Professional Growth",
      description: "Opportunities for skill development, training, and career advancement."
    },
    {
      title: "Flexible Work",
      description: "Flexible working hours and remote work options to maintain work-life balance."
    },
    {
      title: "Collaborative Culture",
      description: "Join a diverse, innovative team working on solving real-world problems."
    },
    {
      title: "Learning Opportunities",
      description: "Access to courses, conferences, and mentorship from industry experts."
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 mb-8">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Careers</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Join Our Team
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                We're building the future of financial technology for SMBs. If you're passionate about innovation, fintech, and creating impact, we'd love to hear from you.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                At Aczen, we believe in empowering businesses with cutting-edge solutions. Our team is growing, and we're looking for talented individuals who want to be part of this journey.
              </p>
            </div>
            <div className="md:w-1/2">
              <img
                src="https://media.licdn.com/dms/image/v2/D5622AQHVM2fPE9-cEw/feedshare-shrink_2048_1536/feedshare-shrink_2048_1536/0/1730377880596?e=1761177600&v=beta&t=bR3Mmhfbl9B69wGPt5vAYUdwCYIQWLsvyOw-5duYs98" 
                alt="Team"
                className="rounded-lg shadow-xl w-full"
              />
            </div>
          </div>
        </section>

        {/* Why Join Aczen */}
        <section className="container mx-auto px-4 mb-16 py-12 bg-gray-50 rounded-xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Join Aczen?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Be part of a mission-driven company transforming the financial technology landscape for SMBs and enterprises across India.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Life at Aczen */}
        <section className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Life at Aczen</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Get a glimpse into our vibrant workplace culture and see what it's like to be part of the Aczen family.
            </p>
          </div>
          <div className="relative px-12">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                <CarouselItem className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="rounded-lg overflow-hidden shadow-lg h-80">
                    <img
                      src="https://media.licdn.com/dms/image/v2/D5622AQHVM2fPE9-cEw/feedshare-shrink_2048_1536/feedshare-shrink_2048_1536/0/1730377880596?e=1761177600&v=beta&t=bR3Mmhfbl9B69wGPt5vAYUdwCYIQWLsvyOw-5duYs98"
                      alt="Team collaboration"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
                <CarouselItem className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="rounded-lg overflow-hidden shadow-lg h-80">
                    <img
                      src="https://media.licdn.com/dms/image/v2/D5622AQE8JP5bQuO5JA/feedshare-shrink_1280/feedshare-shrink_1280/0/1688715217408?e=1761177600&v=beta&t=hQzvPFD9Wd6QZawT6P8n3XLauc0Nql2e8HPZeydI-sM"
                      alt="Team meeting"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
                <CarouselItem className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="rounded-lg overflow-hidden shadow-lg h-80">
                    <img
                      src="https://media.licdn.com/dms/image/v2/D4E22AQGJ1_wbVotLLg/feedshare-shrink_800/B4EZVx0uoaGYAk-/0/1741371404086?e=1761177600&v=beta&t=CWYUNg79c_MTWh0g0XWu_TuKGZrz763fs2LgAkZPKMM"
                      alt="Office space"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
                <CarouselItem className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="rounded-lg overflow-hidden shadow-lg h-80">
                    <img
                      src="https://media.licdn.com/dms/image/v2/D5622AQHd6LWc_SfL2g/feedshare-shrink_1280/feedshare-shrink_1280/0/1725199566804?e=1761177600&v=beta&t=ph1tXzQR9or_fg07u5HHVAW7tGX2L-ixxPQ_pViHn4Q"
                      alt="Team building"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
                <CarouselItem className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="rounded-lg overflow-hidden shadow-lg h-80">
                    <img
                      src="https://media.licdn.com/dms/image/v2/D5622AQFCCpmcJsFmew/feedshare-shrink_1280/feedshare-shrink_1280/0/1729187811377?e=1761177600&v=beta&t=jsdnz7L4Lqk8F-VVfSi7s3wj9k2VoLZ-Sm1K8NQ12mY"
                      alt="Office culture"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-4 py-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl text-white text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Make an Impact?</h2>
          <p className="text-xl mb-8 text-red-50">
            If you don't see a perfect match, we'd still love to hear from you. Send us your resume and let's explore opportunities together.
          </p>
          <a 
            href="https://tally.so/r/3XB2PO" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-white text-red-600 hover:bg-red-50 font-bold py-4 px-12 rounded-md uppercase tracking-wide transition-colors"
          >
            Apply Now
          </a>
        </section>

        {/* Culture Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">Our Culture</h2>
            <div className="space-y-6 text-gray-600">
              <p>
                At Aczen, we foster a collaborative and innovative environment where every team member's contribution is valued. We believe in fostering diversity, creativity, and continuous learning.
              </p>
              <p>
                Our team spans various backgrounds and expertise levels, united by a shared passion for transforming financial technology and empowering SMBs across India. We celebrate successes together and learn from challenges.
              </p>
              <p>
                We're committed to creating a workplace that promotes work-life balance, professional growth, and personal development. Join us and be part of a mission to revolutionize fintech.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Careers; 