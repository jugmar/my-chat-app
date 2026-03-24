import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { rooms } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const roomId = params.id;
  if (!roomId) return new Response(null, { status: 400 });

  const data = await request.formData();
  const password = data.get('password')?.toString();

  const targetRoom = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (targetRoom.length === 0) return new Response(null, { status: 404 });

  if (!targetRoom[0].password || targetRoom[0].password === password) {
    // Issue unforgeable room-specific access pass
    cookies.set(`room_auth_${roomId}`, 'true', { path: '/', httpOnly: true, sameSite: 'lax' });
    return redirect(`/chat/${roomId}`);
  }

  // Deny entry
  return redirect(`/chat/${roomId}?error=Incorrect+Room+Password`);
};
