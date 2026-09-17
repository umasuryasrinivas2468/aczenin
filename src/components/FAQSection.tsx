"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { EASE, Reveal, Stagger, StaggerItem } from "@/components/motion";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem = ({ question, answer, isOpen, onClick }: FAQItemProps) => {
  return (
    <div className="border-b border-gray-200 py-5">
      <button
        className="w-full flex justify-between items-center text-left group"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <h3
          className={`text-lg font-semibold transition-colors duration-300 ${
            isOpen ? "text-smeorange-600" : "text-gray-800 group-hover:text-smeorange-600"
          }`}
        >
          {question}
        </h3>
        {/* One chevron that rotates, rather than two icons swapping */}
        <motion.span
          className="flex-shrink-0"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <ChevronDown
            className={`h-5 w-5 transition-colors duration-300 ${
              isOpen ? "text-smeorange-600" : "text-gray-500"
            }`}
          />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.4, ease: EASE }, opacity: { duration: 0.25 } }}
            className="overflow-hidden"
          >
            <p className="mt-3 text-gray-600">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQSection = () => {
  const faqs = [
    {
      id: 1,
      question: "What documents do I need to open a business account?",
      answer: "To open a business account with Aczen, you'll need your GST registration certificate, PAN card, Aadhaar card, address proof of your business, and proof of business incorporation (such as partnership deed, registration certificate, or memorandum of association).",
    },
    {
      id: 3,
      question: "Are there any minimum balance requirements?",
      answer: "No, Aczen accounts do not have minimum balance requirements. We believe in helping businesses grow without unnecessary restrictions.",
    },
    {
      id: 4,
      question: "How secure is your platform?",
      answer: "We employ high-level security measures including 256-bit encryption, multi-factor authentication, and continuous monitoring for suspicious activities. Your data and money are protected by the same security standards used by leading financial institutions.",
    },
    {
      id: 5,
      question: "Can I integrate Aczen with my accounting software?",
      answer: "Yes, Aczen seamlessly integrates with popular accounting software like Tally, Zoho Books, and QuickBooks. This allows for automatic reconciliation and real-time financial insights.",
    },
    {
      id: 6,
      question: "What kind of customer support do you offer?",
      answer: "We provide 24/7 customer support through multiple channels including phone, email, and chat. Additionally, all business accounts are assigned a dedicated relationship manager to assist with specific needs.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <Reveal className="text-center mb-12">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Find quick answers to common questions about our services
          </p>
        </Reveal>

        <Stagger className="max-w-3xl mx-auto" stagger={0.07}>
          {faqs.map((faq, index) => (
            <StaggerItem key={faq.id}>
              <FAQItem
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onClick={() => toggleFAQ(index)}
              />
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-12 text-center" delay={0.1}>
          <p className="text-gray-600 mb-6">Can't find what you're looking for?</p>
          <button className="cta-button-accent transition-transform duration-300 hover:-translate-y-0.5">
            Contact Support
          </button>
        </Reveal>
      </div>
    </section>
  );
};

export default FAQSection;
