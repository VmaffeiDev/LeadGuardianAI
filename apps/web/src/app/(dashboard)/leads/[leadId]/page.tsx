import { LeadDetailView } from "@/components/leads/lead-detail-view";
import { auth } from "@/lib/auth";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const session = await auth();
  return <LeadDetailView leadId={leadId} role={session!.user.role} />;
}
