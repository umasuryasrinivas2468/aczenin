
import { Play } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const VideoSection = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video cursor-pointer group" onClick={() => setIsOpen(true)}>
            <img
              src="https://i3.ytimg.com/vi/bjEVBEt_0h4/maxresdefault.jpg"
              alt="Video thumbnail"
              className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Play className="w-8 h-8 text-smebank-600 ml-1" />
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              See How Aczen Works
            </h3>
            <p className="text-gray-600">
              Watch how Aczen is transforming banking for Indian SMEs
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0">
          <iframe
            width="100%"
            height="515"
            src={isOpen ? "https://www.youtube.com/embed/bjEVBEt_0h4?autoplay=1" : ""}
            title="SMEAczen Demo Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default VideoSection;
