
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItemProps {
  index: number;
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem = ({ index, question, answer, isOpen, onClick }: FAQItemProps) => {
  return (
    <div>
      <button
        className="w-full flex items-start gap-4 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <span className="tabular text-sm text-muted-foreground pt-1 w-6 shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="flex-1 text-lg font-semibold text-slate-900">{question}</h3>
        {isOpen ? (
          <Minus className="h-5 w-5 text-secondary shrink-0 mt-1" />
        ) : (
          <Plus className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {isOpen && (
        <div className="pb-5 pl-10 pr-9 text-muted-foreground">
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
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* LEFT: sticky ledger heading */}
          <div className="md:col-span-4">
            <div className="md:sticky md:top-24">
              <p className="eyebrow">FAQ</p>
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="mt-4 text-muted-foreground">
                Find quick answers to common questions about our services
              </p>

              <div className="mt-8 border border-border p-6">
                <p className="text-muted-foreground mb-4">
                  Can't find what you're looking for?
                </p>
                <button className="btn-primary">
                  Contact Support
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: bordered register */}
          <div className="md:col-span-8">
            <div className="border-y border-border divide-y divide-border">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={faq.id}
                  index={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openIndex === index}
                  onClick={() => toggleFAQ(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
