// Animation types for the AnimationTimeline

export interface AnimeCSSProperties {
  // Transform properties
  translateX?: number | string
  translateY?: number | string
  translateZ?: number | string
  rotate?: number | string
  rotateX?: number | string
  rotateY?: number | string
  rotateZ?: number | string
  scale?: number | string
  scaleX?: number | string
  scaleY?: number | string
  scaleZ?: number | string
  skew?: number | string
  skewX?: number | string
  skewY?: number | string
  
  // CSS properties
  opacity?: number
  backgroundColor?: string
  color?: string
  width?: number | string
  height?: number | string
  left?: number | string
  top?: number | string
  right?: number | string
  bottom?: number | string
  margin?: number | string
  padding?: number | string
  borderRadius?: number | string
  
  // Animation properties
  duration?: number
  delay?: number
  easing?: string
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
  loop?: boolean | number
  autoplay?: boolean
  
  // Custom properties
  [key: string]: unknown
}