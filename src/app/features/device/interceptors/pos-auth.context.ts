import { HttpContextToken } from '@angular/common/http';

export type PosAuthMode = 'HUMAN' | 'PUBLIC' | 'DEVICE' | 'DEVICE_EMPLOYEE';

export const POS_AUTH_MODE = new HttpContextToken<PosAuthMode>(() => 'HUMAN');
