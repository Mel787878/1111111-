
import { motion } from "framer-motion";
import { Template } from "@/types/template";
import { TemplateCard } from "./market/TemplateCard";
import { SocialLinks } from "./SocialLinks";
import { TonConnectButton } from "@tonconnect/ui-react";
import { useTonWallet } from "@tonconnect/ui-react";

const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Modern Portfolio",
    price: 0.1,
    rating: 4.8,
    description: "Clean and professional portfolio template with smooth animations and responsive design.",
    features: ["Responsive Design", "Animation Effects", "Dark/Light Mode", "Contact Form"],
    image: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?fit=crop&w=800&h=450"
  },
  {
    id: "2",
    name: "Crypto Dashboard",
    price: 0.1,
    rating: 4.9,
    description: "Advanced crypto dashboard template with real-time price tracking and portfolio management.",
    features: ["Live Price Updates", "Portfolio Tracker", "Transaction History", "Market Analysis"],
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?fit=crop&w=800&h=450"
  },
  {
    id: "3",
    name: "Business Landing",
    price: 0.1,
    rating: 4.7,
    description: "Professional landing page template perfect for businesses and startups.",
    features: ["SEO Optimized", "Fast Loading", "Custom Sections", "Newsletter Integration"],
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?fit=crop&w=800&h=450"
  }
];

export const CryptoMarket = () => {
  const wallet = useTonWallet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9b87f5]/10 via-[#7E69AB]/10 to-[#6E59A5]/10">
      <div className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto"
        >
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-[#9b87f5] via-[#D946EF] to-[#8B5CF6] bg-clip-text text-transparent">
                Landing Page Templates
              </h2>
              {wallet && (
                <p className="text-gray-400 mt-2">
                  Wallet: {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
                </p>
              )}
            </div>
            <TonConnectButton />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {mockTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
              />
            ))}
          </div>
        </motion.div>
      </div>
      <SocialLinks />
    </div>
  );
};
