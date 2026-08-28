import { PublicErrorState } from "@/components/public-error-state";

export default function NotFound() {
  return <PublicErrorState message="The requested page is unavailable." title="Page not found" />;
}
