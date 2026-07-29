import { safeInternalReturnUrl } from './safe-return-url';

describe('safeInternalReturnUrl', () => {
  it('keeps the internal QR approval route with its code', () => {
    const returnUrl = '/ventas/configuracion/dispositivos/emparejar?code=ABCD-EFGH';

    expect(safeInternalReturnUrl(returnUrl)).toBe(returnUrl);
  });

  it('rejects absolute, protocol-relative and disguised external URLs', () => {
    const unsafeUrls = [
      'https://evil.example',
      '//evil.example/path',
      '/\\evil.example/path',
      '/%5Cevil.example/path',
      '/%2F%2Fevil.example/path',
      ' /ventas/configuracion'
    ];

    for (const url of unsafeUrls) expect(safeInternalReturnUrl(url)).toBeNull();
  });
});
