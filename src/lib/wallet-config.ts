import { createConfig, cookieStorage, createStorage, http } from "wagmi";
import { mainnet } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

/** Cookie-backed storage so SSR can hydrate connection state (faster reconnect, no flash). */
export const wagmiCookieStorage = createStorage({
  storage: cookieStorage,
  key: "wagmi",
});

export const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() ?? "";
export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const walletMetadata = {
  name: "Trading UI",
  description: "Realtime trading UI demo terminal",
  url: appUrl,
  icons: [],
};

/** Injected first: faster EIP-6963 discovery; MetaMask still available explicitly after. */
const connectors = [
  injected({
    shimDisconnect: true,
  }),
  metaMask({
    dappMetadata: {
      name: "Trading UI",
      url: appUrl,
    },
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
      storage: wagmiCookieStorage,
    })
  : null;

export const walletConfig =
  wagmiAdapter?.wagmiConfig ??
  createConfig({
    chains: [mainnet],
    connectors,
    multiInjectedProviderDiscovery: true,
    ssr: true,
    storage: wagmiCookieStorage,
    transports: {
      [mainnet.id]: http(),
    },
  });
