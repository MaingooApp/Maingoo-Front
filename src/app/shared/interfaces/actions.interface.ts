export interface Action {
  icon: string;
  tooltip?: string;
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast';
  action: string;
}
