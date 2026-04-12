import { StudioWorkspace } from "@/components/StudioWorkspace/StudioWorkspace";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudioIdPage({ params }: PageProps) {
  const { id } = await params;
  return <StudioWorkspace sessionId={decodeURIComponent(id)} />;
}
