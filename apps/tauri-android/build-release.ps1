# BCS Console (Tauri Android) — one-shot release build (APK + AAB).
#
# REQUIREMENT (Windows blocks the build without it — Tauri symlinks the
# Rust .so into jniLibs and that needs symlink privilege):
#   EITHER enable Developer Mode (Settings > System > For developers > ON),
#   OR run this script in a terminal launched as Administrator.
#
# Env needed (already set persistently via setx): ANDROID_HOME, NDK_HOME,
# JAVA_HOME. Supabase Redirect URLs must include bcsconsole://auth-callback.

$ErrorActionPreference = 'Stop'

# 1. Fresh web frontend into apps/web/dist (npx — pnpm is broken in apps/web)
Push-Location (Join-Path $PSScriptRoot '..\web')
npx expo export --platform web
Pop-Location

# 2. Signed release APK + AAB (keystore via src-tauri/gen/android/keystore.properties,
#    gradle signing config in gen/android/app/build.gradle.kts)
cargo tauri android build --apk --aab --ci

Write-Host ''
Write-Host 'Artifacts:'
Write-Host '  APK: src-tauri\gen\android\app\build\outputs\apk\release\'
Write-Host '  AAB: src-tauri\gen\android\app\build\outputs\bundle\release\'
