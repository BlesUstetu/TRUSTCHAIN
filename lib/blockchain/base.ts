import { createPublicClient, http, isAddress, type Address } from "viem";
import { base } from "viem/chains";

function getBaseRpcUrl() {
  const url = process.env.BASE_RPC_URL;
  if (!url) {
    throw new Error("BASE_RPC_URL is not configured. Set a dedicated Base RPC endpoint before running chain checks.");
  }
  return url;
}

export function createBaseReadClient() {
  return createPublicClient({
    chain: base,
    transport: http(getBaseRpcUrl(), { timeout: 12_000 })
  });
}

/**
 * Checks only whether bytecode exists at an address on Base.
 * This does NOT verify source code, audit security, ownership safety, or project legitimacy.
 */
export async function inspectBaseAddress(input: string) {
  if (!isAddress(input)) {
    throw new Error("A valid EVM address is required.");
  }

  const address = input as Address;
  const client = createBaseReadClient();
  const [chainId, blockNumber, bytecode] = await Promise.all([
    client.getChainId(),
    client.getBlockNumber(),
    client.getBytecode({ address })
  ]);

  if (chainId !== base.id) {
    throw new Error(`RPC chain mismatch: expected ${base.id}, received ${chainId}.`);
  }

  const hasCode = Boolean(bytecode && bytecode !== "0x");
  const bytecodeBytes = hasCode ? Math.max(0, (bytecode!.length - 2) / 2) : 0;

  return {
    chainId,
    address,
    observation: hasCode ? "contract_bytecode_present" : "no_contract_bytecode",
    hasCode,
    bytecodeBytes,
    blockNumber: blockNumber.toString(),
    observedAt: new Date().toISOString(),
    limitation: "Bytecode presence is not source verification, an audit, or a safety assessment."
  } as const;
}