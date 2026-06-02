export default function SettingsRootLayout({ children }: { children: React.ReactNode }) {
  /* Solid backing so the global wallpaper never shows through settings */
  return <div className="min-h-dvh bg-[#e8e4dc] text-ink">{children}</div>;
}
