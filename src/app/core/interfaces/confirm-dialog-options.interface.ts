import { Confirmation } from 'primeng/api';

export interface ConfirmDialogOptions extends Omit<Confirmation, 'accept' | 'reject'> {
    onAccept?: () => void;
    onReject?: () => void;
}
