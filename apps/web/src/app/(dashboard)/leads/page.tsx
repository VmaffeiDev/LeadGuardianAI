import { auth } from "@/lib/auth";
import { LeadsView } from "@/components/leads/leads-view";

export default async function LeadsPage() {
  const session = await auth();
  return <LeadsView role={session!.user.role} />;
}
