// AUTO-GENERATED, do not edit
// It's a TypeScript wrapper for a PredictionPool contract in Tolk.
/* eslint-disable */

import * as c from '@ton/core';
import { beginCell, ContractProvider, Sender, SendMode } from '@ton/core';

// ————————————————————————————————————————————
//   predefined types and functions
//

type StoreCallback<T> = (obj: T, b: c.Builder) => void
type LoadCallback<T> = (s: c.Slice) => T

export type CellRef<T> = {
    ref: T
}

function makeCellFrom<T>(self: T, storeFn_T: StoreCallback<T>): c.Cell {
    let b = beginCell();
    storeFn_T(self, b);
    return b.endCell();
}

function loadAndCheckPrefix32(s: c.Slice, expected: number, structName: string): void {
    let prefix = s.loadUint(32);
    if (prefix !== expected) {
        throw new Error(`Incorrect prefix for '${structName}': expected 0x${expected.toString(16).padStart(8, '0')}, got 0x${prefix.toString(16).padStart(8, '0')}`);
    }
}

function lookupPrefix(s: c.Slice, expected: number, prefixLen: number): boolean {
    return s.remainingBits >= prefixLen && s.preloadUint(prefixLen) === expected;
}

function throwNonePrefixMatch(fieldPath: string): never {
    throw new Error(`Incorrect prefix for '${fieldPath}': none of variants matched`);
}

function storeCellRef<T>(cell: CellRef<T>, b: c.Builder, storeFn_T: StoreCallback<T>): void {
    let b_ref = c.beginCell();
    storeFn_T(cell.ref, b_ref);
    b.storeRef(b_ref.endCell());
}

function loadCellRef<T>(s: c.Slice, loadFn_T: LoadCallback<T>): CellRef<T> {
    let s_ref = s.loadRef().beginParse();
    return { ref: loadFn_T(s_ref) };
}

function storeTolkNullable<T>(v: T | null, b: c.Builder, storeFn_T: StoreCallback<T>): void {
    if (v === null) {
        b.storeUint(0, 1);
    } else {
        b.storeUint(1, 1);
        storeFn_T(v, b);
    }
}

function createDictionaryValue<V>(loadFn_V: LoadCallback<V>, storeFn_V: StoreCallback<V>): c.DictionaryValue<V> {
    return {
        serialize(self: V, b: c.Builder) {
            storeFn_V(self, b);
        },
        parse(s: c.Slice): V {
            const value = loadFn_V(s);
            s.endParse();
            return value;
        }
    }
}

// ————————————————————————————————————————————
//   parse get methods result from a TVM stack
//

class StackReader {
    constructor(private tuple: c.TupleItem[]) {
    }

    static fromGetMethod(expectedN: number, getMethodResult: { stack: c.TupleReader }): StackReader {
        let tuple = [] as c.TupleItem[];
        while (getMethodResult.stack.remaining) {
            tuple.push(getMethodResult.stack.pop());
        }
        if (tuple.length !== expectedN) {
            throw new Error(`expected ${expectedN} stack width, got ${tuple.length}`);
        }
        return new StackReader(tuple);
    }

    private popExpecting<ItemT>(itemType: string): ItemT {
        const item = this.tuple.shift();
        if (item?.type === itemType) {
            return item as ItemT;
        }
        throw new Error(`not '${itemType}' on a stack`);
    }

    private popCellLike(): c.Cell {
        const item = this.tuple.shift();
        if (item && (item.type === 'cell' || item.type === 'slice' || item.type === 'builder')) {
            return item.cell;
        }
        throw new Error(`not cell/slice on a stack`);
    }

    readBigInt(): bigint {
        return this.popExpecting<c.TupleItemInt>('int').value;
    }

    readBoolean(): boolean {
        return this.popExpecting<c.TupleItemInt>('int').value !== 0n;
    }

    readCell(): c.Cell {
        return this.popCellLike();
    }

    readSlice(): c.Slice {
        return this.popCellLike().beginParse();
    }
}

// ————————————————————————————————————————————
//   auto-generated serializers to/from cells
//

type coins = bigint

type uint8 = bigint
type uint16 = bigint
type uint32 = bigint
type uint256 = bigint

/**
 > struct BetInfo {
 >     outcome: uint8
 >     amount: coins
 >     claimed: bool
 > }
 */
export interface BetInfo {
    readonly $: 'BetInfo'
    outcome: uint8
    amount: coins
    claimed: boolean
}

export const BetInfo = {
    create(args: {
        outcome: uint8
        amount: coins
        claimed: boolean
    }): BetInfo {
        return {
            $: 'BetInfo',
            ...args
        }
    },
    fromSlice(s: c.Slice): BetInfo {
        return {
            $: 'BetInfo',
            outcome: s.loadUintBig(8),
            amount: s.loadCoins(),
            claimed: s.loadBoolean(),
        }
    },
    store(self: BetInfo, b: c.Builder): void {
        b.storeUint(self.outcome, 8);
        b.storeCoins(self.amount);
        b.storeBit(self.claimed);
    },
    toCell(self: BetInfo): c.Cell {
        return makeCellFrom<BetInfo>(self, BetInfo.store);
    }
}

/**
 > struct PoolStorage {
 >     ownerAddress: address
 >     bettingDeadline: uint32
 >     resolutionDeadline: uint32
 >     minBet: coins
 >     feeBps: uint16
 >     status: uint8
 >     winningOutcome: uint8
 >     totalPot: coins
 >     totalYes: coins
 >     totalNo: coins
 >     yesCount: uint32
 >     noCount: uint32
 >     claimedCount: uint32
 >     bets: map<uint256, BetInfo>
 > }
 */
export interface PoolStorage {
    readonly $: 'PoolStorage'
    ownerAddress: c.Address
    bettingDeadline: uint32
    resolutionDeadline: uint32
    minBet: coins
    feeBps: uint16
    status: uint8
    winningOutcome: uint8
    totalPot: coins
    totalYes: coins
    totalNo: coins
    yesCount: uint32
    noCount: uint32
    claimedCount: uint32
    bets: c.Dictionary<uint256, BetInfo>
}

export const PoolStorage = {
    create(args: {
        ownerAddress: c.Address
        bettingDeadline: uint32
        resolutionDeadline: uint32
        minBet: coins
        feeBps: uint16
        status: uint8
        winningOutcome: uint8
        totalPot: coins
        totalYes: coins
        totalNo: coins
        yesCount: uint32
        noCount: uint32
        claimedCount: uint32
        bets: c.Dictionary<uint256, BetInfo>
    }): PoolStorage {
        return {
            $: 'PoolStorage',
            ...args
        }
    },
    fromSlice(s: c.Slice): PoolStorage {
        return {
            $: 'PoolStorage',
            ownerAddress: s.loadAddress(),
            bettingDeadline: s.loadUintBig(32),
            resolutionDeadline: s.loadUintBig(32),
            minBet: s.loadCoins(),
            feeBps: s.loadUintBig(16),
            status: s.loadUintBig(8),
            winningOutcome: s.loadUintBig(8),
            totalPot: s.loadCoins(),
            totalYes: s.loadCoins(),
            totalNo: s.loadCoins(),
            yesCount: s.loadUintBig(32),
            noCount: s.loadUintBig(32),
            claimedCount: s.loadUintBig(32),
            bets: c.Dictionary.load<uint256, BetInfo>(c.Dictionary.Keys.BigUint(256), createDictionaryValue<BetInfo>(BetInfo.fromSlice, BetInfo.store), s),
        }
    },
    store(self: PoolStorage, b: c.Builder): void {
        b.storeAddress(self.ownerAddress);
        b.storeUint(self.bettingDeadline, 32);
        b.storeUint(self.resolutionDeadline, 32);
        b.storeCoins(self.minBet);
        b.storeUint(self.feeBps, 16);
        b.storeUint(self.status, 8);
        b.storeUint(self.winningOutcome, 8);
        b.storeCoins(self.totalPot);
        b.storeCoins(self.totalYes);
        b.storeCoins(self.totalNo);
        b.storeUint(self.yesCount, 32);
        b.storeUint(self.noCount, 32);
        b.storeUint(self.claimedCount, 32);
        b.storeDict<uint256, BetInfo>(self.bets, c.Dictionary.Keys.BigUint(256), createDictionaryValue<BetInfo>(BetInfo.fromSlice, BetInfo.store));
    },
    toCell(self: PoolStorage): c.Cell {
        return makeCellFrom<PoolStorage>(self, PoolStorage.store);
    }
}

/**
 > struct (0x5ada4c01) Bet {
 >     outcome: uint8
 > }
 */
export interface Bet {
    readonly $: 'Bet'
    outcome: uint8
}

export const Bet = {
    PREFIX: 0x5ada4c01,

    create(args: {
        outcome: uint8
    }): Bet {
        return {
            $: 'Bet',
            ...args
        }
    },
    fromSlice(s: c.Slice): Bet {
        loadAndCheckPrefix32(s, 0x5ada4c01, 'Bet');
        return {
            $: 'Bet',
            outcome: s.loadUintBig(8),
        }
    },
    store(self: Bet, b: c.Builder): void {
        b.storeUint(0x5ada4c01, 32);
        b.storeUint(self.outcome, 8);
    },
    toCell(self: Bet): c.Cell {
        return makeCellFrom<Bet>(self, Bet.store);
    }
}

/**
 > struct (0x5ada4c02) Resolve {
 >     outcome: uint8
 > }
 */
export interface Resolve {
    readonly $: 'Resolve'
    outcome: uint8
}

export const Resolve = {
    PREFIX: 0x5ada4c02,

    create(args: {
        outcome: uint8
    }): Resolve {
        return {
            $: 'Resolve',
            ...args
        }
    },
    fromSlice(s: c.Slice): Resolve {
        loadAndCheckPrefix32(s, 0x5ada4c02, 'Resolve');
        return {
            $: 'Resolve',
            outcome: s.loadUintBig(8),
        }
    },
    store(self: Resolve, b: c.Builder): void {
        b.storeUint(0x5ada4c02, 32);
        b.storeUint(self.outcome, 8);
    },
    toCell(self: Resolve): c.Cell {
        return makeCellFrom<Resolve>(self, Resolve.store);
    }
}

/**
 > struct (0x5ada4c03) Claim {
 > }
 */
export interface Claim {
    readonly $: 'Claim'
}

export const Claim = {
    PREFIX: 0x5ada4c03,

    create(): Claim {
        return {
            $: 'Claim',
        }
    },
    fromSlice(s: c.Slice): Claim {
        loadAndCheckPrefix32(s, 0x5ada4c03, 'Claim');
        return {
            $: 'Claim',
        }
    },
    store(self: Claim, b: c.Builder): void {
        b.storeUint(0x5ada4c03, 32);
    },
    toCell(self: Claim): c.Cell {
        return makeCellFrom<Claim>(self, Claim.store);
    }
}

/**
 > struct (0x5ada4c04) Cancel {
 > }
 */
export interface Cancel {
    readonly $: 'Cancel'
}

export const Cancel = {
    PREFIX: 0x5ada4c04,

    create(): Cancel {
        return {
            $: 'Cancel',
        }
    },
    fromSlice(s: c.Slice): Cancel {
        loadAndCheckPrefix32(s, 0x5ada4c04, 'Cancel');
        return {
            $: 'Cancel',
        }
    },
    store(self: Cancel, b: c.Builder): void {
        b.storeUint(0x5ada4c04, 32);
    },
    toCell(self: Cancel): c.Cell {
        return makeCellFrom<Cancel>(self, Cancel.store);
    }
}

/**
 > struct (0x5ada4c05) WithdrawFee {
 > }
 */
export interface WithdrawFee {
    readonly $: 'WithdrawFee'
}

export const WithdrawFee = {
    PREFIX: 0x5ada4c05,

    create(): WithdrawFee {
        return {
            $: 'WithdrawFee',
        }
    },
    fromSlice(s: c.Slice): WithdrawFee {
        loadAndCheckPrefix32(s, 0x5ada4c05, 'WithdrawFee');
        return {
            $: 'WithdrawFee',
        }
    },
    store(self: WithdrawFee, b: c.Builder): void {
        b.storeUint(0x5ada4c05, 32);
    },
    toCell(self: WithdrawFee): c.Cell {
        return makeCellFrom<WithdrawFee>(self, WithdrawFee.store);
    }
}

/**
 > struct StatusReply {
 >     status: uint8
 >     winningOutcome: uint8
 >     bettingDeadline: uint32
 >     resolutionDeadline: uint32
 > }
 */
export interface StatusReply {
    readonly $: 'StatusReply'
    status: uint8
    winningOutcome: uint8
    bettingDeadline: uint32
    resolutionDeadline: uint32
}

export const StatusReply = {
    create(args: {
        status: uint8
        winningOutcome: uint8
        bettingDeadline: uint32
        resolutionDeadline: uint32
    }): StatusReply {
        return {
            $: 'StatusReply',
            ...args
        }
    },
    fromSlice(s: c.Slice): StatusReply {
        return {
            $: 'StatusReply',
            status: s.loadUintBig(8),
            winningOutcome: s.loadUintBig(8),
            bettingDeadline: s.loadUintBig(32),
            resolutionDeadline: s.loadUintBig(32),
        }
    },
    store(self: StatusReply, b: c.Builder): void {
        b.storeUint(self.status, 8);
        b.storeUint(self.winningOutcome, 8);
        b.storeUint(self.bettingDeadline, 32);
        b.storeUint(self.resolutionDeadline, 32);
    },
    toCell(self: StatusReply): c.Cell {
        return makeCellFrom<StatusReply>(self, StatusReply.store);
    }
}

/**
 > struct PoolReply {
 >     totalPot: coins
 >     totalYes: coins
 >     totalNo: coins
 >     feeBps: uint16
 > }
 */
export interface PoolReply {
    readonly $: 'PoolReply'
    totalPot: coins
    totalYes: coins
    totalNo: coins
    feeBps: uint16
}

export const PoolReply = {
    create(args: {
        totalPot: coins
        totalYes: coins
        totalNo: coins
        feeBps: uint16
    }): PoolReply {
        return {
            $: 'PoolReply',
            ...args
        }
    },
    fromSlice(s: c.Slice): PoolReply {
        return {
            $: 'PoolReply',
            totalPot: s.loadCoins(),
            totalYes: s.loadCoins(),
            totalNo: s.loadCoins(),
            feeBps: s.loadUintBig(16),
        }
    },
    store(self: PoolReply, b: c.Builder): void {
        b.storeCoins(self.totalPot);
        b.storeCoins(self.totalYes);
        b.storeCoins(self.totalNo);
        b.storeUint(self.feeBps, 16);
    },
    toCell(self: PoolReply): c.Cell {
        return makeCellFrom<PoolReply>(self, PoolReply.store);
    }
}

/**
 > struct BetReply {
 >     outcome: uint8
 >     amount: coins
 >     claimed: bool
 > }
 */
export interface BetReply {
    readonly $: 'BetReply'
    outcome: uint8
    amount: coins
    claimed: boolean
}

export const BetReply = {
    create(args: {
        outcome: uint8
        amount: coins
        claimed: boolean
    }): BetReply {
        return {
            $: 'BetReply',
            ...args
        }
    },
    fromSlice(s: c.Slice): BetReply {
        return {
            $: 'BetReply',
            outcome: s.loadUintBig(8),
            amount: s.loadCoins(),
            claimed: s.loadBoolean(),
        }
    },
    store(self: BetReply, b: c.Builder): void {
        b.storeUint(self.outcome, 8);
        b.storeCoins(self.amount);
        b.storeBit(self.claimed);
    },
    toCell(self: BetReply): c.Cell {
        return makeCellFrom<BetReply>(self, BetReply.store);
    }
}

// ————————————————————————————————————————————
//    class PredictionPool
//

interface ExtraSendOptions {
    bounce?: boolean                    // default: false
    sendMode?: SendMode                 // default: SendMode.PAY_GAS_SEPARATELY
    extraCurrencies?: c.ExtraCurrency   // default: empty dict
}

interface DeployedAddrOptions {
    workchain?: number                  // default: 0 (basechain)
    toShard?: { fixedPrefixLength: number; closeTo: c.Address }
    overrideContractCode?: c.Cell
}

function calculateDeployedAddress(code: c.Cell, data: c.Cell, options: DeployedAddrOptions): c.Address {
    const stateInitCell = beginCell().store(c.storeStateInit({
        code,
        data,
        splitDepth: options.toShard?.fixedPrefixLength,
        special: null,
        libraries: null,
    })).endCell();

    let addrHash = stateInitCell.hash();
    if (options.toShard) {
        const shardDepth = options.toShard.fixedPrefixLength;
        addrHash = beginCell()
            .storeBits(new c.BitString(options.toShard.closeTo.hash, 0, shardDepth))
            .storeBits(new c.BitString(stateInitCell.hash(), shardDepth, 256 - shardDepth))
            .endCell()
            .beginParse().loadBuffer(32);
    }

    return new c.Address(options.workchain ?? 0, addrHash);
}

export class PredictionPool implements c.Contract {
    static CodeCell = c.Cell.fromBase64('te6ccgECGQEABSsAART/APSkE/S88sgLAQIBYgIDAgLOBAUCASATFAIBIAYHAFtDBQ3F8GODgCwAKUEDZfBuBRRL2TXwZw4FICqIEnEKkEoQLAAUBD4wQCqAGpBIAfU+JGObTDtRND4kvpEMQH6SNY/+gDWH/oA+gD6ANY/0x/0BVOggwf0Dm+hjkLTB/oA0gDRjjUByMsHAfoCz4FAu4MH9EMpwgCTCaUJ3gjI+lIXzlAF+gITzgH6AgH6AgH6As4Syx/0AMntVJJfDeLgXwzgINcsItbSYAyAIACkW1B4XwU0NDQCwAGVwAFZ4wTgMKCAD/o99Me1E0PpI0x/WH/oA1g/TB9YH+gD6APoA0x/TH9Yf9AUo8tBm+CMtufLgZg7XCwcgwAGRf5UgwALDAOLy4GX4lyu+8uBn+JL6RDFTD4MH9A5voY4gMPiXIsjLBwH6As+BAhEQgwf0Qy7AAZIDpJQCpEAT4gPjDfiXF6AOwAEJCgsAQtMH+gDSANFTJLry4Gj4lxKgAsjLB1j6AsoAAhEQgwf0QwBqlPiXFaCW+JcUoAME4gzI+lIbyx8ZzlAH+gIVzhPLB85QB/oCUAX6AgH6Assfyx/O9ADJ7VQE/uDXLCLW0mAUjm4x7UTQ+kjTH9Mf+gDWD9MH0wcg+gAx+gD6ADD4kirHBfLgZATy0Gv4Iyi+8uBp+CMnufLgagnXCwcgwAGRf5UgwALDAOLy4GUgwAFApOMEkjBxkjdy4gbI+lIVyx8Tyx8B+gLOEssHEssHzsntVOCJ1yfjAokMDQ4PAAha2kwDAf5b7UTQ+kjTH9Mf+gDTD9MH0wf6APoA+gDTH9Mf0x/0BSjAAZF/lSjAAsMA4vLgbPiS+kQxUwGDB/QO8uBu0wf6ANIA0SDy0G8swAGWUyu68uBw3lYRAVYRAVYRAVYRAVYRAVYRAVYRAVYRAVYRAVYRAVYRAVYRAVYRAVYRAVYQEAAIWtpMBAHi1yeOL1vtRND6SNYf0x/6ANYP0wcB8tBr+CMkvvLgbQXI+lIUzhLLHwH6As7PhArOye1U4NcsItbSYCwx4wKEDwHHAPL07UTQ+kgx0x/TH/oA1wsPWrny4HSBJxC78uB0wgDy4HT4l4IQBfXhAL7y4HIRANwBVhAB8AL4J28QIYIK+vCAoL7y4HMCyMsHAfoCz4NAA4MH9EMCpA7I+lIdyx8byx9QCfoCF8sPFcsHE8sHAfoCAfoCAfoCyx/LHxPLHxL0AMntVCDCAI4T+JLIz4WI+lIB+gJwzwtqyXH7AJEw4gH+MO1E0PpI0x/TH/oA0w/TB9MH+gD6APoA0x/TH9Mf9AX4ki7HBfLgZCjAAZF/lSjAAsMA4vLgbC1RvBC+UJoQjlBnEF5ONFQgD/ABEr74IwKCCAk6gKASvgGSMH+SwwDi8uBx+CdvEIIK+vCAvPLgc4IK+vCAcPsCyM+FCPpScBIAEM8LbsmDBvsAAgFYFRYCASAXGAA5ttMdqJofSQY6Z+Y/QAY6Yfph5j9AH0AfQAYKoFAAMbYlvaiaH0kGOmP6Y/9ABjph5jpg+uFg61AAb7nFftRNAB+kQxAfpIMdM/MfoAMdMfMfoAMfoAMfoAMdNfMfQFgwf0Dm+hlDBwIHDh0wf6ANIA0YAMe4XR7UTQ+kjTH9Mf+gDTD9MH0wf6APoA+gDTH9Mf0x/0BSiTXw9w4Q76RDEugwf0Dm+hk18PcOHTB/oA0gDRIJRfD1tw4A8REA8Q7xDeEM0QvBCrEJoQiRB4EGcQVhBFEDTwAo');

    static Errors = {
        'PoolErrors.NotOwner': 100,
        'PoolErrors.InvalidOutcome': 101,
        'PoolErrors.BettingClosed': 102,
        'PoolErrors.BetTooSmall': 103,
        'PoolErrors.OutcomeConflict': 104,
        'PoolErrors.ResolveTooEarly': 105,
        'PoolErrors.ResolveTooLate': 106,
        'PoolErrors.AlreadyResolved': 107,
        'PoolErrors.NotResolved': 108,
        'PoolErrors.CancelTooEarly': 109,
        'PoolErrors.NoBet': 110,
        'PoolErrors.AlreadyClaimed': 111,
        'PoolErrors.NotAWinner': 112,
        'PoolErrors.WithdrawTooEarly': 113,
        'PoolErrors.SeedTooSmall': 114,
        'PoolErrors.InsufficientReserve': 115,
        'PoolErrors.BadConfig': 116,
        'PoolErrors.InvalidMessage': 65535,
    }

    readonly address: c.Address
    readonly init: { code: c.Cell, data: c.Cell } | undefined

    protected constructor(address: c.Address, init?: { code: c.Cell, data: c.Cell }) {
        this.address = address;
        this.init = init;
    }

    static fromAddress(address: c.Address) {
        return new PredictionPool(address);
    }

    static fromStorage(emptyStorage: {
        ownerAddress: c.Address
        bettingDeadline: uint32
        resolutionDeadline: uint32
        minBet: coins
        feeBps: uint16
        status: uint8
        winningOutcome: uint8
        totalPot: coins
        totalYes: coins
        totalNo: coins
        yesCount: uint32
        noCount: uint32
        claimedCount: uint32
        bets: c.Dictionary<uint256, BetInfo>
    }, deployedOptions?: DeployedAddrOptions) {
        const initialState = {
            code: deployedOptions?.overrideContractCode ?? PredictionPool.CodeCell,
            data: PoolStorage.toCell(PoolStorage.create(emptyStorage)),
        };
        const address = calculateDeployedAddress(initialState.code, initialState.data, deployedOptions ?? {});
        return new PredictionPool(address, initialState);
    }

    static createCellOfBet(body: {
        outcome: uint8
    }) {
        return Bet.toCell(Bet.create(body));
    }

    static createCellOfResolve(body: {
        outcome: uint8
    }) {
        return Resolve.toCell(Resolve.create(body));
    }

    static createCellOfClaim(body: {
    }) {
        return Claim.toCell(Claim.create());
    }

    static createCellOfCancel(body: {
    }) {
        return Cancel.toCell(Cancel.create());
    }

    static createCellOfWithdrawFee(body: {
    }) {
        return WithdrawFee.toCell(WithdrawFee.create());
    }

    async sendDeploy(provider: ContractProvider, via: Sender, msgValue: coins, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: c.Cell.EMPTY,
            ...extraOptions
        });
    }

    async sendBet(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        outcome: uint8
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: Bet.toCell(Bet.create(body)),
            ...extraOptions
        });
    }

    async sendResolve(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        outcome: uint8
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: Resolve.toCell(Resolve.create(body)),
            ...extraOptions
        });
    }

    async sendClaim(provider: ContractProvider, via: Sender, msgValue: coins, body: {
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: Claim.toCell(Claim.create()),
            ...extraOptions
        });
    }

    async sendCancel(provider: ContractProvider, via: Sender, msgValue: coins, body: {
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: Cancel.toCell(Cancel.create()),
            ...extraOptions
        });
    }

    async sendWithdrawFee(provider: ContractProvider, via: Sender, msgValue: coins, body: {
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: WithdrawFee.toCell(WithdrawFee.create()),
            ...extraOptions
        });
    }

    async getStatus(provider: ContractProvider): Promise<StatusReply> {
        const r = StackReader.fromGetMethod(4, await provider.get('getStatus', []));
        return ({
            $: 'StatusReply',
            status: r.readBigInt(),
            winningOutcome: r.readBigInt(),
            bettingDeadline: r.readBigInt(),
            resolutionDeadline: r.readBigInt(),
        });
    }

    async getPool(provider: ContractProvider): Promise<PoolReply> {
        const r = StackReader.fromGetMethod(4, await provider.get('getPool', []));
        return ({
            $: 'PoolReply',
            totalPot: r.readBigInt(),
            totalYes: r.readBigInt(),
            totalNo: r.readBigInt(),
            feeBps: r.readBigInt(),
        });
    }

    async getBet(provider: ContractProvider, who: c.Address): Promise<BetReply> {
        const r = StackReader.fromGetMethod(3, await provider.get('getBet', [
            { type: 'slice', cell: makeCellFrom<c.Address>(who,
                (v,b) => b.storeAddress(v)
            ) },
        ]));
        return ({
            $: 'BetReply',
            outcome: r.readBigInt(),
            amount: r.readBigInt(),
            claimed: r.readBoolean(),
        });
    }

    async getPayout(provider: ContractProvider, who: c.Address): Promise<coins> {
        const r = StackReader.fromGetMethod(1, await provider.get('getPayout', [
            { type: 'slice', cell: makeCellFrom<c.Address>(who,
                (v,b) => b.storeAddress(v)
            ) },
        ]));
        return r.readBigInt();
    }
}
