import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { rooms, messages, notifications } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const roomId = params.id;
  if (!roomId) return new Response(null, { status: 400 });

  const userId = cookies.get('userId')?.value;
  if (!userId) return new Response(null, { status: 401 });

  const targetRoom = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (targetRoom.length === 0) return new Response(null, { status: 404 });
  if (targetRoom[0].name.toLowerCase() === 'lobby') return new Response(null, { status: 403 }); // Cannot delete lobby

  // Delete messages and notifications first (simulate cascade)
  await db.delete(notifications).where(eq(notifications.roomId, roomId));
  await db.delete(messages).where(eq(messages.roomId, roomId));
  
  // Delete the room
  await db.delete(rooms).where(eq(rooms.id, roomId));

  const url = new URL(request.url);
  const activeRoomId = url.searchParams.get('active');

  // If the user deleted the room they are currently sitting in, eject them back to the directory/lobby
  if (activeRoomId === roomId) {
    return new Response(' ', { status: 200, headers: { 'HX-Redirect': `/chat` } });
  }

  // Otherwise just let HTMX gracefully fade out the HTML element on the client side
  return new Response(' ', { status: 200 });
};
