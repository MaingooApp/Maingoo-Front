const UNSAFE_SEPARATOR = /[\\\u2215\u2044]/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function safeInternalReturnUrl(value: string | null | undefined): string | null {
  if (!value || value !== value.trim()) return null;

  let probe = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (
      !probe.startsWith('/') ||
      probe.startsWith('//') ||
      UNSAFE_SEPARATOR.test(probe) ||
      CONTROL_CHARACTER.test(probe)
    ) {
      return null;
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(probe);
    } catch {
      return null;
    }
    if (decoded === probe) return value;
    probe = decoded;
  }

  return null;
}
