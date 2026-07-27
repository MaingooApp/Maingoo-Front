import { TestBed } from '@angular/core/testing';

import { PosTelemetryService } from './pos-telemetry.service';

describe('PosTelemetryService', () => {
  it('keeps only bounded, sanitized POS diagnostics in memory', () => {
    const service = TestBed.inject(PosTelemetryService);

    service.recordSyncError('COMMAND', 'CUSTOMER_JOHN_SMITH', false);
    expect(service.snapshot()[0]).toEqual(jasmine.objectContaining({ type: 'SYNC_ERROR', errorCode: 'UNKNOWN_ERROR' }));

    for (let index = 0; index < 101; index++) service.recordSyncCycle('COMPLETED', index, index);

    const events = service.snapshot();
    expect(events).toHaveSize(100);
    expect(service.events()).toHaveSize(100);
    expect(JSON.stringify(events)).not.toContain('CUSTOMER_JOHN_SMITH');
    expect(events.at(-1)).toEqual(
      jasmine.objectContaining({ type: 'SYNC_CYCLE', outcome: 'COMPLETED', durationMs: 100, queuedCommands: 100 })
    );
  });
});
