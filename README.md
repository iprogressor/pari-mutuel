# Pari-mutuel prediction pool (TON / Tolk)

A binary (YES/NO) **pari-mutuel** prediction pool. Participants stake TON on an outcome
before a deadline, the owner records the real outcome, and winners pull their pro-rata
share of the pot. If the owner never resolves, anyone can cancel and everyone is refunded.

Built with [Acton](https://ton-blockchain.github.io/acton/). The contract lives in
`contracts/src/PredictionPool.tolk`.

## Lifecycle

```
                 bet (now < bettingDeadline)
   ┌───────────────────────────────────────────┐
   │                                            ▼
 deploy ───────────────────────────────────►  OPEN
                                               │  │
   owner resolve, winning side non-empty       │  │  no resolve by resolutionDeadline,
   (bettingDeadline ≤ now < resolutionDeadline) │  │  or winning side empty
                                               ▼  ▼
                                         RESOLVED  CANCELLED
                                               │        │
                          winners claim pro-rata        everyone claims full refund
                                               │        │
                                  owner withdrawFee (sweeps the remainder)
```

- **OPEN** — bets accepted while `now < bettingDeadline`.
- **RESOLVED** — owner set the winning outcome in `[bettingDeadline, resolutionDeadline)`. Winners claim.
- **CANCELLED** — reached if (a) anyone calls `cancel` after `resolutionDeadline` with no resolution, or
  (b) the owner resolves an outcome that nobody backed (`winSide == 0`). Everyone is refunded in full.

## Economics

- **Minimum bet:** `0.5 TON` (set at deploy).
- **Fee:** `5%` (`feeBps = 500`, set at deploy). The fee funds **all** gas/storage costs; winners
  receive the **full** computed payout (the forward fee on payouts is paid by the contract).
- **Deploy seed:** the owner must attach `≥ 0.1 TON` at deploy to cover rent + gas. Whatever is left
  of the seed (plus the fee and rounding dust) is returned to the owner via `withdrawFee`.
- **Storage reserve:** the contract always keeps `0.05 TON` for rent.

### Payout math (integer, pro-rata)

```
fee           = totalPot * feeBps / 10000      // 5% of the pot
distributable = totalPot - fee
winSide       = (winningOutcome == YES) ? totalYes : totalNo
payout(W)     = W.amount * distributable / winSide
```

The implementation multiplies all factors before the single final division for maximum precision
(`amount * totalPot * (10000 - feeBps) / (winSide * 10000)` — algebraically the same). The floor
remainder (dust) stays in the contract and is swept to the owner. On **CANCELLED**, `payout = W.amount`
(full refund, no fee).

## Messages (ops)

| op                  | who    | when                                                   | effect                                                               |
| ------------------- | ------ | ------------------------------------------------------ | -------------------------------------------------------------------- |
| `bet` (outcome)     | anyone | `OPEN`, `now < bettingDeadline`, value `≥ minBet`      | records/accumulates the stake; re-betting the other side is rejected |
| `resolve` (outcome) | owner  | `OPEN`, `bettingDeadline ≤ now < resolutionDeadline`   | sets winner → `RESOLVED` (or `CANCELLED` if that side is empty)      |
| `claim`             | bettor | `RESOLVED` (winner) or `CANCELLED` (anyone with a bet) | marks `claimed`, then sends the payout/refund                        |
| `cancel`            | anyone | `OPEN`, `now ≥ resolutionDeadline`                     | → `CANCELLED`                                                        |
| `withdrawFee`       | owner  | `RESOLVED`/`CANCELLED`, after all claims (or grace)    | sweeps fee + dust + leftover seed                                    |

Async safety: `claim` sets `claimed = true` **before** sending; if the payout bounces,
`onBouncedMessage` reverts `claimed` (identifying the claimer by the bounced-from address) so funds
are never lost.

## Get-methods

- `getStatus()` → `status, winningOutcome, bettingDeadline, resolutionDeadline`
- `getPool()` → `totalPot, totalYes, totalNo, feeBps`
- `getBet(address)` → `outcome, amount, claimed`
- `getPayout(address)` → claimable amount now (`0` if not entitled)

Encodings: `status` `0=OPEN, 1=RESOLVED, 2=CANCELLED`; `outcome` `1=YES, 2=NO` (`0`=unset).
Errors are named exit codes in `PoolErrors` (`pool_types.tolk`), e.g. `BetTooSmall`, `NotOwner`,
`ResolveTooEarly/TooLate`, `OutcomeConflict`, `AlreadyClaimed`, `NotAWinner`, `WithdrawTooEarly`,
`SeedTooSmall`, `BadConfig`.

## Trust limitation (honest)

The outcome is recorded by the **owner** — a centralized point of trust (the oracle problem). The
safety valve is `resolutionDeadline` + `cancel`: if the owner does not resolve in time, anyone can
move the pool to `CANCELLED` and every bettor is refunded, so funds never get stuck. For production,
replace this with an oracle or a dispute mechanism. Parameter validation (`bettingDeadline <
resolutionDeadline`, `feeBps ≤ 10000`, `minBet > 0`, seed `≥ 0.1 TON`) is enforced on-chain on the
deploy message.

## Layout

- `contracts/src/PredictionPool.tolk` — contract entrypoints, bounce handler, getters.
- `contracts/src/pool_types.tolk` — storage, messages, errors, reply structs, pure helpers.
- `contracts/tests/predictionPool.test.tolk` — 14 Tolk tests covering the spec.
- `contracts/scripts/{deployPool,bet,resolve,claim}.tolk` — deploy + interaction scripts.
- `contracts/wrappers/PredictionPool.gen.tolk`, `wrappers-ts/PredictionPool.gen.ts` — generated wrappers.

## Commands

```bash
acton build                  # compile contracts
acton test                   # run the Tolk tests
acton fmt --check            # formatting gate
acton check                  # linter gate

# Deploy (local emulation, then testnet)
acton script contracts/scripts/deployPool.tolk
acton script contracts/scripts/deployPool.tolk --net testnet

# Interact (pass the address printed by deployPool); outcome 1=YES, 2=NO.
# Note: acton flags go BEFORE the script path — everything after it becomes main() args.
acton script --net testnet contracts/scripts/bet.tolk     <pool-address> 1 2
acton script --net testnet contracts/scripts/resolve.tolk <pool-address> 1
acton script --net testnet contracts/scripts/claim.tolk   <pool-address>
acton script --net testnet contracts/scripts/cancel.tolk  <pool-address>
acton script --net testnet contracts/scripts/withdrawFee.tolk <pool-address>
```

Copy `.env.example` to `.env` for Toncenter API keys before using `--net`.

## Sharing with users (deep links)

Generate ready-to-confirm Tonkeeper links for a deployed pool — no frontend required:

```bash
npm install                                    # once (pulls @ton/core and qrcode)
node tools/gen-links.mjs <pool-address>        # print bet / claim / resolve / cancel / withdraw links
node tools/gen-links.mjs <pool-address> --qr   # + scannable QR in the terminal
node tools/gen-links.mjs <pool-address> --png  # + PNG QR codes saved into tools/qr/
```

Each link opens Tonkeeper with the transaction pre-filled (address, amount, op body); the user
just confirms — the `https://app.tonkeeper.com/...` form opens straight in the app from a phone
camera. Links only send actions — read pool state via a block explorer's get-methods (`getPool`,
`getPayout`, …) or a dApp. For a testnet pool, enable testnet mode in Tonkeeper.
