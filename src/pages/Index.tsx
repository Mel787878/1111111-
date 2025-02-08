
import { Hero } from "@/components/Hero";
import { TokenStats } from "@/components/TokenStats";
import { SocialLinks } from "@/components/SocialLinks";
import { Tokenomics } from "@/components/Tokenomics";

const Index = () => {
  return (
    <div className="min-h-screen bg-black">
      <Hero />
      <TokenStats />
      <Tokenomics />
      <SocialLinks />
    </div>
  );
};

export default Index;
