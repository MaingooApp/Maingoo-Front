import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ChartHelper {
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Returns generic chart options adapted to PrimeNG Theme
   */
  getCommonOptions(overrides: any = {}) {
    if (!isPlatformBrowser(this.platformId)) {
      return overrides;
    }

    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--p-text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
    const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

    const baseOptions = {
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        plugins: {
            legend: {
                labels: {
                    color: textColor
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textColorSecondary,
                    font: {
                        weight: 500
                    }
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: textColorSecondary
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            }
        }
    };

    // Deep merge or simple assign depending on needs. Simple assign for top levels:
    return { ...baseOptions, ...overrides };
  }

  /**
   * Helper to get CSS variable value safely
   */
  getColor(variableName: string): string {
      if (!isPlatformBrowser(this.platformId)) {
          return '#000000'; // Fallback for SSR
      }
      return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  }

  /**
   * Returns a standard palette from PrimeNG theme
   */
  getThemePalette() {
      return [
          this.getColor('--p-cyan-500'),
          this.getColor('--p-orange-500'),
          this.getColor('--p-gray-500'),
          this.getColor('--p-blue-500'),
          this.getColor('--p-purple-500'),
          this.getColor('--p-green-500'),
          this.getColor('--p-red-500'),
          this.getColor('--p-yellow-500'),
          this.getColor('--p-teal-500'),
          this.getColor('--p-pink-500')
      ];
  }
}
