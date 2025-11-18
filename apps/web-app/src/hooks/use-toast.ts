import { toast as sonnerToast } from "sonner";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

export function useToast() {
  const toast = ({ title, description, variant = "default", duration = 5000 }: ToastOptions) => {
    if (variant === "destructive") {
      sonnerToast.error(title, {
        description,
        duration,
      });
    } else {
      sonnerToast.success(title, {
        description,
        duration,
      });
    }
  };

  return { toast };
}
