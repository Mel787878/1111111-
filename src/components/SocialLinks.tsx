
import { memo } from "react";
import { motion } from "framer-motion";
import { Twitter, Send, Globe } from "lucide-react";

const SocialLinksComponent = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1 }
  };

  const socialLinks = [
    { 
      icon: Twitter, 
      href: "https://x.com/ReelMadnessBro", 
      label: "Twitter", 
      color: "text-primary hover:text-primary/80" 
    },
    { 
      icon: Send, 
      href: "https://t.me/reelbro", 
      label: "Telegram", 
      color: "text-secondary hover:text-secondary/80",
      className: "translate-y-[2px]" 
    },
    { 
      icon: Globe, 
      href: "https://www.robertgrey.io/", 
      label: "Website", 
      color: "text-accent hover:text-accent/80" 
    },
  ];

  return (
    <footer className="py-16 bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-sm">
      <div className="container flex flex-col items-center gap-8">
        <motion.nav
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="flex justify-center space-x-12"
          role="navigation"
          aria-label="Social media links"
        >
          {socialLinks.map((social) => (
            <motion.a
              key={social.label}
              variants={item}
              href={social.href}
              className={`${social.color} hover:scale-125 transition-all duration-300 transform hover:rotate-6 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full p-2`}
              aria-label={`Visit our ${social.label} page`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <social.icon 
                size={40} 
                className={`hover:animate-pulse ${social.className || ''}`}
                strokeWidth={2.5}
              />
            </motion.a>
          ))}
        </motion.nav>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 0.8, y: 0 }}
          viewport={{ once: true }}
          className="text-white/80 text-lg font-light italic text-center"
        >
          Creating custom websites tailored to your needs.<br />
          <span className="text-sm mt-2 block">
            P.S. All earnings from web development go toward funding this project. Thank you for your support!
          </span>
        </motion.p>
      </div>
    </footer>
  );
};

export const SocialLinks = memo(SocialLinksComponent);
export default SocialLinks;
