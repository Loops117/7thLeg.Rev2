import Link from "next/link";
import type { ProductBackNav } from "@/lib/product-back-nav";

export function ProductBackLink({ href, label }: ProductBackNav) {
  return (
    <p className="text-sm font-medium text-lagoon-dark">
      <Link href={href} className="underline">
        ← {label}
      </Link>
    </p>
  );
}
