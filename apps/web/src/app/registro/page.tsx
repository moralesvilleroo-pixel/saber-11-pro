import type { Metadata } from "next";
import { PRIVACY_POLICY_VERSION } from "@/lib/legal";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return <RegisterForm policyVersion={PRIVACY_POLICY_VERSION} />;
}
