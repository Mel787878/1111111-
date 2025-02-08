
import { motion } from "framer-motion";
import { StarIcon } from "lucide-react";
import { Template } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface TemplateCardProps {
  template: Template;
}

export const TemplateCard = ({ template }: TemplateCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm hover:border-primary/20 transition-all duration-300">
        <CardHeader className="p-0">
          <div className="aspect-video w-full overflow-hidden">
            <img 
              src={template.image} 
              alt={template.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">{template.name}</h3>
            <div className="flex items-center gap-1">
              <StarIcon className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-white">{template.rating}</span>
            </div>
          </div>
          <p className="text-gray-400 mb-4">{template.description}</p>
          <div className="space-y-2">
            {template.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                {feature}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <div className="w-full flex items-center justify-between">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ${template.price}
            </span>
            <Button 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            >
              Purchase
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
