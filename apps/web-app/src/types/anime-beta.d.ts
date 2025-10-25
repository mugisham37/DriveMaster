declare module '@juliangarnierorg/anime-beta' {
  export interface AnimationOptions {
    duration?: number
    ease?: string
    onUpdate?: () => void
    [key: string]: any
  }

  export function animate(
    target: any,
    options: AnimationOptions
  ): void
}