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

export interface CreateDevicePairingRequest {
  requestedType: DeviceMode;
  requestedLabel?: string;
  appVersion?: string;
}

export interface DevicePairingLookup {
  id: string;
  requestedType: DeviceMode;
  requestedLabel: string | null;
  appVersion: string | null;
  status: PairingStatus | 'CONSUMED';
  expiresAt: string;
  createdAt: string;
}

export interface ApproveDevicePairingRequest {
  userCode: string;
  name: string;
  kitchenStationId?: string | null;
}

export interface DenyDevicePairingRequest {
  userCode: string;
}

export interface DeniedDevicePairing {
  id: string;
  status: 'DENIED';
}

export interface DevicePairingPending {
  code: 'PAIRING_PENDING';
  message: string;
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

export interface DevicePairingExchangeSuccess extends PairedDeviceIdentity {
  mode: DeviceMode;
}

export type DevicePairingExchange = DevicePairingPending | DevicePairingExchangeSuccess;

export interface PosEmployeeSession {
  user: {
    id: string;
    name: string;
  };
  permissions: string[];
  operatorToken: string;
  expiresAt: string;
}

export type PendingDevicePairing = DevicePairingChallenge;

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
