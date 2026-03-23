import type { APIRoute } from 'astro';
import { chatEmitter } from '../../../lib/emitter';

export const GET: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get('userId')?.value;
  if (!userId) return new Response(null, { status: 401 });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: string) => {
        try {
          const dataLines = data.split('\n').map(line => `data: ${line}`).join('\n');
          controller.enqueue(encoder.encode(`event: ${event}\n${dataLines}\n\n`));
        } catch(e) {}
      };

      const heartbeat = setInterval(() => sendEvent('ping', ''), 30000);

      const userEventName = `user:${userId}:notification`;
      const onNotification = () => {
        sendEvent('notification_update', '');
      };

      chatEmitter.on(userEventName, onNotification);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        chatEmitter.off(userEventName, onNotification);
        try { controller.close(); } catch (e) {}
      });
    }
  });

  return new Response(stream, { 
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } 
  });
};
