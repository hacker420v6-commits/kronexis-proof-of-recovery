# Changelog

## 0.4.2 — 2026-11-02

### Fixes and improvements
- Website `status.js`: removed dead code, switched ETH/USDC formatting to precise BigInt units, added optional Aave aBasUSDC position display, improved RPC error reporting, and cleaned fallback logic.
- Updated RPC User-Agent string in the settlement verifier from the outdated 0.1 label to 0.4.2.
- Package version bumped. All existing unit tests continue to pass.
- Live Base balances remain unchanged (4.954804 USDC, 0 ETH) as of the previous reconfirmation.

### Notes
- No changes to encryption, signing, settlement verification logic, or commercial boundaries.
- Website continues to treat all balances as nominal and distinct from verified project revenue.

## 0.4.1 — 2026-11-02

### Improvements
- Live on-chain reconfirmation of Base USDC (4.954804) and ETH (0) balances.
- Initial website status improvements, dark mode, and version badge.
- Public source repository created.
