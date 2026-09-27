# tauri-plugin-google-auth (Credential Manager native flow) — required because
# the release build has minifyEnabled=true. Sourced from the plugin docs.
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
