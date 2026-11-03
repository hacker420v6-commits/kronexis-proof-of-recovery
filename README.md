# Kronexis Proof-of-Recovery v0.4.1

Encrypted recovery artifacts, exact restoration verification, signed evidence, and confirmed Base USDC settlement for a fixed-scope $25 pilot.

**This is a pilot.** It does not provide passive income, storage certification, or financial advice. Revenue exists only after customer acceptance and on-chain confirmation of a qualifying transfer.

## Live reconfirmation (2026-11-02)

Base USDC balance of the project address remains **4.954804** and Base ETH remains **0** (block ~53,442,679). Unchanged from the 2026-10-29 observation. These are not project revenue.

## Contents

- `system/` — installable Python package (`kronexis-earner`), tests, strategy analyzer.
- `website/dist/` — static site (HTML/JS). Serve locally with `python -m http.server 8000 --directory website/dist`.
- Documentation, evidence snapshots, and limitations.

## Install

```bash
cd system
python -m venv .venv
.venv/bin/python -m pip install -e .
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python -m kronexis_earner --help
```

See `START_HERE.md` and `system/README.md` for delivery, invoice, settlement verification, and revenue report commands.

## Website

The included static site can be deployed to any static host. Original published domain: https://kronexis-proof-of-recovery.chronosofchaos.chatgpt.site

Wallet connection is read-only and restricted to the expected project address on Base.

## Commercial boundary

Use only customer-authorized copies. Never accept the sole copy of valuable data. Agree on scope, retention, price, and eligibility before payment. KX-POR-1 is a pilot format with no independent security audit.

Contact: Chronosofchaos@gmail.com
