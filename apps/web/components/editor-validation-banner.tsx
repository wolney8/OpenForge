"use client";

import { useState } from "react";

export function EditorValidationBanner({
  dismissKey,
  id,
  message,
  title,
}: {
  dismissKey: string;
  id: string;
  message: string;
  title: string;
}) {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  if (dismissedKey === dismissKey) {
    return null;
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="editor-validation-banner editor-validation-banner-danger"
      data-pd-id={id}
      role="alert"
    >
      <span aria-hidden="true" className="material-symbols-outlined editor-validation-banner-icon">
        error
      </span>
      <div className="editor-validation-banner-copy">
        <strong id={`${id}-title`}>{title}</strong>
        <span>{message}</span>
      </div>
      <button
        aria-label={`Hide ${title}`}
        className="icon-button editor-validation-banner-dismiss"
        onClick={() => setDismissedKey(dismissKey)}
        title={`Hide ${title}`}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          close
        </span>
      </button>
    </section>
  );
}
