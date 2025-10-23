export function scrollToTop(elementId?: string, offset: number = 0) {
  if (elementId) {
    const element = document.getElementById(elementId) || document.querySelector(`[data-scroll-top-anchor="${elementId}"]`)
    if (element) {
      const elementTop = element.offsetTop - offset
      window.scrollTo({
        top: elementTop,
        behavior: 'smooth'
      })
      return
    }
  }
  
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}