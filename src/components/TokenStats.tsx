
import { memo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, Clock, Coins } from "lucide-react";

const TokenStatsComponent = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <section className="py-24 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm">
      <div className="container max-w-7xl mx-auto px-4">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <motion.div
            variants={item}
            className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm border border-white/5 hover:border-primary/20 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary/20 group"
          >
            <Wallet className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold text-gray-300 mb-2">Network</h3>
            <p className="text-4xl font-bold text-gradient">TON</p>
          </motion.div>
          
          <motion.div
            variants={item}
            className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm border border-white/5 hover:border-primary/20 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-secondary/20 group"
          >
            <TrendingUp className="w-12 h-12 mb-4 text-secondary group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold text-gray-300 mb-2">Platform</h3>
            <p className="text-4xl font-bold text-gradient">Blum Memepad</p>
          </motion.div>

          <motion.div
            variants={item}
            className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm border border-white/5 hover:border-primary/20 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-accent/20 group"
          >
            <Clock className="w-12 h-12 mb-4 text-accent group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold text-gray-300 mb-2">Status</h3>
            <p className="text-4xl font-bold text-gradient">Coming Soon</p>
          </motion.div>
          
          <motion.div
            variants={item}
            className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm border border-white/5 hover:border-primary/20 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary/20 group"
          >
            <Coins className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold text-gray-300 mb-2">Total Supply</h3>
            <p className="text-4xl font-bold text-gradient">1,000,000,000</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export const TokenStats = memo(TokenStatsComponent);
export default TokenStats;
