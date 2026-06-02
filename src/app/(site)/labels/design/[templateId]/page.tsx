import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ load?: string }>;
};

/** Legacy URL — editor lives at /labels with a template dropdown. */
export default async function LabelDesignRedirectPage({ params, searchParams }: Props) {
  const { templateId } = await params;
  const { load } = await searchParams;
  const q = new URLSearchParams();
  q.set("template", templateId);
  if (load) q.set("load", load);
  redirect(`/labels?${q.toString()}`);
}
