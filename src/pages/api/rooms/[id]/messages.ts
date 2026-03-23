import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { messages, users, notifications } from '../../../../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { chatEmitter } from '../../../../lib/emitter';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const roomId = params.id;
  if (!roomId) return new Response(null, { status: 400 });

  const userId = cookies.get('userId')?.value;
  if (!userId) return new Response(null, { status: 401 });

  try {
    const data = await request.formData();
    const content = data.get('content')?.toString();

    if (content && content.trim()) {
      const msgId = uuidv4();
      const now = new Date();
      const cleanContent = content.trim();

      await db.insert(messages).values({
        id: msgId,
        roomId,
        userId,
        content: cleanContent, // store raw, escape on read
        createdAt: now,
        isSystemMessage: false,
      });

      const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const nickname = userRows.length > 0 ? userRows[0].nickname : 'Unknown';

      // HTML Escaping and Mention formatting
      const escapeHtml = (unsafe: string) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
      const mentionedNicknames = new Set<string>();
      let mentionsEveryone = false;
      
      const safeContent = escapeHtml(cleanContent).replace(/@(everyone|[a-zA-Z0-9_.-]+)/g, (match, uname) => {
        const lowerUname = uname.toLowerCase();
        if (lowerUname === 'everyone') mentionsEveryone = true;
        else mentionedNicknames.add(lowerUname);
        return `<span class="text-amber-400 font-bold bg-amber-500/10 px-1 rounded-sm" data-mention="${lowerUname}">${match}</span>`;
      });

      // Insert notifications
      const notifyUserIds = new Set<string>();
      
      // We import `ne` dynamically here for simplicity, or just read all users
      const allUsers = await db.select({ id: users.id, nickname: users.nickname }).from(users);
      for (const u of allUsers) {
        if (u.id !== userId) {
          if (mentionsEveryone || mentionedNicknames.has(u.nickname.toLowerCase())) {
            notifyUserIds.add(u.id);
          }
        }
      }

      // We use the imported `notifications` schema directly.

      for (const targetUserId of notifyUserIds) {
        await db.insert(notifications).values({
          id: uuidv4(),
          userId: targetUserId,
          senderId: userId,
          roomId: roomId,
          messageId: msgId,
          isRead: false,
          createdAt: now,
        });
        chatEmitter.emit(`user:${targetUserId}:notification`, '{}');
      }

      const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const initial = nickname.charAt(0).toUpperCase();

      const htmlSnippet = `
<div id="new-msg-${msgId}" class="tmp-msg-wrapper hidden" data-msg-user-id="${userId}" data-nickname="${nickname}" data-time="${timeStr}" data-initial="${initial}">
  <div class="message-content w-fit max-w-[85%] md:max-w-[75%] px-4 py-2 shadow-sm rounded-2xl message-bubble relative group">
    <div class="break-words whitespace-pre-wrap leading-relaxed space-y-2">${safeContent}</div>
  </div>
</div>`;

      chatEmitter.emit(`room:${roomId}:message`, htmlSnippet.replace(/\n\s+/g, ' '));
    }
  } catch(e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
};
