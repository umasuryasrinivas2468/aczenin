
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem = ({ question, answer, isOpen, onClick }: FAQItemProps) => {
  return (
    <div className="border-2 border-slate-900 bg-white shadow-soft">
      <button
        className="w-full flex justify-between items-start gap-4 text-left p-5"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-bold text-slate-900">{question}</h3>
        <span
          className={`flex-shrink-0 flex items-center justify-center h-8 w-8 border-2 border-slate-900 ${
            isOpen ? "bg-smebank-500 text-white" : "bg-smeteal-400 text-slate-900"
          }`}
        >
          {isOpen ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 -mt-1 text-slate-900/70">
          <p>{answer}</p>
        </div>
      )}
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
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left: sticky heading + intro */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <span className="eyebrow mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-smeteal-500" />
                FAQ
              </span>
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="section-subtitle">
                Find quick answers to common questions about our services
              </p>
              <div className="mt-8 border-2 border-slate-900 bg-smebank-50 p-6 shadow-soft">
                <p className="text-slate-900/70 mb-4">
                  Can't find what you're looking for?
                </p>
                <button className="cta-button-accent">
                  Contact Support
                </button>
              </div>
            </div>
          </div>

          {/* Right: chunky bordered accordion rows */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {faqs.map((faq, index) => (
              <FAQItem
                key={faq.id}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onClick={() => toggleFAQ(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
