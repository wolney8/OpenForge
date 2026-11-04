import { BrandLogo } from "@/components/brand-logo";
import { platformBrand } from "@/lib/brand";
import styles from "./design-lab-auth.module.css";

export function AuthPresentation({ children, inspectionId, subtitle, titleId }: {
  children: React.ReactNode;
  inspectionId: string;
  subtitle: string;
  titleId: string;
}) {
  return <main className={styles.page} data-pd-id={inspectionId}>
    <section aria-labelledby={titleId} className={styles.card}>
      <div className={styles.brand}><span className="brand-mark"><BrandLogo variant="mark" /></span><span className={styles.brandText}>{platformBrand.name}<small>{subtitle}</small></span></div>
      {children}
    </section>
  </main>;
}
