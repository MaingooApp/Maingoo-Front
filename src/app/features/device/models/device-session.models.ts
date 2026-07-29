export type DeviceMode = 'KDS' | 'REGISTER';

export type PairingStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export interface DevicePairingChallenge {
  pairingId: string;
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresAt: string;
  pollIntervalSeconds: number;
}

export interface PairedDeviceIdentity {
  device: {
    id: string;
    enterpriseId: string;
    name: string;
    type: DeviceMode;
    kitchenStationId: string | null;
    status: 'ACTIVE';
  };
  deviceToken: string;
  expiresAt: string;
}

export interface PosEmployeeSession {
  user: {
    id: string;
    name: string;
  };
  permissions: string[];
  operatorToken: string;
  expiresAt: string;
}

export type PendingDevicePairing = Pick<DevicePairingChallenge, 'pairingId' | 'deviceCode' | 'userCode' | 'expiresAt'>;

export interface DeviceSessionValues {
  pairedIdentity: PairedDeviceIdentity;
  operatorSession: PosEmployeeSession;
  pendingPairing: PendingDevicePairing;
}

export type DeviceSessionKey = keyof DeviceSessionValues;

export interface DeviceSessionSnapshot {
  pairedIdentity: PairedDeviceIdentity | null;
  operatorSession: PosEmployeeSession | null;
  pendingPairing: PendingDevicePairing | null;
}
