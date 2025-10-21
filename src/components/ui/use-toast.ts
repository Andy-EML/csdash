type ToastPayload = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  function toast({ title, description, variant = "default" }: ToastPayload) {
    const message = [title, description].filter(Boolean).join(": ");

    if (variant === "destructive") {
      console.error(message);
    } else {
      console.info(message);
    }
  }

  return { toast };
}
