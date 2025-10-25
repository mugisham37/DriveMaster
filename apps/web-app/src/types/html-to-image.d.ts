declare module '@exercism/html-to-image' {
  export function toPixelData(element: HTMLElement): Promise<Uint8ClampedArray>
  export function toPng(element: HTMLElement): Promise<string>
  export function toCanvas(element: HTMLElement): Promise<HTMLCanvasElement>
}