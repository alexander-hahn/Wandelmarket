import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? "";

  if (!token) {
    redirect("/");
  }

  const user = await getSessionUserByToken(token);
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return <>{children}</>;
}
