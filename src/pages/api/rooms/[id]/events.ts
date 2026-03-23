import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { users } from '../../../../db/schema';
import { chatEmitter } from '../../../../lib/emitter';
import { eq } from 'drizzle-orm';

// Track online users per room: Record<roomId, Map<userId, nickname>>
export const roomUsers: Record<string, Map<string, string>> = {};

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const roomId = params.id;
  if (!roomId) return new Response(null, { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: string) => {
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`)); } catch(e) {}
      };

      const userId = cookies.get('userId')?.value;
      let nickname = 'Unknown';
      
      if (userId) {
        const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (userRows.length > 0) nickname = userRows[0].nickname;
      }

      if (!roomUsers[roomId]) roomUsers[roomId] = new Map();
      if (userId) roomUsers[roomId].set(userId, nickname);
      
      const broadcastPresence = () => {
        const count = roomUsers[roomId]?.size || 0;
        const html = `
          <div class="flex items-center gap-2 text-sm text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-sm">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ${count} Online
          </div>
        `;
        chatEmitter.emit(`room:${roomId}:presence`, html.replace(/\n\s+/g, ' '));
      };
      
      setTimeout(broadcastPresence, 100);
      const heartbeat = setInterval(() => sendEvent('ping', ''), 30000);

      const roomEventName = `room:${roomId}:message`;
      const onMessage = (htmlPayload: string) => sendEvent('message', htmlPayload);
      const roomPresenceEventName = `room:${roomId}:presence`;
      const onPresence = (htmlPayload: string) => sendEvent('presence', htmlPayload);
      const roomTypingEventName = `room:${roomId}:typing`;
      const onTyping = (htmlPayload: string) => sendEvent('typing', htmlPayload);

      chatEmitter.on(roomEventName, onMessage);
      chatEmitter.on(roomPresenceEventName, onPresence);
      chatEmitter.on(roomTypingEventName, onTyping);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        chatEmitter.off(roomEventName, onMessage);
        chatEmitter.off(roomPresenceEventName, onPresence);
        chatEmitter.off(roomTypingEventName, onTyping);
        
        if (userId && roomUsers[roomId]) {
          roomUsers[roomId].delete(userId);
        }
        broadcastPresence();
        
        try { controller.close(); } catch (e) {}
      });
    }
  });

  return new Response(stream, { 
    headers: { 
      'Content-Type': 'text/event-stream', 
      'Cache-Control': 'no-cache', 
      'Connection': 'keep-alive' 
    } 
  });
};
