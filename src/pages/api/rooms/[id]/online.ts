import type { APIRoute } from 'astro';
import { roomUsers } from './events';

export const GET: APIRoute = async ({ params }) => {
  const roomId = params.id;
  if (!roomId) return new Response(null, { status: 400 });

  const usersMap = roomUsers[roomId];
  const onlineUsers = usersMap ? Array.from(usersMap.entries()).map(([id, nickname]) => ({ id, nickname })) : [];

  return new Response(JSON.stringify(onlineUsers), {
    headers: { 'Content-Type': 'application/json' }
  });
};
