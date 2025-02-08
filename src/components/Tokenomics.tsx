
import { motion, Variants } from "framer-motion";
import { Coins } from "lucide-react";

export const Tokenomics = () => {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="py-16 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm" id="tokenomics">
      <div className="container">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center"
        >
          <motion.div
            variants={itemVariants}
            className="p-8 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm border border-white/5 hover:border-primary/20 transition-all hover:scale-105 shadow-lg group text-center"
          >
            <Coins className="w-16 h-16 mb-4 text-primary group-hover:scale-110 transition-transform mx-auto" />
            <h3 className="text-2xl font-semibold text-gray-300 mb-2">Total Supply</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              1,000,000,000
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
