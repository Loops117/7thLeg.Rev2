import { ReportsDashboard } from "@/components/settings/reports/reports-dashboard";
import { parseReportDateRange } from "@/lib/reports/date-range";
import { fetchReportsBundle } from "@/lib/reports/queries";

type Props = {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
    bucket?: string;
  }>;
};

export default async function SettingsReportsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const range = parseReportDateRange(sp);
  const data = await fetchReportsBundle(range);

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-4 text-3xl font-black tracking-tight text-palm dark:border-emerald-800 dark:text-emerald-300">
        Reports
      </h1>
      <p className="mt-3 max-w-3xl text-sm text-ink/75 dark:text-zinc-400">
        Store performance for the selected date range. Traffic metrics collect from storefront page views going
        forward; historical traffic before tracking was enabled will appear empty.
      </p>
      <div className="mt-8">
        <ReportsDashboard data={data} />
      </div>
    </div>
  );
}
