import { Suspense } from "react";
import { LoginShell } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginShell />
    </Suspense>
  );
}
