import { createConfig, http } from "wagmi";
import { mainnet } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

export const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() ?? "";
export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const walletMetadata = {
  name: "Trading UI",
  description: "Realtime trading UI demo terminal",
  url: appUrl,
  icons: [],
};

const connectors = [
  metaMask({
    dappMetadata: {
      name: "Trading UI",
      url: appUrl,
    },
  }),
  injected({
    shimDisconnect: true,
  }),
];

if (reownProjectId) {
  connectors.push(
    walletConnect({
      projectId: reownProjectId,
      showQrModal: true,
      metadata: walletMetadata,
    }),
  );
}

export const appKitNetworks = [mainnet] as const;
export const isReownConfigured = Boolean(reownProjectId);
export const wagmiAdapter = isReownConfigured
  ? new WagmiAdapter({
      projectId: reownProjectId,
      networks: [...appKitNetworks],
      connectors,
      multiInjectedProviderDiscovery: true,
      ssr: true,
    })
  : null;

export const walletConfig =
  wagmiAdapter?.wagmiConfig ??
  createConfig({
    chains: [mainnet],
    connectors,
    multiInjectedProviderDiscovery: true,
    transports: {
      [mainnet.id]: http(),
    },
  });
