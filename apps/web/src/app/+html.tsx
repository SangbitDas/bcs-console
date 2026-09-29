import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';
import { SPLASH_SVG } from '../lib/splashSvg';

/**
 * Custom web HTML template for Expo Router.
 * Injects Google Fonts Noto Sans Bengali into <head> for fast web font loading.
 *
 * Splash: #bcs-splash (logo animation same-to-same as /splash.html) paints on
 * first paint — before the JS bundle loads — so the Tauri Android WebView
 * never flashes white / stutters while JS parses. React fades it out in
 * _layout.tsx at max(2200ms after paint, fonts ready) with the original
 * 0.4s scale-up fadeout, then removes it.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="bn">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="referrer" content="no-referrer" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Cream base so there is never a white flash before paint */
              html, body { background: #F8F5EF; }

              /* ---- instant splash overlay (same-to-same as /splash.html) ---- */
              #bcs-splash {
                position: fixed; inset: 0; z-index: 99999;
                background: #F8F5EF;
                display: flex; align-items: center; justify-content: center;
              }
              #bcs-splash .stage { width: min(60vmin, 320px); }
              #bcs-splash svg { width: 100%; height: auto; display: block; overflow: visible; }
              #bcs-splash-logo {
                transform-box: view-box;
                transform-origin: 512px 512px;
                animation: bcs-settle 0.9s cubic-bezier(.2,.9,.3,1.2) both;
              }
              #bcs-splash-logo path {
                opacity: 0;
                animation: bcs-appear 0.5s ease-out forwards;
              }
              #bcs-splash-logo path:nth-of-type(1) { animation-delay: 0.10s; }
              #bcs-splash-logo path:nth-of-type(2) { animation-delay: 0.22s; }
              #bcs-splash-logo path:nth-of-type(3) { animation-delay: 0.34s; }
              #bcs-splash-logo path:nth-of-type(4) { animation-delay: 0.46s; }
              #bcs-splash-logo path:nth-of-type(5) { animation-delay: 0.58s; }
              #bcs-splash-logo path:nth-of-type(6) { animation-delay: 0.70s; }
              #bcs-splash-logo path:nth-of-type(n+7) { animation-delay: 0.85s; }
              @keyframes bcs-appear { to { opacity: 1; } }
              @keyframes bcs-settle { from { transform: scale(0.85); } to { transform: scale(1); } }
              /* Fade only starts after .go (first presented frame) — the WebView
                 parses HTML while the native window background is still up,
                 so without this gate the whole sequence would play unseen. */
              #bcs-splash:not(.go) #bcs-splash-logo,
              #bcs-splash:not(.go) #bcs-splash-logo path {
                animation-play-state: paused;
              }
              /* fade the whole splash out at the end (like handing off to the first screen) */
              #bcs-splash.out .stage { animation: bcs-fadeout 0.4s ease-in forwards; }
              @keyframes bcs-fadeout { to { opacity: 0; transform: scale(1.05); } }

              /* KaTeX formula rendering */
              .katex {
                font-size: 1.08em;
                line-height: 1.2;
                direction: ltr;
              }
              .katex-html {
                overflow-x: auto;
                overflow-y: hidden;
                vertical-align: middle;
              }
              .katex .mord {
                font-family: 'Noto Sans Bengali', system-ui, sans-serif;
              }

              /* TAURI-ONLY scrollbar rules (body.tauri-app is set by
                 applyTauriBodyClass() inside the Tauri shell — desktop web
                 never has this class, so Vercel is pixel-identical).
                 Kills every web-drawn scrollbar pill in the mobile app,
                 including question lists (accepted tradeoff). */
              body.tauri-app, body.tauri-app #root {
                scrollbar-width: none;
                height: 100dvh;
                overflow: hidden;
                overscroll-behavior: none;
              }
              body.tauri-app::-webkit-scrollbar,
              body.tauri-app #root::-webkit-scrollbar,
              body.tauri-app *::-webkit-scrollbar {
                display: none !important;
              }
            `,
          }}
        />
      </head>
      <body>
        <div id="bcs-splash">
          <div className="stage" dangerouslySetInnerHTML={{ __html: SPLASH_SVG }} />
        </div>
        {/* Start the splash animation only after the WebView actually presents
            a frame (double rAF): this is the moment the native window
            background lifts, so the full sequence plays visibly instead of
            behind it. Runs at parse time — before the main bundle loads. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function go(){var s=document.getElementById('bcs-splash');if(s){s.classList.add('go');}try{window.__bcsSplashGo=performance.now();}catch(e){}}if(typeof requestAnimationFrame==='function'){requestAnimationFrame(function(){requestAnimationFrame(function(){setTimeout(go,120);});});}else{setTimeout(go,120);}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
