import { LabelsSettingsSubnav } from "@/components/settings/labels-settings-subnav";

export default function SettingsLabelsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <LabelsSettingsSubnav />
      {children}
    </div>
  );
}
