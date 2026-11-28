import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SessionRunner } from "@/components/SessionRunner";
import { requireProfile } from "@/lib/auth";
import { mockScaleFromParam, modeFromSlug } from "@/lib/study/modes";

export const metadata: Metadata = { title: "Estudiar" };
export const dynamic = "force-dynamic";

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { user, profile, canStudy } = await requireProfile("/estudiar");
  const mode = modeFromSlug(params.modo);
  if (!mode || !canStudy) redirect("/inicio");
  const scale = mockScaleFromParam(params.escala);
  return (
    <SessionRunner
      key={mode}
      mode={mode}
      source={{ kind: "account", userId: user.id }}
      profile={{
        displayName: profile.display_name,
        dailyStudyMinutes: profile.daily_study_minutes,
        targetExamDate: profile.target_exam_date,
        targetGlobalScore: profile.target_global_score,
      }}
      {...(scale ? { mockScale: scale } : {})}
      homeHref="/inicio"
    />
  );
}
