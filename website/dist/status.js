"use strict";

const RPC_CANDIDATES = [
  "https://mainnet.base.org",
  "https://1rpc.io/base",
  "https://base-rpc.publicnode.com"
];
const CHAIN_ID = 8453;
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const AAVE_USDC = "0x4e65fe4dba92790696d040ac24aa414708f5c0ab";
const RECIPIENT = "0x1fc6c61bccdf5534d316be5f6f3595b4ef079bd7";
const START_BLOCK = 53247214;
const REQUIRED_ATOMIC = 25000000n;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const RECIPIENT_TOPIC = "0x" + "0".repeat(24) + RECIPIENT.slice(2);
const BALANCE_CALL = "0x70a08231" + "0".repeat(24) + RECIPIENT.slice(2);

let activeRpc = RPC_CANDIDATES[0];

async function rpc(method, params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(activeRpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
    const message = await response.json();
    if (message.error || message.jsonrpc !== "2.0") throw new Error(message.error?.message || "Invalid RPC response");
    return message.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryRpc(method, params) {
  for (const candidate of RPC_CANDIDATES) {
    activeRpc = candidate;
    try {
      return await rpc(method, params);
    } catch (e) {
      console.warn(`RPC ${candidate} failed:`, e.message);
    }
  }
  throw new Error("All Base RPC endpoints unavailable");
}

function formatUsdc(atomic) {
  const whole = atomic / 1000000n;
  const fraction = (atomic % 1000000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction} USDC` : `${whole} USDC`;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function refreshStatus() {
  setText("chain-note", "Querying Base mainnet…");
  try {
    const blockHex = await tryRpc("eth_blockNumber", []);
    const block = parseInt(blockHex, 16);
    const ethHex = await tryRpc("eth_getBalance", [RECIPIENT, "latest"]);
    const ethDisplay = (Number(BigInt(ethHex)) / 1e18).toFixed(6);
    const usdcHex = await tryRpc("eth_call", [{ to: USDC, data: BALANCE_CALL }, "latest"]);
    const usdcAtomic = BigInt(usdcHex);
    const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    setText("usdc-balance", formatUsdc(usdcAtomic));
    setText("eth-balance", ethDisplay + " ETH");
    setText("block-number", block.toLocaleString());
    setText("last-check", now);
    setText("chain-note", `Live check at block ${block.toLocaleString()} via ${activeRpc.replace("https://", "")}. Balances are nominal and not project revenue.`);
  } catch (err) {
    setText("chain-note", "Live chain query failed. Displaying last known observation (2026-10-29). " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("refresh-status");
  if (btn) btn.addEventListener("click", refreshStatus);
  refreshStatus();
});
