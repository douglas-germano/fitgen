const apiModules = new Set([
  'auth', 'chat', 'community', 'diet', 'exercises', 'gamification', 'health',
  'hydration', 'metrics', 'notifications', 'nutrition', 'onboarding', 'profile',
  'referrals', 'subscriptions', 'workouts',
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const [, prefix, module] = url.pathname.split('/');
    if (prefix === 'admin' || (prefix === 'api' && !apiModules.has(module))) {
      return new Response('Not found', { status: 404 });
    }
    if (prefix === 'api' &&
      (/%(?:2f|5c|2e)/i.test(url.pathname) || /^\/api\/subscriptions\/(?!status(?:\/|$)|sync(?:\/|$))/.test(url.pathname))) {
      return new Response('Not found', { status: 404 });
    }
    if (prefix !== 'api') return env.ASSETS.fetch(request);

    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return new Response('Forbidden', { status: 403 });

    const upstream = new URL(env.FITGEN_API_ORIGIN);
    upstream.pathname = url.pathname;
    upstream.search = url.search;
    const headers = new Headers();
    for (const name of ['Accept', 'Authorization', 'Content-Type']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('Set-Cookie');
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  },
};
