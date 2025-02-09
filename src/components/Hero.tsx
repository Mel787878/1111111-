
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-secondary/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-500"></div>
      </div>
      <div className="container px-4 py-16 text-center relative z-10">
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: [0, -20, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8 w-64 h-64 mx-auto"
        >
          <img
            src="/lovable-uploads/17aa593e-807c-49ff-9197-63f9d7df2df0.png"
            alt="REELBRO Character"
            className="w-full h-full object-contain"
          />
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 relative"
        >
          <h1 className="text-7xl md:text-9xl font-bold text-gradient drop-shadow-lg animate-pulse">
            REEL MADNESS BRO
          </h1>
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 blur-2xl -z-10"></div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl md:text-3xl mb-6 text-gray-300 drop-shadow-lg font-semibold"
        >
          The Next Generation of Meme Coins on TON Blockchain
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl md:text-2xl mb-12 text-gray-400"
        >
          Launching on Blum Memepad
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Link
            to="#buy"
            className="w-full sm:w-[240px] inline-flex items-center justify-center bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-10 py-5 rounded-full text-xl font-semibold transition-all hover:scale-105 animate-float shadow-lg hover:shadow-primary/50 backdrop-blur-sm"
          >
            Buy $REELBRO
          </Link>
          <a
            href="https://t.me/reelbro"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-[240px] inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] hover:from-[#9b87f5]/90 hover:to-[#7E69AB]/90 text-white px-10 py-5 rounded-full text-xl font-semibold transition-all hover:scale-105 shadow-lg hover:shadow-[#9b87f5]/50 backdrop-blur-sm"
          >
            <Users className="w-6 h-6" /> Community
          </a>
          <Link
            to="/market"
            className="w-full sm:w-[240px] inline-flex items-center justify-center bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-white px-10 py-5 rounded-full text-xl font-semibold transition-all hover:scale-105 animate-float shadow-lg hover:shadow-accent/50 backdrop-blur-sm"
          >
            Crypto Market
          </Link>
        </motion.div>
      </div>
    </div>
  );
};
