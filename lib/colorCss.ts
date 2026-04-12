// Plain rgba() for gradients — html2canvas doesn’t handle color-mix().
export function colorToRgba(input: string, alpha: number): string {
  const s = input.trim();
  const hex6 = /^#([0-9a-fA-F]{6})$/.exec(s);
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const hex3 = /^#([0-9a-fA-F]{3})$/.exec(s);
  if (hex3) {
    const h = hex3[1]!;
    const n = parseInt(
      h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!,
      16
    );
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
  if (rgb) {
    return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`;
  }
  return `rgba(15,23,42,${alpha})`;
}

export function scrimGradient(primary: string, secondary: string): string {
  return `linear-gradient(165deg, ${colorToRgba(secondary, 0.88)} 0%, ${colorToRgba(secondary, 0.48)} 42%, ${colorToRgba(primary, 0.38)} 100%)`;
}

// Story: keep colour at the bottom so letterboxing stays mostly black.
export function scrimGradientStory(primary: string, secondary: string): string {
  return `linear-gradient(to top, ${colorToRgba(primary, 0.78)} 0%, ${colorToRgba(secondary, 0.45)} 30%, ${colorToRgba(secondary, 0.14)} 52%, transparent 72%)`;
}
