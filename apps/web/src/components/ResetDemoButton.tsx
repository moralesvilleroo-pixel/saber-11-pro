"use client";
import { useState } from "react";
import { resetDemoProgress } from "@/lib/study/demoRepository";

export function ResetDemoButton() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={() => {
        resetDemoProgress();
        setDone(true);
      }}
    >
      {done ? "Progreso borrado" : "Borrar mi progreso de la demo"}
    </button>
  );
}
