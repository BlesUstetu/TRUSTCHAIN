"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiweMessage } from "siwe";
import { base } from "viem/chains";
import { createWalletClient, custom, isAddress } from "viem";

type EthereumProvider = { request(args: { method: string; params?: unknown[] | object }): Promise<unknown> };
declare global { interface Window { ethereum?: EthereumProvider } }

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const target = new URL(value, window.location.origin);
    return target.origin === window.location.origin ? target.pathname + target.search + target.hash : "/";
  } catch { return "/"; }
}

export function WalletLoginButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connectAndSignIn() {
    if (!window.ethereum) {
      setError("No injected wallet found. Install MetaMask or a compatible wallet extension.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts?.[0];
      if (!address || !isAddress(address)) throw new Error("The connected wallet returned an invalid address.");

      const chainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
      if (Number.parseInt(chainId, 16) !== base.id) {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2105" }] });
      }

      const nonceResponse = await fetch("/api/auth/siwe/nonce", { cache: "no-store", credentials: "same-origin" });
      if (!nonceResponse.ok) throw new Error("Could not start wallet authentication. Please try again.");
      const { nonce } = await nonceResponse.json() as { nonce: string };
      const siwe = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Trustchain. This request will not move funds or execute a blockchain transaction.",
        uri: window.location.origin,
        version: "1",
        chainId: base.id,
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      });

      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain: base,
        transport: custom(window.ethereum)
      });
      const signature = await walletClient.signMessage({
        account: address as `0x${string}`,
        message: siwe.prepareMessage()
      });

      const verifyResponse = await fetch("/api/auth/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ message: siwe.prepareMessage(), signature })
      });
      const result = await verifyResponse.json() as { error?: string };
      if (!verifyResponse.ok) throw new Error(result.error || "Wallet verification failed.");
      router.replace(safeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Wallet sign-in failed.";
      setError(message.toLowerCase().includes("user rejected") ? "Wallet signature was cancelled." : message);
    } finally { setBusy(false); }
  }

  return (
    <div className="wallet-auth">
      <button className="oauth-button wallet-auth-button" type="button" onClick={connectAndSignIn} disabled={busy}>
        <span className="wallet-auth-mark" aria-hidden="true">◈</span>
        {busy ? "Connecting wallet…" : "Continue with Wallet"}
      </button>
      <p className="wallet-auth-caption">Base network · Sign a message only · No gas fee</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}
