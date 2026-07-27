import { DecimalString } from '../../ventas/models/pos.models';

const DECIMAL_PATTERN = /^-?\d+(?:\.\d{1,3})?$/;
const SCALE = 1000n;

export function isInventoryDecimal(value: string, allowNegative = true): boolean {
  if (!DECIMAL_PATTERN.test(value)) return false;
  return allowNegative || !value.startsWith('-');
}

export function isNonZeroInventoryDecimal(value: string, allowNegative = true): boolean {
  return isInventoryDecimal(value, allowNegative) && parseDecimal(value) !== 0n;
}

export function addInventoryDecimals(left: DecimalString, right: DecimalString): DecimalString {
  return formatDecimal(parseDecimal(left) + parseDecimal(right));
}

export function subtractInventoryDecimals(left: DecimalString, right: DecimalString): DecimalString {
  return formatDecimal(parseDecimal(left) - parseDecimal(right));
}

export function negateInventoryDecimal(value: DecimalString): DecimalString {
  return formatDecimal(-parseDecimal(value));
}

function parseDecimal(value: DecimalString): bigint {
  if (!DECIMAL_PATTERN.test(value)) throw new Error('INVALID_INVENTORY_DECIMAL');

  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const scaled = BigInt(whole) * SCALE + BigInt(fraction.padEnd(3, '0'));
  return negative ? -scaled : scaled;
}

function formatDecimal(value: bigint): DecimalString {
  if (value === 0n) return '0';

  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / SCALE;
  const fraction = String(absolute % SCALE)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}
