import Image from "next/image";
import { platformBrand } from "@/lib/brand";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: "full" | "mark";
};

export function BrandLogo({
  className = "",
  priority = false,
  variant = "full",
}: BrandLogoProps) {
  return (
    <Image
      alt={platformBrand.name}
      className={`brand-logo brand-logo-${variant} ${className}`.trim()}
      height={500}
      priority={priority}
      src={platformBrand.logoPath}
      width={731}
    />
  );
}
