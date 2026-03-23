import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { notifications, users, rooms } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ cookies }) => {
  const userId = cookies.get('userId')?.value;
  if (!userId) return new Response(null, { status: 401 });

  const notifs = await db
    .select({
      id: notifications.id,
      roomId: notifications.roomId,
      messageId: notifications.messageId,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      senderNickname: users.nickname,
      roomName: rooms.name
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.senderId, users.id))
    .leftJoin(rooms, eq(notifications.roomId, rooms.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  const unreadCount = notifs.filter(n => !n.isRead).length;

  const html = `
    <!-- Bell Icon with Badge -->
    <div id="notification-bell-container" class="relative group cursor-pointer" onclick="document.getElementById('notif-dropdown')?.classList.toggle('hidden')">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-slate-300 group-hover:text-white transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      ${unreadCount > 0 ? `<div class="absolute -top-1 -right-1 bg-red-500 text-xs text-white font-bold w-4 h-4 rounded-full flex items-center justify-center shadow animate-bounce">${unreadCount}</div>` : ''}

      <!-- Dropdown -->
      <div id="notif-dropdown" class="hidden absolute right-0 mt-3 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-20 cursor-default" onclick="event.stopPropagation()">
        <div class="px-4 py-3 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h3 class="font-semibold text-slate-100">Notifications</h3>
          ${unreadCount > 0 ? `<button hx-post="/api/notifications/read" hx-target="#notification-bell-container" hx-swap="outerHTML" class="text-xs text-blue-400 hover:text-blue-300 transition focus:outline-none">Mark all read</button>` : ''}
        </div>
        <div class="max-h-[60vh] overflow-y-auto">
          ${notifs.length === 0 ? '<div class="p-6 text-center text-sm text-slate-500">No mentions yet</div>' : ''}
          ${notifs.map(n => `
            <a href="/chat/${n.roomId}" class="block p-4 border-b border-slate-700/50 hover:bg-slate-700 transition ${!n.isRead ? 'bg-slate-700/40 relative' : ''}">
              ${!n.isRead ? '<div class="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>' : ''}
              <div class="flex justify-between items-start mb-1 ${!n.isRead ? 'pl-2' : ''}">
                <span class="font-medium text-sm text-slate-200">@${n.senderNickname}</span>
                <span class="text-xs text-slate-500 shrink-0">${new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div class="text-xs text-slate-400 ${!n.isRead ? 'pl-2' : ''}">Mentioned you in <span class="text-blue-400">#${n.roomName}</span></div>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
};
