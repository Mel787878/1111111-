
import { Hero } from "@/components/Hero";
import { TokenStats } from "@/components/TokenStats";
import { SocialLinks } from "@/components/SocialLinks";

const Index = () => {
  return (
    <div className="min-h-screen bg-black">
      <Hero />
      <TokenStats />
      <SocialLinks />
    </div>
  );
};

export default Index;
