// Utility function to scroll to top, preserving exact behavior from Rails implementation
export function scrollToTop(anchor?: string, offset: number = 0): void {
  if (anchor) {
    const element = document.querySelector(
      `[data-scroll-top-anchor="${anchor}"]`
    );
    if (element) {
      const elementPosition =
        element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
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
