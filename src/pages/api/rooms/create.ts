import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { rooms } from '../../../db/schema';
import { v4 as uuidv4 } from 'uuid';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const data = await request.formData();
    const name = data.get('name')?.toString();
    
    if (name && name.trim()) {
      const trimmedName = name.trim();
      const id = uuidv4();
      
      await db.insert(rooms).values({
        id,
        name: trimmedName,
        createdAt: new Date()
      });
      
      return redirect(`/chat/${id}`);
    }
  } catch(e) {}
  
  return redirect('/chat');
};
