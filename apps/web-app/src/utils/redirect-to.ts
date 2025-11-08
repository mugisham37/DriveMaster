// Utility function to redirect, preserving exact behavior from Rails implementation
export function redirectTo(url: string): void {
  window.location.href = url;
}
