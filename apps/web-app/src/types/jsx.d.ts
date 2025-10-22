import React from 'react'

declare global {
  namespace JSX {
    // Custom JSX element type with proper typing
    interface Element extends React.ReactElement<Record<string, unknown>, string | React.JSXElementConstructor<unknown>> {
      // Custom properties for our JSX elements
      key?: React.Key
    }
    
    interface ElementClass extends React.Component<Record<string, unknown>> {
      render(): React.ReactNode
    }
    
    interface ElementAttributesProperty { 
      props: Record<string, unknown>
    }
    
    interface ElementChildrenAttribute { 
      children: React.ReactNode
    }
    
    // Custom intrinsic attributes with additional properties
    interface IntrinsicAttributes extends React.Attributes {
      // Custom global attributes for all elements
      'data-testid'?: string
    }
    
    // Custom class attributes with additional properties  
    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {
      // Custom class-specific attributes
      'data-component'?: string
    }
    
    // Custom intrinsic elements with additional HTML elements
    interface IntrinsicElements extends React.ReactHTML {
      // Custom elements that might be used in the project
      'custom-element'?: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}