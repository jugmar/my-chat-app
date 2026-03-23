import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { messages, users } from '../../../../db/schema';
import { eq, desc, and, lt } from 'drizzle-orm';

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

  let currentGroupId: string | null = null;
  let currentGroupHtml = '';

  for (const msg of historyMsgs) {
    if (msg.isSystemMessage) {
      if (currentGroupHtml) { htmlSnippet += currentGroupHtml + '</div></div>'; currentGroupHtml = '';  currentGroupId = null; }
      
      const safeContent = escapeHtml(msg.content);
      htmlSnippet += `
        <div class="flex flex-col mb-4 items-center group-container" data-is-system="true">
          <div class="text-xs text-slate-400 italic my-2 bg-slate-900/40 border border-slate-700/50 px-4 py-1.5 rounded-full shadow-sm backdrop-blur-sm">${safeContent}</div>
        </div>
      `;
    } else {
      const isSelf = msg.userId === userId;
      const safeContent = escapeHtml(msg.content).replace(/@(everyone|[a-zA-Z0-9_.-]+)/g, (match, uname) => {
        return `<span class="text-amber-400 font-bold bg-amber-500/10 px-1 rounded-sm" data-mention="${uname.toLowerCase()}">${match}</span>`;
      });
      
      if (currentGroupId !== msg.userId) {
         if (currentGroupHtml) { htmlSnippet += currentGroupHtml + '</div></div>'; }
         
         const alignment = isSelf ? 'items-end' : 'items-start';
         const headerAlign = isSelf ? 'flex-row-reverse pr-1' : 'pl-1';
         const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
         const initial = msg.nickname ? msg.nickname.charAt(0).toUpperCase() : '?';

         currentGroupHtml = `
           <div class="flex flex-col mb-4 group-container ${alignment}" data-msg-user-id="${msg.userId}" data-is-system="false">
             <div class="flex items-center gap-2 mb-1 ${headerAlign} header-info">
               <div class="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white font-bold">${initial}</div>
               <span class="text-xs font-semibold ${isSelf ? 'text-slate-300' : 'text-blue-300'} msg-nickname">${msg.nickname || 'Unknown'}</span>
               <span class="text-[10px] text-slate-500">${timeStr}</span>
             </div>
             <div class="flex flex-col gap-1 bubble-container ${isSelf ? 'items-end' : 'items-start'}">
         `;
         currentGroupId = msg.userId;
      }
      
      const bubbleClass = isSelf ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-700 text-slate-100 border border-slate-600 rounded-tl-sm';
      
      currentGroupHtml += `
        <div class="w-fit max-w-[85%] md:max-w-[75%] px-4 py-2 shadow-sm rounded-2xl ${bubbleClass} message-content relative group">
          <div class="break-words whitespace-pre-wrap leading-relaxed space-y-2">${safeContent}</div>
        </div>
      `;
    }
  }

  if (currentGroupHtml) { htmlSnippet += currentGroupHtml + '</div></div>'; }

  if (historyMsgs.length < limit) {
    if (htmlSnippet === '') {
      htmlSnippet = '<div class="py-4 text-center text-xs text-slate-500 w-full mb-auto mt-8">Beginning of room history.</div>';
    } else {
      htmlSnippet = '<div class="py-4 text-center text-xs text-slate-500 w-full mb-auto mt-8">Beginning of room history.</div>' + htmlSnippet;
    }
  } else {
    const newOldest = historyMsgs[0];
    htmlSnippet = `<div id="history-loader" hx-get="/api/rooms/${roomId}/history?before=${newOldest.createdAt.getTime()}" hx-trigger="intersect once" hx-swap="outerHTML" class="py-2 text-center text-xs text-slate-500">Loading older messages...</div>` + htmlSnippet;
  }

  return new Response(htmlSnippet, { headers: { 'Content-Type': 'text/html' } });
};
