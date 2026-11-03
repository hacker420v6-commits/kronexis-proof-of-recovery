"use strict";

const RPC_CANDIDATES = [
  "https://mainnet.base.org",
  "https://1rpc.io/base",
  "https://base-rpc.publicnode.com"
];
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const AAVE_USDC = "0x4e65fe4dba92790696d040ac24aa414708f5c0ab";
const RECIPIENT = "0x1fc6c61bccdf5534d316be5f6f3595b4ef079bd7";
const BALANCE_CALL = "0x70a08231" + "0".repeat(24) + RECIPIENT.slice(2);
const CACHE_KEY = "kronexis-last-status";

let activeRpc = RPC_CANDIDATES[0];

async function rpc(method, params, attempt = 0) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(activeRpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const message = await response.json();
    if (message.error || message.jsonrpc !== "2.0") {
      throw new Error(message.error?.message || "Invalid RPC response");
    }
    return message.result;
  } catch (err) {
    if (attempt < 1) {
      await new Promise(r => setTimeout(r, 400));
      return rpc(method, params, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryRpc(method, params) {
  let lastError = null;
  for (const candidate of RPC_CANDIDATES) {
    activeRpc = candidate;
    try {
      return await rpc(method, params);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("All Base RPC endpoints unavailable");
}

function formatUnits(atomic, decimals) {
  const base = 10n ** BigInt(decimals);
  const whole = atomic / base;
  const frac = (atomic % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

function saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) {}
}

async function refreshStatus() {
  setText("chain-note", "Querying Base mainnet…");
  setText("wallet-balance", "Checking…");
  setText("yield-balance", "Checking…");
  const cached = loadCache();
  if (cached) {
    setText("wallet-balance", cached.usdc || "—");
    setText("yield-balance", cached.aave || "—");
    setText("chain-note", "Showing last successful observation while refreshing…");
  }
  try {
    const blockHex = await tryRpc("eth_blockNumber", []);
    const block = parseInt(blockHex, 16);
    const ethHex = await tryRpc("eth_getBalance", [RECIPIENT, "latest"]);
    const ethAtomic = BigInt(ethHex);
    const usdcHex = await tryRpc("eth_call", [{ to: USDC, data: BALANCE_CALL }, "latest"]);
    const usdcAtomic = BigInt(usdcHex);
    let aaveAtomic = 0n;
    try {
      const aaveHex = await tryRpc("eth_call", [{ to: AAVE_USDC, data: BALANCE_CALL }, "latest"]);
      aaveAtomic = BigInt(aaveHex);
    } catch (_) {}

    const usdcStr = formatUnits(usdcAtomic, 6) + " USDC";
    const ethStr = formatUnits(ethAtomic, 18) + " ETH";
    const aaveStr = formatUnits(aaveAtomic, 6) + " aBasUSDC";
    const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    setText("wallet-balance", usdcStr);
    setText("yield-balance", aaveStr);
    setText("verified-revenue", "0.000000 USDC");
    setText("invoice-status", "Unpaid (no confirmed settlement)");
    setText("confirmed-block", block.toLocaleString());
    setText("usdc-balance", usdcStr);
    setText("eth-balance", ethStr);
    setText("block-number", block.toLocaleString());
    setText("last-check", now);
    setText("chain-note", `Live check at block ${block.toLocaleString()} via ${activeRpc.replace("https://", "")}. Balances are nominal and are not project revenue. Verified revenue remains $0.`);

    saveCache({ usdc: usdcStr, aave: aaveStr, block, ts: now });
  } catch (err) {
    const fallback = cached ? "Showing last cached observation. " : "Last known: 4.954804 USDC, 0 ETH (2026-10-29). ";
    setText("wallet-balance", cached?.usdc || "Unavailable");
    setText("yield-balance", cached?.aave || "Unavailable");
    setText("chain-note", fallback + "Live query failed: " + (err.message || err));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("refresh-status");
  if (btn) btn.addEventListener("click", refreshStatus);
  refreshStatus();
});
