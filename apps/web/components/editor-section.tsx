"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

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
  const sectionRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const revealRequestedRef = useRef(false);

  useEffect(() => {
    if (!isContentOpen || !revealRequestedRef.current) {
      return;
    }

    const content = contentRef.current;
    const section = sectionRef.current;
    const summary = summaryRef.current;
    const scrollOwner = section?.closest(".workflow-editor-body") as HTMLElement | null;
    if (!content || !section || !summary || !scrollOwner) {
      revealRequestedRef.current = false;
      return;
    }

    let frame = 0;
    const revealExpandedControls = () => {
      if (!revealRequestedRef.current) return;
      revealRequestedRef.current = false;

      const firstUsefulControl = content.querySelector<HTMLElement>(
        "input:not([type='hidden']), select, textarea, button, [tabindex]:not([tabindex='-1'])"
      );
      const ownerRect = scrollOwner.getBoundingClientRect();
      const stickyFooter = scrollOwner.querySelector<HTMLElement>(".workflow-editor-footer");
      const footerRect = stickyFooter?.getBoundingClientRect();
      const summaryRect = summary.getBoundingClientRect();
      const controlRect = (firstUsefulControl ?? content).getBoundingClientRect();
      const visibleTop = ownerRect.top;
      const visibleBottom = footerRect && footerRect.top < ownerRect.bottom
        ? Math.max(ownerRect.top, footerRect.top)
        : ownerRect.bottom;

      let delta = 0;
      if (summaryRect.top < visibleTop) {
        delta = summaryRect.top - visibleTop;
      } else if (summaryRect.bottom > visibleBottom) {
        delta = summaryRect.top - visibleTop;
      } else if (controlRect.bottom > visibleBottom) {
        // Reveal the first control while retaining the disclosure heading whenever space allows.
        delta = Math.min(
          controlRect.bottom - visibleBottom,
          Math.max(0, summaryRect.top - visibleTop)
        );
      }

      if (Math.abs(delta) > 1) {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        scrollOwner.scrollTo({
          behavior: reducedMotion ? "auto" : "smooth",
          top: Math.max(0, scrollOwner.scrollTop + delta),
        });
      }
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasTransition = window.getComputedStyle(content).transitionDuration
      .split(",")
      .some((duration) => Number.parseFloat(duration) > 0);
    if (reducedMotion || !hasTransition) {
      frame = window.requestAnimationFrame(revealExpandedControls);
      return () => window.cancelAnimationFrame(frame);
    }

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === content && event.propertyName === "grid-template-rows") {
        revealExpandedControls();
      }
    };
    content.addEventListener("transitionend", handleTransitionEnd);
    return () => {
      content.removeEventListener("transitionend", handleTransitionEnd);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isContentOpen]);

  return (
    <section
      className={`content-subpanel stack field-span-2 editor-section${
        invalid ? " is-invalid-section" : ""
      }${isContentOpen ? " is-open" : ""}`}
      data-invalid={invalid || undefined}
      ref={sectionRef}
    >
      {collapsible ? (
        <button
          aria-controls={contentId}
          aria-expanded={isOpen}
          className="section-heading-row editor-section-summary"
          onClick={() => {
            if (!isOpen) revealRequestedRef.current = true;
            setIsOpen((current) => !current);
          }}
          ref={summaryRef}
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
        ref={contentRef}
      >
        <div className="editor-section-content-inner stack">{children}</div>
      </div>
    </section>
  );
}
