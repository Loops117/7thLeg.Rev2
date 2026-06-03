import { ProductsSettingsTabs } from "@/components/settings/products-settings-tabs";

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[min(100%,90rem)]">
      <ProductsSettingsTabs />
      {children}
    </div>
  );
}
