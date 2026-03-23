import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { messages, users } from '../../../../db/schema';
import { eq, desc, and, lt } from 'drizzle-orm';
import { getUserColor } from '../../../../lib/color';

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const roomId = params.id;
  const url = new URL(request.url);
  const beforeParam = url.searchParams.get('before');

  if (!roomId) return new Response(null, { status: 400 });

  const userId = cookies.get('userId')?.value;
  if (!userId) return new Response(null, { status: 401 });

  const conditions = [eq(messages.roomId, roomId)];
  if (beforeParam) {
    conditions.push(lt(messages.createdAt, new Date(parseInt(beforeParam))));
  }

  const limit = 30;
  const rawMsgs = await db
    .select({
      id: messages.id,
      userId: messages.userId,
      content: messages.content,
      isSystemMessage: messages.isSystemMessage,
      createdAt: messages.createdAt,
      nickname: users.nickname
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  const historyMsgs = rawMsgs.reverse();
  let htmlSnippet = '';

  const escapeHtml = (unsafe: string) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  for (const msg of historyMsgs) {
    if (msg.isSystemMessage) {
      const safeContent = escapeHtml(msg.content);
      htmlSnippet += `
        <div class="flex flex-col message-item items-center" data-is-system="true">
          <div class="text-xs text-slate-400 italic my-2 bg-slate-900/40 border border-slate-700/50 px-4 py-1.5 rounded-full shadow-sm backdrop-blur-sm">${safeContent}</div>
        </div>
      `;
    } else {
      const isSelf = msg.userId === userId;
      const safeContent = escapeHtml(msg.content).replace(/@(everyone|[a-zA-Z0-9_.-]+)/g, (match, uname) => {
        return `<span class="text-amber-400 font-bold bg-amber-500/10 px-1 rounded-sm" data-mention="${uname.toLowerCase()}">${match}</span>`;
      });
      
      const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const nickname = msg.nickname || 'Unknown';
      const initial = nickname.charAt(0).toUpperCase();
      const color = getUserColor(msg.userId);

      htmlSnippet += `
        <div class="flex message-item w-full mb-4 msg-wrapper-${msg.userId} ${isSelf ? 'justify-end' : 'justify-start'}" data-msg-user-id="${msg.userId}">
          ${!isSelf ? `
          <div class="msg-avatar-${msg.userId} w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mr-2 mt-auto shadow-sm mb-1" style="background-color: ${color}">
            ${initial}
          </div>` : ''}
          <div class="flex flex-col msg-bubble-container-${msg.userId} ${isSelf ? 'items-end' : 'items-start'} max-w-[75%]">
            <div class="rounded-2xl px-4 py-2.5 shadow-sm msg-bubble-${msg.userId} ${isSelf ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-700 text-slate-100 rounded-bl-sm border border-slate-600'}">
              ${!isSelf ? `<div class="text-xs text-blue-300 mb-1 font-semibold tracking-wide msg-nickname msg-nickname-${msg.userId}">${nickname}</div>` : ''}
              <div class="break-words whitespace-pre-wrap leading-relaxed space-y-2">${safeContent}</div>
            </div>
            <div class="text-[10px] text-slate-500 mt-1 opacity-70 px-1">
              ${timeStr}
            </div>
          </div>
        </div>
      `;
    }
  }

  if (historyMsgs.length < limit) {
    htmlSnippet = '<div class="py-4 text-center text-xs text-slate-500 w-full mb-auto mt-8">Beginning of room history.</div>' + htmlSnippet;
  } else {
    const newOldest = historyMsgs[0];
    htmlSnippet = `<div id="history-loader" hx-get="/api/rooms/${roomId}/history?before=${newOldest.createdAt.getTime()}" hx-trigger="intersect once" hx-swap="outerHTML" class="py-2 text-center text-xs text-slate-500">Loading older messages...</div>` + htmlSnippet;
  }

  return new Response(htmlSnippet, { headers: { 'Content-Type': 'text/html' } });
};
