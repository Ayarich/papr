import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
  const user = await getUser();
  if (user) redirect(safeNext || (user.role === "student" ? "/my" : user.role === "reader" ? "/" : user.role === "lecturer" ? "/collections" : "/moderate"));
  return (
    <div className="narrow" style={{ maxWidth: 480 }}>
      <div className="card pad-lg stack" style={{ gap: 18 }}>
        <div>
          <h1>Log in</h1>
          <p className="muted" style={{ marginTop: 6 }}>No password needed. We&apos;ll email you a 6-digit code.</p>
        </div>
        <LoginForm next={safeNext} />
      </div>
    </div>
  );
}
