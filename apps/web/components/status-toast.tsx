"use client";

type StatusToastProps = {
  message: string;
};

export function StatusToast({ message }: StatusToastProps) {
  if (!message || message.startsWith("Loading ")) {
    return null;
  }

  return (
    <div aria-live="polite" className="status-toast" role="status">
      {message}
    </div>
  );
}
