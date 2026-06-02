import { auth } from "@/auth";
import { countUnreadAdminRepliesForCustomer } from "@/lib/support-queries";
import { SupportChatBubble } from "@/components/support-chat-bubble";

export async function SupportChatBubbleHost() {
  const session = await auth().catch(() => null);
  if (session?.user?.role !== "customer" || !session.user.id) return null;
  const unread = await countUnreadAdminRepliesForCustomer(session.user.id);
  return <SupportChatBubble initialUnread={unread} />;
}
