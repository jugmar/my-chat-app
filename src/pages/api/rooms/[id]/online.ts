import type { APIRoute } from 'astro';
import { roomUsers } from './events';
import { db } from '../../../../db';
import { rooms } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ params, cookies }) => {
  const roomId = params.id;
  if (!roomId) return new Response(JSON.stringify([]), { status: 400 });
  
  const userId = cookies.get('userId')?.value;
  if (!userId) return new Response(JSON.stringify([]), { status: 401 });

  // Vault Protocol Checks
  const targetRoom = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (targetRoom.length === 0) return new Response('[]', { status: 404 });
  if (targetRoom[0].password && cookies.get(`room_auth_${roomId}`)?.value !== 'true') {
    return new Response('[]', { status: 401 });
  }

  const usersMap = roomUsers[roomId];
  const onlineUsers = usersMap ? Array.from(usersMap.entries()).map(([id, nickname]) => ({ id, nickname })) : [];

  return new Response(JSON.stringify(onlineUsers), {
    headers: { 'Content-Type': 'application/json' }
  });
};
