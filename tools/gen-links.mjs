// tools/gen-links.mjs
//
// Generate Tonkeeper deep links (and optionally QR codes) for a deployed PredictionPool.
// Each link opens Tonkeeper with a pre-filled transaction; the user just confirms.
// Links are write-only (they send an op) — read pool state via an explorer or a dApp.
//
// Usage:
//   npm install                                       # once
//   node tools/gen-links.mjs <pool-address> [betTon]  # print links
//   node tools/gen-links.mjs <pool-address> --qr      # also print scannable QR in the terminal
//   node tools/gen-links.mjs <pool-address> --png     # also save PNG QR codes into tools/qr/
//
// Op bodies (opcode + fields) mirror contracts/src/pool_types.tolk.

import { mkdirSync } from 'node:fs';
import { Address, beginCell, toNano } from '@ton/core';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));

const pool = positional[0];
const betAmount = positional[1] ?? '2';
const wantQr = flags.has('--qr');
const wantPng = flags.has('--png');

if (!pool) {
  console.error(
    'Usage: node tools/gen-links.mjs <pool-address> [betTon] [--qr] [--png]',
  );
  process.exit(1);
}

try {
  Address.parse(pool); // validate only; keep the original string (preserves the testnet/mainnet flag)
} catch {
  console.error(`Invalid TON address: ${pool}`);
  process.exit(1);
}

const YES = 1;
const NO = 2;

// Message bodies: 32-bit opcode [+ fields], exactly as the contract serializes them.
const bet = (o) =>
  beginCell().storeUint(0x5ada4c01, 32).storeUint(o, 8).endCell();
const resolve = (o) =>
  beginCell().storeUint(0x5ada4c02, 32).storeUint(o, 8).endCell();
const claim = () => beginCell().storeUint(0x5ada4c03, 32).endCell();
const cancel = () => beginCell().storeUint(0x5ada4c04, 32).endCell();
const withdraw = () => beginCell().storeUint(0x5ada4c05, 32).endCell();

// Tonkeeper transfer link: amount in nanotons, bin = base64url(BoC of the body).
const link = (amountTon, body) =>
  `https://app.tonkeeper.com/transfer/${pool}` +
  `?amount=${toNano(amountTon).toString()}` +
  `&bin=${body.toBoc().toString('base64url')}`;

const ops = [
  {
    name: 'bet-yes',
    label: `BET ${betAmount} TON -> YES (anyone)`,
    url: link(betAmount, bet(YES)),
  },
  {
    name: 'bet-no',
    label: `BET ${betAmount} TON -> NO  (anyone)`,
    url: link(betAmount, bet(NO)),
  },
  {
    name: 'claim',
    label: 'CLAIM payout/refund (bettor)',
    url: link('0.1', claim()),
  },
  {
    name: 'cancel',
    label: 'CANCEL after deadline (anyone)',
    url: link('0.05', cancel()),
  },
  {
    name: 'resolve-yes',
    label: 'RESOLVE -> YES (owner)',
    url: link('0.05', resolve(YES)),
  },
  {
    name: 'resolve-no',
    label: 'RESOLVE -> NO  (owner)',
    url: link('0.05', resolve(NO)),
  },
  {
    name: 'withdraw',
    label: 'WITHDRAW fee + leftover (owner)',
    url: link('0.05', withdraw()),
  },
];

console.log(`\nPredictionPool deep links for ${pool}\n`);
for (const { label, url } of ops) {
  console.log(`${label}:\n  ${url}\n`);
}

// QR output is opt-in so the base script runs without the `qrcode` package.
if (wantQr || wantPng) {
  let QRCode;
  try {
    QRCode = (await import('qrcode')).default;
  } catch {
    console.error('QR output needs the "qrcode" package — run: npm install');
    process.exit(1);
  }

  if (wantPng) {
    const dir = 'tools/qr';
    mkdirSync(dir, { recursive: true });
    for (const { name, url } of ops) {
      await QRCode.toFile(`${dir}/${name}.png`, url, { width: 512, margin: 2 });
    }
    console.log(`Saved ${ops.length} PNG QR codes to ${dir}/`);
  }

  if (wantQr) {
    for (const { label, url } of ops) {
      console.log(`\n${label}:`);
      console.log(
        await QRCode.toString(url, { type: 'terminal', small: true }),
      );
    }
  }
}
