
import { motion } from "framer-motion";
import { StarIcon } from "lucide-react";
import { Template } from "@/types/template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TemplateCardProps {
  template: Template;
}

export const TemplateCard = ({ template }: TemplateCardProps) => {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const verifyTransaction = async (boc: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('verify-transaction', {
      body: { boc }
    });

    if (error) throw error;
    return data.status;
  };

  const handlePurchase = async () => {
    try {
      if (!wallet) {
        await tonConnectUI.connectWallet();
        return;
      }

      setIsProcessing(true);
      
      // Convert price to nanoTONs
      const priceInNanoTons = Math.floor(template.price * 1_000_000_000).toString();

      // Create transaction payload
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        messages: [
          {
            address: "UQCt1L-jsQiZ_lpT-PVYVwUVb-rHDuJd-bCN6GdZbL1_qznC",
            amount: priceInNanoTons,
          },
        ],
      };

      // Send transaction
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log("✅ Transaction sent:", result);

      // Store transaction in database
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          transaction_hash: result.boc,
          user_wallet: wallet.account.address,
          template_id: template.id,
          amount: template.price,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast({
        title: "Транзакция отправлена",
        description: "Ожидание подтверждения...",
      });

      // Poll for transaction status
      let attempts = 0;
      const maxAttempts = 20;
      const interval = 5000; // 5 seconds

      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          toast({
            title: "Время ожидания истекло",
            description: "Пожалуйста, проверьте статус в вашем кошельке",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        try {
          const status = await verifyTransaction(result.boc);
          
          if (status === 'confirmed') {
            toast({
              title: "Покупка успешна!",
              description: "Транзакция подтверждена",
            });
            setIsProcessing(false);
            return;
          } 
          
          if (status === 'failed') {
            toast({
              title: "Ошибка покупки",
              description: "Не удалось обработать транзакцию",
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          // If pending, retry after interval
          attempts++;
          setTimeout(checkStatus, interval);
          
        } catch (error) {
          console.error("❌ Verification error:", error);
          attempts++;
          setTimeout(checkStatus, interval);
        }
      };

      // Start verification after initial delay
      setTimeout(checkStatus, 5000);

    } catch (error) {
      console.error("❌ Transaction error:", error);
      toast({
        title: "Ошибка транзакции",
        description: error.message || "Не удалось завершить покупку",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
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
              {isProcessing ? "Обработка..." : wallet ? "Купить" : "Подключить кошелек"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
