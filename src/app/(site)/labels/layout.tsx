/** Label editor fills main column below header; no page scroll. */
export default function LabelsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}