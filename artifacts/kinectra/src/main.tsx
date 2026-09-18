import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, polygonAmoy, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
if (API_BASE_URL) {
  setBaseUrl(API_BASE_URL);
}

const config = getDefaultConfig({
  appName: "Kinectra Sports Vault",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "f3e70e0c24d6fde9783be92af6cdbddb",
  chains: [mainnet, polygon, polygonAmoy, sepolia],
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
