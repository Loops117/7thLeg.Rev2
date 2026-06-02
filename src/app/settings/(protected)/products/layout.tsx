import { ProductsSettingsTabs } from "@/components/settings/products-settings-tabs";

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl">
      <ProductsSettingsTabs />
      {children}
    </div>
  );
}
