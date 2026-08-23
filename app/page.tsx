import { AppRoot } from "@/components/AppRoot";
import { getSession } from "@/lib/auth/session";
import { getServerName } from "@/lib/auth/password";

export default async function Home() {
  const [session, appName] = await Promise.all([getSession(), getServerName()]);

  return <AppRoot appName={appName} initialUser={session} />;
}
