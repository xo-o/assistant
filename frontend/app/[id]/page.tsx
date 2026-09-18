import { ChatWorkspace } from "../components/chat-workspace";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  return <ChatWorkspace initialSessionId={id} />;
}
