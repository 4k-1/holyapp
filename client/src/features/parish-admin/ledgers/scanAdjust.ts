/** How a scan is shown: quarter turns clockwise, and brightness and contrast (1 = as photographed). */
export interface ScanAdjust {
  turns: number;
  brightness: number;
  contrast: number;
}

export const NO_ADJUST: ScanAdjust = { turns: 0, brightness: 1, contrast: 1 };
