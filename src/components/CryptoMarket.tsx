
import { motion } from "framer-motion";
import { useState } from "react";

export const CryptoMarket = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9b87f5]/10 via-[#7E69AB]/10 to-[#6E59A5]/10 py-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-[#9b87f5] via-[#D946EF] to-[#8B5CF6] bg-clip-text text-transparent">
          Landing Page Templates
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Template cards will be added here */}
          <div className="text-white text-center">Coming Soon</div>
        </div>
      </motion.div>
    </div>
  );
};
