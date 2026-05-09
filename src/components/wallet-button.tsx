"use client";

import { useAppKit } from "@reown/appkit/react";
import { useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { isReownConfigured } from "@/lib/wallet-config";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton() {
  if (!isReownConfigured) {
    return (
      <button
        type="button"
        disabled
        title="Add NEXT_PUBLIC_REOWN_PROJECT_ID to enable Reown wallet modal"
        className="rounded-md border border-border bg-panel-elevated px-3 py-1.5 text-xs font-medium text-text-primary transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        Connect Wallet
      </button>
    );
  }

  return <ReownWalletButton />;
}

function ReownWalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  useEffect(() => {
    const handleOpenWalletModal = () => open();
    window.addEventListener("trading-ui:open-wallet-modal", handleOpenWalletModal);
    return () => {
      window.removeEventListener("trading-ui:open-wallet-modal", handleOpenWalletModal);
    };
  }, [open]);

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-md border border-border bg-panel-elevated px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-panel"
        title="Disconnect wallet"
      >
        {shortAddress(address)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => open()}
      title="Connect wallet"
      className="rounded-md border border-border bg-panel-elevated px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-panel"
    >
      Connect Wallet
    </button>
  );
}
