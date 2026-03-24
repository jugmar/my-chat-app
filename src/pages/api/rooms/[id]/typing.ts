import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { users, rooms } from '../../../../db/schema';
import { chatEmitter } from '../../../../lib/emitter';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ params, cookies }) => {
  const roomId = params.id;
  if (!roomId) return new Response('Bad Request', { status: 400 });

  const userId = cookies.get('userId')?.value;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // Vault Protocol Checks
  const targetRoom = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (targetRoom.length === 0) return new Response('Not Found', { status: 404 });
  if (targetRoom[0].password && cookies.get(`room_auth_${roomId}`)?.value !== 'true') {
    return new Response('Vault Access Denied', { status: 401 });
  }

  try {
    // Get nickname from DB
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const nickname = userRows.length > 0 ? userRows[0].nickname : 'Someone';

    const htmlSnippet = `
      <div id="typing-indicator" class="text-xs text-slate-400 italic px-4 py-1 animate-pulse flex items-center gap-2">
        <span>${nickname} is typing</span>
        <span class="flex gap-0.5">
          <span class="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
          <span class="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
          <span class="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
        </span>
      </div>
      <script>
        setTimeout(() => {
          const el = document.getElementById('typing-indicator');
          if (el) el.remove();
        }, 3000);
      </script>
    `;

    chatEmitter.emit(`room:${roomId}:typing`, htmlSnippet.replace(/\n\s+/g, ' '));
  } catch(e) {}

  return new Response(null, { status: 200 });
};
