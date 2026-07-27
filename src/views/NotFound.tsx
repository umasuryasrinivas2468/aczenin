"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const NotFound = () => {
  const pathname = usePathname();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      pathname
    );
  }, [pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl sm:text-8xl font-bold bg-gradient-to-r from-smebank-600 to-smeteal-600 text-transparent bg-clip-text mb-4">
          404
        </p>
        <h1 className="text-2xl font-bold text-foreground mb-3">Page not found</h1>
        <p className="text-base text-muted-foreground mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved or removed.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-smebank-600 to-smebank-700 text-white px-6 py-3 font-semibold shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
