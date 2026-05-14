"use client";

import Navbar from "@/components/Navbar";

const DOCS_URL = "https://aczen-d43c4738.mintlify.app";

const Docs = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1 flex">
        <iframe
          src={DOCS_URL}
          title="Aczen Documentation"
          className="w-full border-0"
          style={{ height: "calc(100vh - 80px)" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
};

export default Docs;
