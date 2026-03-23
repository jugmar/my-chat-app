import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  const isProtectedPath = context.url.pathname.startsWith('/chat') || context.url.pathname.startsWith('/api');
  const isSetupPath = context.url.pathname.startsWith('/api/setup');
  
  if (isProtectedPath && !isSetupPath) {
    // We explicitly read from process.env at runtime here.
    // If you change the Railway environment variable, this will instantly pick it up on the next request
    // and correctly invalidate every single existing user session organically.
    const masterPassword = process.env.MASTER_PASSWORD;
    
    if (masterPassword) {
      const authCookie = context.cookies.get('auth_token')?.value;
      if (authCookie !== masterPassword) {
        if (context.url.pathname.startsWith('/api')) {
          return new Response('Unauthorized - Invalid Master Password', { status: 401 });
        }
        return context.redirect('/?error=' + encodeURIComponent('Authentication required or password changed. Please log in again.'));
      }
    }
  }

  return next();
});
