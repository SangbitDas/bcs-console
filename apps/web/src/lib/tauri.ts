/* Tauri (Android WebView shell) helpers.
 *
 * Everything here is a no-op outside Tauri: all plugin modules are loaded
 * with dynamic import() only after isTauri() is true, so the Vercel web
 * bundle and the React Native build never touch Tauri APIs.
 *
 * Auth flow (Google blocks embedded WebViews, so we never sign in inside
 * the WebView): system browser (opener plugin) -> Supabase ->
 * `bcsconsole://auth-callback?code=...` deep link -> deep-link plugin ->
 * completeAuthRedirect() in ./auth.
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/* Tags <body> so Tauri-only CSS (edge-to-edge, scroll-lock) can apply.
 * No-op everywhere else. Safe to call on every mount. */
export function applyTauriBodyClass(): void {
  if (typeof document === 'undefined') return;
  if (isTauri()) document.body.classList.add('tauri-app');
}

export async function openSystemBrowser(url: string): Promise<void> {
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(url);
}

export async function getTauriStartUrls(): Promise<string[]> {
  const { getCurrent } = await import('@tauri-apps/plugin-deep-link');
  return (await getCurrent()) ?? [];
}

export async function onTauriOpenUrl(
  cb: (urls: string[]) => void,
): Promise<() => void> {
  const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
  return await onOpenUrl(cb);
}

/** Exchange a Tauri deep-link auth return (`?code=` / `#access_token=`)
 *  for a Supabase session. Returns true when a URL was consumed. */
export async function consumeTauriAuthUrls(
  urls: readonly string[],
  exchange: (url: string) => Promise<{ error: Error | null }>,
): Promise<boolean> {
  for (const url of urls) {
    if (url.includes('code=') || url.includes('access_token=')) {
      const { error } = await exchange(url);
      if (!error) return true;
    }
  }
  return false;
}
