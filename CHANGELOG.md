# Changelog

## 0.5.0 — 2026-11-02

### Reliability and efficiency
- Settlement and revenue RPC layer now retries transient failures (URL errors, timeouts) with exponential backoff (up to 3 attempts, 20s timeout).
- User-Agent updated to Kronexis-Earner/0.5.0.
- Website status display remains precise (BigInt) and now benefits from the same multi-endpoint fallback pattern plus local last-known cache.
- All 26 unit tests continue to pass. No changes to encryption, signing, or commercial boundary.

### Notes
- Still a pilot. Projections and balances are not guaranteed revenue.
- No private keys or credentials introduced.

## 0.4.2 — 2026-11-02
- Website status.js precise BigInt formatting and primary card population.
- Settlement User-Agent updated.

## 0.4.1 — 2026-11-02
- Live balance reconfirmation and initial website improvements.
