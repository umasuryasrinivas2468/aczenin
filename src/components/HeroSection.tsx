"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import CountUp from "@/components/motion/CountUp";

const Hero = () => {
  return (
    <section className="relative pt-40 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="text-center max-w-3xl mx-auto"
        >
          <motion.div variants={staggerItem}>
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-1.5 mb-6 text-xs font-medium text-gray-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Now Live • Trusted by <CountUp value={10000} suffix="+" /> SMBs
            </span>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-5 leading-[1.1] tracking-tight"
          >
            One AI Accounting Platform to Finance &amp; Legals
          </motion.h1>

          <motion.p
            variants={staggerItem}
            className="text-base md:text-lg text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed"
          >
            Automate your invoicing, streamline GST compliance, and manage financial workflows
            with our intelligent fintech platform designed for growing businesses.
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={staggerItem} className="flex justify-center mb-10">
            <a
              href="https://dashboard.aczen.in"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-pill-dark px-8 py-3 text-base"
            >
              Get Started for Free
            </a>
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              No setup fees
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              45-day free trial
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              Cancel anytime
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
