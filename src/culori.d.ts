declare module 'culori' {
  export interface Rgb {
    mode: 'rgb';
    r: number;
    g: number;
    b: number;
    alpha?: number;
  }

  export interface Oklch {
    mode: 'oklch';
    l?: number;
    c?: number;
    h?: number;
    alpha?: number;
  }

  export function parse(color: string): Rgb | undefined;
  export function formatHex(color: Rgb | Oklch): string;
  export function converter(mode: 'oklch'): (color: Rgb) => Oklch;
}
