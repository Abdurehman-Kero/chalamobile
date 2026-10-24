import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Adds to index.html the tags that depend on where the store is hosted:
 *  - a head start on the connections to the shop's API and the photo host,
 *  - the address of the site itself (canonical link and the share picture), once VITE_SITE_URL is set.
 */
function siteTags(env: Record<string, string>): Plugin {
  const origin = (url: string) => { try { return new URL(url).origin; } catch { return ''; } };
  return {
    name: 'chala-site-tags',
    transformIndexHtml() {
      const tags: { tag: string; attrs: Record<string, string>; injectTo: 'head' }[] = [];
      const api = origin(env.VITE_API_URL ?? '');
      if (api) tags.push({ tag: 'link', attrs: { rel: 'preconnect', href: api, crossorigin: '' }, injectTo: 'head' });
      tags.push({ tag: 'link', attrs: { rel: 'preconnect', href: 'https://res.cloudinary.com', crossorigin: '' }, injectTo: 'head' });

      const site = (env.VITE_SITE_URL ?? '').replace(/\/+$/, '');
      if (site) {
        tags.push(
          { tag: 'link', attrs: { rel: 'canonical', href: `${site}/` }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:url', content: `${site}/` }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image', content: `${site}/og-image.png` }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'twitter:image', content: `${site}/og-image.png` }, injectTo: 'head' },
        );
      }
      return tags;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss(), siteTags(env)],
    server: { port: 5173 },
    build: {
      target: 'es2022',
      sourcemap: false,            // the source is not published with the site
      chunkSizeWarningLimit: 400,
    },
  };
});
