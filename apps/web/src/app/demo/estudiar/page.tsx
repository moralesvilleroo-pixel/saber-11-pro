import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SessionRunner } from "@/components/SessionRunner";
import { demoBank } from "@/lib/study/demoBank";
import { mockScaleFromParam, modeFromSlug } from "@/lib/study/modes";

export const metadata: Metadata = { title: "Estudiar (demo)" };

export default async function DemoStudyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const mode = modeFromSlug(params.modo);
  if (!mode) redirect("/demo");
  const scale = mockScaleFromParam(params.escala);
  return (
    <SessionRunner
      key={mode}
      mode={mode}
      source={{ kind: "demo", bank: demoBank() }}
      profile={{ displayName: null, dailyStudyMinutes: 15, targetExamDate: null, targetGlobalScore: null }}
      {...(scale ? { mockScale: scale } : {})}
      homeHref="/demo"
    />
  );
}
