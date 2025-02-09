
import { motion } from "framer-motion";
import { StarIcon } from "lucide-react";
import { Template } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SendTransactionRequest } from '@tonconnect/sdk';

interface TemplateCardProps {
  template: Template;
}

export const TemplateCard = ({ template }: TemplateCardProps) => {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    if (!wallet) {
      try {
        await tonConnectUI.connectWallet();
        return;
      } catch (e) {
        console.error("Failed to connect wallet:", e);
        toast({
          title: "Connection failed",
          description: "Failed to connect wallet. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsProcessing(true);
    try {
      const priceInNanoTons = Math.floor(template.price * 1000000000);
      
      // Define transaction according to correct SendTransactionRequest type
      const transaction: SendTransactionRequest = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: "UQCt1L-jsQiZ_lpT-PVYVwUVb-rHDuJd-bCN6GdZbL1_qznC",
            amount: priceInNanoTons.toString(),
            payload: "", // Optional payload
            stateInit: null // Optional state init
          }
        ]
      };

      console.log("Initiating transaction:", transaction);
      console.log("Connected wallet address:", wallet.account.address);
      
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log("✅ Transaction completed:", result);
      
      toast({
        title: "Purchase successful",
        description: `Template "${template.name}" purchased successfully!`,
      });

    } catch (error: any) {
      console.error("❌ Transaction failed:", error);
      
      let errorMessage = "Failed to complete the purchase";
      if (error.message?.includes("rejected")) {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message?.includes("insufficient")) {
        errorMessage = "Insufficient funds in wallet";
      }
      
      toast({
        title: "Transaction failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine button text based on wallet and processing state
  const getButtonText = () => {
    if (isProcessing) return "Processing...";
    if (!wallet) return "Connect Wallet";
    return `Purchase for ${template.price} TON`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className="overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 h-full flex flex-col">
        <CardHeader className="p-0">
          <div className="aspect-video w-full overflow-hidden">
            <img 
              src={template.image} 
              alt={template.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6 flex-grow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">{template.name}</h3>
            <div className="flex items-center gap-1">
              <StarIcon className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-white">{template.rating}</span>
            </div>
          </div>
          <p className="text-gray-400 mb-4 line-clamp-2">{template.description}</p>
          <div className="space-y-2">
            {template.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                {feature}
              </div>
            ))}
          </div>
          {wallet && (
            <p className="text-sm text-gray-400 mt-4">
              Connected: {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
            </p>
          )}
        </CardContent>
        <CardFooter className="p-6 pt-0 mt-auto">
          <div className="w-full flex items-center justify-between">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {template.price} TON
            </span>
            <Button 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
              onClick={handlePurchase}
              disabled={isProcessing}
            >
              {getButtonText()}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
