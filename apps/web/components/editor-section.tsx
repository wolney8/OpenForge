"use client";

import { type ReactNode, useId, useState } from "react";

type EditorSectionProps = {
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  headerAside?: ReactNode;
  invalid?: boolean;
  title: string;
};

export function EditorSection({
  children,
  collapsible = true,
  defaultOpen = true,
  headerAside,
  invalid = false,
  title,
}: EditorSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const isContentOpen = collapsible ? isOpen : true;

  return (
    <section
      className={`content-subpanel stack field-span-2 editor-section${
        invalid ? " is-invalid-section" : ""
      }${isContentOpen ? " is-open" : ""}`}
      data-invalid={invalid || undefined}
    >
      {collapsible ? (
        <button
          aria-controls={contentId}
          aria-expanded={isOpen}
          className="section-heading-row editor-section-summary"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="eyebrow">{title}</span>
          <span className="editor-section-summary-end">
            {headerAside ? <span className="editor-section-aside">{headerAside}</span> : null}
            <span
              aria-hidden="true"
              className="material-symbols-outlined editor-section-toggle-icon"
            >
              {isOpen ? "collapse_content" : "expand_content"}
            </span>
          </span>
        </button>
      ) : (
        <div className="section-heading-row editor-section-summary editor-section-summary-static">
          <span className="eyebrow">{title}</span>
          {headerAside ? <span className="editor-section-aside">{headerAside}</span> : null}
        </div>
      )}
      <div
        aria-hidden={!isContentOpen}
        className="editor-section-content"
        id={contentId}
        inert={!isContentOpen ? true : undefined}
      >
        <div className="editor-section-content-inner stack">{children}</div>
      </div>
    </section>
  );
}
