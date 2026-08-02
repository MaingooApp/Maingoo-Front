import { PosCommandStatus, QueuedPosCommand, UpdateLineCommandData } from './pos-command.models';
import {
  DecimalString,
  MenuItem,
  OperationalPosOrder,
  PosOrder,
  PosOrderChannel,
  PosOrderLineStatus,
  PosOrderStatus
} from './pos.models';
import { randomUuid } from '@shared/helpers/random-uuid';

type QueuedAddLineCommand = Extract<QueuedPosCommand, { type: 'ADD_LINE' }>;
type ServerOrder = PosOrder | OperationalPosOrder;
type ServerOrderLine = ServerOrder['lines'][number];

export type LocalSyncStatus = PosCommandStatus;
export type LocalOrderStatus = 'DRAFT' | 'OPEN' | 'PENDING_SEND';

export interface LocalOrderIdentity {
  id: string;
  temporaryNumber: string;
}

export interface LocalPosOrder {
  readonly kind: 'LOCAL_POS_ORDER';
  id: string;
  temporaryNumber: string;
  enterpriseId: string;
  deviceId: string;
  tableId: string | null;
  channel: PosOrderChannel;
  guestCount: number | null;
  note: string | null;
  clientCreatedAt: string;
}

export interface PosOrderLineViewModel {
  id: string;
  source: 'SERVER' | 'LOCAL';
  menuItemId: string | null;
  itemName: string;
  sku: string | null;
  quantity: DecimalString;
  discountGross: DecimalString;
  unitPriceGross: DecimalString | null;
  estimatedLineTotalGross: DecimalString | null;
  note: string | null;
  serverStatus: PosOrderLineStatus | null;
  syncStatus: LocalSyncStatus | null;
  catalogMissing: boolean;
  modifiers: LocalLineModifierViewModel[];
}

export interface LocalLineModifierViewModel {
  id: string;
  name: string;
  priceDeltaGross: DecimalString;
  quantity: DecimalString;
}

export interface PosOrderViewModel {
  id: string;
  source: 'SERVER' | 'LOCAL';
  enterpriseId: string;
  deviceId: string;
  tableId: string | null;
  channel: PosOrderChannel;
  guestCount: number | null;
  note: string | null;
  orderNumber: number | null;
  temporaryNumber: string | null;
  displayNumber: string;
  serverVersion: number | null;
  serverStatus: PosOrderStatus | null;
  localStatus: LocalOrderStatus | null;
  authoritativeTotalGross: DecimalString | null;
  estimatedTotalGross: DecimalString | null;
  paidGross: DecimalString | null;
  totalIsEstimated: boolean;
  syncStatus: LocalSyncStatus | null;
  pendingCommandCount: number;
  lines: PosOrderLineViewModel[];
}

export interface PosOrderProjectionInput {
  aggregateId: string;
  localOrder?: LocalPosOrder | null;
  authoritativeOrder?: ServerOrder | null;
  commands: readonly QueuedPosCommand[];
  menuItems: readonly MenuItem[];
}

export function createLocalOrderIdentity(uuid: string = randomUuid()): LocalOrderIdentity {
  const token = uuid
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
  return {
    id: `local:${uuid}`,
    temporaryNumber: `L-${token}`
  };
}

export function projectPosOrder(input: PosOrderProjectionInput): PosOrderViewModel {
  const authoritative = input.authoritativeOrder ?? null;
  const local = input.localOrder ?? null;
  if (!authoritative && !local) throw new Error('POS_LOCAL_ORDER_SOURCE_REQUIRED');

  const enterpriseId = authoritative?.enterpriseId ?? local?.enterpriseId;
  const commands = input.commands
    .filter((command) => command.enterpriseId === enterpriseId && command.aggregateId === input.aggregateId)
    .sort(compareCommands);
  const menuById = new Map(input.menuItems.map((item) => [item.id, item]));
  let lines = authoritative ? authoritative.lines.map(serverLineView) : [];
  let estimatedDelta = decimal('0');
  let estimateAvailable = true;

  for (const command of commands) {
    switch (command.type) {
      case 'ADD_LINE': {
        if (authoritative && command.lastErrorCode === 'POS_OFFLINE_LINE_RETARGET_AMBIGUOUS') break;
        const line = addedLineView(command, menuById.get(command.data.menuItemId));
        lines = [...lines, line];
        if (line.estimatedLineTotalGross === null) estimateAvailable = false;
        else estimatedDelta = add(estimatedDelta, decimal(line.estimatedLineTotalGross));
        break;
      }
      case 'UPDATE_LINE': {
        const index = lines.findIndex(({ id }) => id === command.targetId);
        if (index < 0) break;
        const current = lines[index];
        const updated = updateLineView(current, command.data, command.status);
        lines = lines.map((line, lineIndex) => (lineIndex === index ? updated : line));
        if (current.estimatedLineTotalGross === null || updated.estimatedLineTotalGross === null) {
          estimateAvailable = false;
        } else {
          estimatedDelta = add(
            estimatedDelta,
            subtract(decimal(updated.estimatedLineTotalGross), decimal(current.estimatedLineTotalGross))
          );
        }
        break;
      }
      case 'REMOVE_LINE': {
        const removed = lines.find(({ id }) => id === command.targetId);
        lines = lines.filter(({ id }) => id !== command.targetId);
        if (removed?.estimatedLineTotalGross === null) estimateAvailable = false;
        else if (removed) estimatedDelta = subtract(estimatedDelta, decimal(removed.estimatedLineTotalGross));
        break;
      }
      default:
        break;
    }
  }

  const authoritativeTotal = authoritative?.totalGross ?? null;
  const estimatedTotal = estimateAvailable
    ? formatMoney(add(decimal(authoritativeTotal ?? '0'), estimatedDelta))
    : null;
  const syncStatus = combinedStatus(commands.map(({ status }) => status));
  const hasSendCommand = commands.some(({ type }) => type === 'SEND_ORDER');
  const localStatus: LocalOrderStatus | null =
    commands.length === 0 && authoritative
      ? null
      : hasSendCommand
        ? 'PENDING_SEND'
        : lines.length > 0
          ? 'OPEN'
          : 'DRAFT';

  return {
    id: authoritative?.id ?? local!.id,
    source: authoritative ? 'SERVER' : 'LOCAL',
    enterpriseId: enterpriseId!,
    deviceId: authoritative?.deviceId ?? local!.deviceId,
    tableId: authoritative ? authoritative.tableId : local!.tableId,
    channel: authoritative?.channel ?? local!.channel,
    guestCount: authoritative ? authoritative.guestCount : local!.guestCount,
    note: authoritative ? authoritative.note : local!.note,
    orderNumber: authoritative?.orderNumber ?? null,
    temporaryNumber: authoritative ? null : local!.temporaryNumber,
    displayNumber: authoritative ? String(authoritative.orderNumber) : local!.temporaryNumber,
    serverVersion: authoritative?.version ?? null,
    serverStatus: authoritative?.status ?? null,
    localStatus,
    authoritativeTotalGross: authoritativeTotal,
    estimatedTotalGross: estimatedTotal,
    paidGross: authoritative?.paidGross ?? null,
    totalIsEstimated: commands.length > 0 || !authoritative,
    syncStatus,
    pendingCommandCount: commands.length,
    lines
  };
}

function addedLineView(command: QueuedAddLineCommand, item: MenuItem | undefined): PosOrderLineViewModel {
  const modifiers = item ? selectedModifiers(item, command.data.modifierOptionIds ?? []) : [];
  const estimatedLineTotalGross = item
    ? calculateLineTotal(item.priceGross, modifiers, command.data.quantity, command.data.discountGross ?? '0')
    : null;
  return {
    id: command.targetId,
    source: 'LOCAL',
    menuItemId: command.data.menuItemId,
    itemName: item?.name ?? command.data.menuItemId,
    sku: item?.sku ?? null,
    quantity: command.data.quantity,
    discountGross: command.data.discountGross ?? '0',
    unitPriceGross: item?.priceGross ?? null,
    estimatedLineTotalGross,
    note: command.data.note ?? null,
    serverStatus: null,
    syncStatus: command.status,
    catalogMissing: !item,
    modifiers
  };
}

function serverLineView(line: ServerOrderLine): PosOrderLineViewModel {
  return {
    id: line.id,
    source: 'SERVER',
    menuItemId: line.menuItemId,
    itemName: line.itemName,
    sku: line.sku,
    quantity: line.quantity,
    discountGross: line.discountGross,
    unitPriceGross: line.unitPriceGross,
    estimatedLineTotalGross: line.lineTotalGross,
    note: line.note,
    serverStatus: line.status,
    syncStatus: null,
    catalogMissing: false,
    modifiers: line.modifiers.map((modifier) => ({
      id: modifier.id,
      name: modifier.name,
      priceDeltaGross: modifier.priceDeltaGross,
      quantity: modifier.quantity
    }))
  };
}

function updateLineView(
  line: PosOrderLineViewModel,
  changes: UpdateLineCommandData,
  status: LocalSyncStatus
): PosOrderLineViewModel {
  const quantity = changes.quantity ?? line.quantity;
  const discountGross = changes.discountGross ?? line.discountGross;
  const estimatedLineTotalGross =
    line.unitPriceGross === null
      ? null
      : calculateLineTotal(line.unitPriceGross, line.modifiers, quantity, discountGross);
  return {
    ...line,
    quantity,
    discountGross,
    note: changes.note ?? line.note,
    estimatedLineTotalGross,
    syncStatus: combinedStatus([line.syncStatus, status])
  };
}

function selectedModifiers(item: MenuItem, selectedIds: readonly string[]): LocalLineModifierViewModel[] {
  const selected = new Set(selectedIds);
  return item.modifierGroups.flatMap((group) =>
    group.options
      .filter(({ id }) => selected.has(id))
      .map((option) => ({
        id: option.id,
        name: option.name,
        priceDeltaGross: option.priceDeltaGross,
        quantity: '1'
      }))
  );
}

function calculateLineTotal(
  unitPriceGross: DecimalString,
  modifiers: readonly LocalLineModifierViewModel[],
  quantity: DecimalString,
  discountGross: DecimalString
): DecimalString {
  const modifierGross = modifiers.reduce(
    (total, modifier) => add(total, multiply(decimal(modifier.priceDeltaGross), decimal(modifier.quantity))),
    decimal('0')
  );
  return formatMoney(
    subtract(multiply(add(decimal(unitPriceGross), modifierGross), decimal(quantity)), decimal(discountGross))
  );
}

function combinedStatus(statuses: readonly (LocalSyncStatus | null)[]): LocalSyncStatus | null {
  const priority: readonly LocalSyncStatus[] = ['CONFLICT', 'FAILED', 'SENDING', 'PENDING'];
  return priority.find((status) => statuses.includes(status)) ?? null;
}

function compareCommands(left: QueuedPosCommand, right: QueuedPosCommand): number {
  return (
    left.clientCreatedAt.localeCompare(right.clientCreatedAt) ||
    left.clientMutationId.localeCompare(right.clientMutationId)
  );
}

interface DecimalValue {
  amount: bigint;
  scale: number;
}

function decimal(value: DecimalString): DecimalValue {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new Error('INVALID_DECIMAL');
  const fraction = match[3] ?? '';
  return {
    amount: BigInt(`${match[1]}${match[2]}${fraction}`),
    scale: fraction.length
  };
}

function add(left: DecimalValue, right: DecimalValue): DecimalValue {
  const scale = Math.max(left.scale, right.scale);
  return {
    amount: rescale(left, scale) + rescale(right, scale),
    scale
  };
}

function subtract(left: DecimalValue, right: DecimalValue): DecimalValue {
  const scale = Math.max(left.scale, right.scale);
  return {
    amount: rescale(left, scale) - rescale(right, scale),
    scale
  };
}

function multiply(left: DecimalValue, right: DecimalValue): DecimalValue {
  return { amount: left.amount * right.amount, scale: left.scale + right.scale };
}

function rescale(value: DecimalValue, scale: number): bigint {
  return value.amount * 10n ** BigInt(scale - value.scale);
}

function formatMoney(value: DecimalValue): DecimalString {
  let { amount, scale } = value;
  while (scale > 2 && amount % 10n === 0n) {
    amount /= 10n;
    scale--;
  }
  if (scale < 2) {
    amount *= 10n ** BigInt(2 - scale);
    scale = 2;
  }

  const sign = amount < 0n ? '-' : '';
  const digits = (amount < 0n ? -amount : amount).toString().padStart(scale + 1, '0');
  return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}
