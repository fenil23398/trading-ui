"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { State } from "wagmi";
import { WagmiProvider } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import {
  appKitNetworks,
  isReownConfigured,
  reownProjectId,
  wagmiAdapter,
  walletConfig,
  walletMetadata,
} from "@/lib/wallet-config";

type AppProvidersProps = {
  children: React.ReactNode;
  /** Server-parsed wagmi cookie — hydrates session before client reconnect. */
  initialState?: State | undefined;
};

let appKitInitialized = false;
if (!appKitInitialized && isReownConfigured && wagmiAdapter) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId: reownProjectId,
    metadata: walletMetadata,
    networks: [...appKitNetworks],
  });
  appKitInitialized = true;
}

export function AppProviders({ children, initialState }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={walletConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
