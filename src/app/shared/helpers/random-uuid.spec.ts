import { randomUuid } from './random-uuid';

describe('randomUuid', () => {
  it('generates an RFC 4122 v4 UUID when randomUUID is unavailable', () => {
    const source = {
      getRandomValues: (values: Uint8Array) => {
        values.fill(0);
        return values;
      }
    } as unknown as Crypto;

    expect(randomUuid(source)).toBe('00000000-0000-4000-8000-000000000000');
  });
});
