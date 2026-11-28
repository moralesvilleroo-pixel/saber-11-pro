import type { Metadata } from "next";
import { ConsentPanel } from "@/components/ConsentPanel";
import { ProgressPanel } from "@/components/ProgressPanel";
import { SettingsForm } from "@/components/SettingsForm";
import { StudyMenu } from "@/components/StudyMenu";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Inicio" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { user, profile, canStudy } = await requireProfile("/inicio");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Hola{profile.display_name ? `, ${profile.display_name}` : ""}</h1>
        <form action="/salir" method="post">
          <button type="submit" className="text-sm text-primary underline">
            Cerrar sesión
          </button>
        </form>
      </div>

      {canStudy ? (
        <>
          <StudyMenu basePath="/estudiar" />
          <ProgressPanel userId={user.id} />
          <SettingsForm
            userId={user.id}
            initial={{
              targetExamDate: profile.target_exam_date,
              targetGlobalScore: profile.target_global_score,
              dailyStudyMinutes: profile.daily_study_minutes,
            }}
          />
        </>
      ) : (
        <ConsentPanel userId={user.id} guardianEmail={profile.parent_guardian_email} />
      )}
    </div>
  );
}
