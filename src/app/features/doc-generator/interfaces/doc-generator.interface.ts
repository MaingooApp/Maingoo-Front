export interface QuickFilter {
    id: string;
    label: string;
    icon: string;
    count: number;
    active: boolean;
    color: 'success' | 'info' | 'danger' | 'secondary';
}

export interface Camera {
    id?: number;
    name: string;
    type: 'positive' | 'negative';
    lastTemp?: number;
    lastCheck?: Date;
}

export interface Fryer {
    name: string;
    capacity: string;
}

export interface DocumentCard {
    id: string;
    title: string;
    tags: string[];
    type: 'temperature' | 'oil' | 'payroll' | 'other';
}
