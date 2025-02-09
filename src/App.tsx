
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { CryptoMarket } from "./components/CryptoMarket";

const queryClient = new QueryClient();

// Using absolute URL for manifest
const manifestUrl = 'https://lovable.dev/projects/96a96d3e-c9dc-45ae-b635-36c1f5745957/tonconnect-manifest.json';

const App = () => {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/market" element={<CryptoMarket />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </TonConnectUIProvider>
  );
};

export default App;
