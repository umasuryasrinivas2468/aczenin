import { Sparkles } from "lucide-react";

const capabilities = [
  {
    title: "Agentic",
    description:
      "Autonomous agents that plan and execute multi-step workflows for faster outcomes."
  },
  {
    title: "Reasoning with accuracy 92%",
    description:
      "High-confidence reasoning designed for consistent, business-ready decision support."
  },
  {
    title: "Native languages: Hindi, Telugu",
    description:
      "Built for natural interactions in Indian languages with contextual understanding."
  },
  {
    title: "Image model fine-tuned on Mistral for BFSI",
    description:
      "Domain-tuned image intelligence for BFSI use cases with stronger extraction quality."
  }
];

const InteractiveFeaturesSection = () => {
  return (
    <section className="py-20 md:py-24 bg-[#f7f7f7]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="font-serif text-4xl md:text-6xl leading-tight text-gray-900">
            Powering India&apos;s AI-first future
          </h2>
        </div>

        <div className="max-w-[1440px] mx-auto rounded-[2.25rem] bg-[#f3f3f3] border border-[#ececec] p-5 md:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-center">
            <div className="rounded-[1.6rem] overflow-hidden bg-[#dce3ff] min-h-[320px] md:min-h-[560px]">
              <img
                src="/images/aiimage.png"
                alt="AI capabilities"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-center gap-8 md:gap-12 py-1">
              {capabilities.map((item) => (
                <div key={item.title} className="flex items-start gap-4 md:gap-5">
                  <div className="mt-1 h-8 w-8 rounded-full bg-gradient-to-br from-green-200 to-blue-200 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-[2.9rem] leading-[1.05] font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-lg md:text-[2rem] leading-[1.35] text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveFeaturesSection;
