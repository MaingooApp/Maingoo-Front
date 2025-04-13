export class ConvertNumbers{
    static convertToDecimal(value: any): number {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const sanitized = value.replace(',', '.');
          const parsed = parseFloat(sanitized);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      }
}