import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { notifications } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get('userId')?.value;
  if (!userId) return new Response(null, { status: 401 });

  await db.update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));

  // Redirect to GET back the updated HTML structure cleanly
  return new Response(null, {
    status: 303,
    headers: { Location: '/api/notifications' }
  });
};
