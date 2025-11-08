export function scrollToTop(elementId?: string, offset: number = 0): void {
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      });
      return;
    }
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}
