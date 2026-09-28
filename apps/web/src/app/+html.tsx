import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Custom web HTML template for Expo Router.
 * Injects Google Fonts Noto Sans Bengali into <head> for fast web font loading.
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
      <body>{children}</body>
    </html>
  );
}
