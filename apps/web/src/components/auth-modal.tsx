// BCS Console — Auth Modal (Google OAuth & User Profile)
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { LogOut, X } from 'lucide-react-native';
import { FONT } from '../lib/fonts';
import { useAuthStore } from '../lib/auth';
import { UserAvatar } from './avatar';
import { Bn } from './bn';

export function AuthModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user, profile, signInWithGoogle, signOut } = useAuthStore();
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMsg(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMsg('লগইন সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-4">
        {/* Backdrop dismiss */}
        <Pressable
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, cursor: 'pointer' }}
          onPress={onClose}
          // @ts-ignore
          onClick={onClose}
        />

        {/* Modal Container */}
        <View
          className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-black/15 bg-surface p-6 shadow-2xl"
          style={{ zIndex: 10 }}>
          {/* Close / Abort button */}
          <Pressable
            onPress={onClose}
            // @ts-ignore
            onClick={onClose}
            accessibilityRole="button"
            accessibilityLabel="বন্ধ করুন"
            hitSlop={12}
            style={{ position: 'absolute', top: 16, right: 16, zIndex: 100, cursor: 'pointer' }}
            className="h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] hover:bg-black/12 active:scale-95">
            <X size={16} color="#0A0A0A" />
          </Pressable>

          {!user ? (
            /* --- Signed Out State: Clean Login Prompt --- */
            <View>
              {/* Header */}
              <View className="mb-6 pr-8">
                <View className="mb-2 h-1 w-8 rounded-full bg-[#EA0000]" />
                <Bn style={{ fontFamily: FONT.displayBlack, fontSize: 20, lineHeight: 28 }}>
                  আপনার প্রোগ্রেস সেভ রাখার জন্য লগইন করুন
                </Bn>
              </View>

              {errorMsg ? (
                <View className="mb-4 rounded-lg bg-[#EA0000]/10 p-3">
                  <Text className="text-[#EA0000] text-xs text-center" style={{ fontFamily: FONT.uiSemi }}>
                    {errorMsg}
                  </Text>
                </View>
              ) : null}

              {/* Google Sign In Button */}
              <Pressable
                onPress={handleGoogleSignIn}
                // @ts-ignore
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                style={{ cursor: 'pointer' }}
                className="flex-row items-center justify-center gap-3 rounded-xl border border-black/20 bg-surface py-3.5 px-4 shadow-xs transition-all hover:border-black/50 hover:shadow-sm active:scale-[0.98]">
                {signingIn ? (
                  <ActivityIndicator size="small" color="#0A0A0A" />
                ) : (
                  <>
                    <View className="h-5 w-5 items-center justify-center">
                      <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <Path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <Path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <Path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </Svg>
                    </View>
                    <Bn className="text-black font-semibold" style={{ fontFamily: FONT.uiBold, fontSize: 15.5 }}>
                      লগইন করুন
                    </Bn>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            /* --- Signed In State: Profile Overview --- */
            <View>
              {/* User Info Header */}
              <View className="mb-6 flex-row items-center gap-3.5 border-b border-black/10 pb-5 pr-12">
                <UserAvatar
                  url={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                  name={profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name}
                  size={52}
                />
                <View className="flex-1">
                  <Bn className="text-black font-bold" style={{ fontFamily: FONT.uiBold, fontSize: 18 }}>
                    {profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || 'বিসিএস পরীক্ষার্থী'}
                  </Bn>
                  <Text className="text-black/55 text-xs mt-0.5" style={{ fontFamily: FONT.ui }}>
                    {profile?.email || user.email}
                  </Text>
                </View>
              </View>

              {/* Sign Out Button */}
              <Pressable
                onPress={handleSignOut}
                // @ts-ignore
                onClick={handleSignOut}
                style={{ cursor: 'pointer' }}
                className="flex-row items-center justify-center gap-2 rounded-xl border border-[#EA0000]/20 bg-[#EA0000]/5 py-3.5 transition-all hover:bg-[#EA0000]/10 active:scale-[0.98]">
                <LogOut size={16} color="#EA0000" />
                <Text className="text-[#EA0000]" style={{ fontFamily: FONT.uiSemi, fontSize: 14 }}>
                  লগআউট করুন
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
