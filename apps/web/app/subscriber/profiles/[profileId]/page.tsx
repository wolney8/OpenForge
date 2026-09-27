import { SubscriberProfile } from "@/components/subscriber-workflow";
export default async function Page({ params }: { params: Promise<{ profileId: string }> }) { const { profileId } = await params; return <SubscriberProfile profileId={profileId} />; }
