import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Pressable, ScrollView, Text, View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react-native';
import { FONT } from '../lib/fonts';

export interface ImageLightboxModalProps {
  uri: string | null;
  onClose: () => void;
  title?: string;
}

/**
 * In-app Full Screen Lightbox Modal
 *
 * Displays the image full-screen in an overlay modal without navigating
 * to another page or opening a new browser tab.
 */
export function ImageLightboxModal({
  uri,
  onClose,
  title = 'ব্যাখ্যার ছবি',
}: ImageLightboxModalProps) {
  const [scale, setScale] = useState(1);

  // Reset scale when image changes or closes
  useEffect(() => {
    setScale(1);
  }, [uri]);

  // Keyboard shortcut: Esc to close, +/- to zoom
  useEffect(() => {
    if (!uri || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)));
      } else if (e.key === '-' || e.key === '_') {
        setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));
      } else if (e.key === '0') {
        setScale(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uri, onClose]);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
  }, []);

  if (!uri) return null;

  return (
    <Modal
      visible={!!uri}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View
        className="flex-1 justify-between bg-black/95"
        style={{
          // @ts-ignore
          backdropFilter: 'blur(8px)',
        }}>
        {/* Backdrop click to close */}
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            cursor: 'default',
          } as any}
          onPress={onClose}
          // @ts-ignore
          onClick={onClose}
        />

        {/* Top Floating Action Bar */}
        <View
          style={{ zIndex: 100 }}
          className="w-full flex-row items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3 sm:px-6">
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-[#EA0000]" />
            <Text
              className="text-white font-semibold"
              style={{ fontFamily: FONT.uiBold, fontSize: 14 }}>
              {title}
            </Text>
            <Text
              className="hidden text-white/50 sm:inline"
              style={{ fontFamily: FONT.ui, fontSize: 12 }}>
              · ফুল স্ক্রিন ভিউয়ার
            </Text>
          </View>

          {/* Controls: Zoom In, Zoom Out, Reset, Close */}
          <View className="flex-row items-center gap-2">
            {/* Zoom Out */}
            <Pressable
              onPress={handleZoomOut}
              accessibilityLabel="ছোট করুন"
              style={{
                // @ts-ignore
                cursor: 'pointer',
              }}
              className="h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 active:scale-95">
              <ZoomOut size={16} color="#FFFFFF" />
            </Pressable>

            {/* Current Zoom & Reset */}
            <Pressable
              onPress={handleResetZoom}
              accessibilityLabel="আসল আকার"
              style={{
                // @ts-ignore
                cursor: 'pointer',
              }}
              className="h-8 min-w-[54px] flex-row items-center justify-center gap-1 rounded-lg bg-white/10 px-2 hover:bg-white/20 active:scale-95">
              <RotateCcw size={12} color="#FFFFFF" />
              <Text
                className="text-white text-xs font-mono"
                style={{ fontFamily: FONT.uiSemi }}>
                {Math.round(scale * 100)}%
              </Text>
            </Pressable>

            {/* Zoom In */}
            <Pressable
              onPress={handleZoomIn}
              accessibilityLabel="বড় করুন"
              style={{
                // @ts-ignore
                cursor: 'pointer',
              }}
              className="h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 active:scale-95">
              <ZoomIn size={16} color="#FFFFFF" />
            </Pressable>

            {/* Close Button */}
            <Pressable
              onPress={onClose}
              // @ts-ignore
              onClick={onClose}
              accessibilityRole="button"
              accessibilityLabel="বন্ধ করুন"
              style={{
                // @ts-ignore
                cursor: 'pointer',
              }}
              className="ml-2 h-8 flex-row items-center gap-1.5 rounded-lg bg-rose-600/80 px-3 hover:bg-rose-600 active:scale-95">
              <X size={16} color="#FFFFFF" />
              <Text
                className="text-white text-xs font-semibold"
                style={{ fontFamily: FONT.uiBold }}>
                বন্ধ করুন
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Center Viewport Container with Image */}
        <ScrollView
          style={{ flex: 1, zIndex: 10 }}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          maximumZoomScale={3}
          minimumZoomScale={0.5}
          showsHorizontalScrollIndicator={true}
          showsVerticalScrollIndicator={true}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
            }}
            style={{
              transform: [{ scale }],
              transition: 'transform 0.15s ease-out',
              maxWidth: '96vw',
              maxHeight: '82vh',
            } as any}>
            <Image
              source={{ uri }}
              style={{
                width: scale > 1 ? 800 * scale : 800,
                height: scale > 1 ? 550 * scale : 550,
                maxWidth: '92vw' as any,
                maxHeight: '80vh' as any,
              }}
              contentFit="contain"
            />
          </Pressable>
        </ScrollView>

        {/* Bottom Hint */}
        <View
          style={{ zIndex: 100 }}
          className="w-full items-center border-t border-white/10 bg-black/60 py-2">
          <Text
            className="text-white/60 text-xs"
            style={{ fontFamily: FONT.ui }}>
            {Platform.OS === 'web'
              ? 'কীবোর্ডে [Esc] চাপুন বা বন্ধ করুন বোতামে ক্লিক করুন'
              : 'বন্ধ করতে বাইরে স্পর্শ করুন'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export interface ExplanationImageProps {
  uri: string;
  title?: string;
  height?: number;
  className?: string;
}

/**
 * Explanation Image Component
 *
 * Renders an inline explanation image with a dedicated "ফুল স্ক্রিনে দেখুন" (Full Screen)
 * button on top. Clicking either the button or the image itself opens the in-app
 * lightbox without opening a new tab or page.
 */
export function ExplanationImage({
  uri,
  title = 'ব্যাখ্যার ছবি',
  height = 260,
  className = '',
}: ExplanationImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBtnHovered, setIsBtnHovered] = useState(false);

  const handleOpen = useCallback((e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <View
        className={`group relative mt-3 overflow-hidden rounded-xl border border-black/10 bg-neutral-50/60 shadow-xs transition-all hover:border-black/30 hover:shadow-sm ${className}`}>
        {/* Top Control Bar with Full Screen Option */}
        <View className="flex-row items-center justify-between border-b border-black/5 bg-black/[0.02] px-3 py-1.5">
          <View className="flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-black/40" />
            <Text
              className="text-black/60 text-xs font-medium"
              style={{ fontFamily: FONT.uiSemi }}>
              {title}
            </Text>
          </View>

          {/* Fullscreen Button on Top of Image */}
          <Pressable
            onPress={handleOpen}
            // @ts-ignore
            onClick={handleOpen}
            onHoverIn={() => setIsBtnHovered(true)}
            onHoverOut={() => setIsBtnHovered(false)}
            // @ts-ignore
            onMouseEnter={() => setIsBtnHovered(true)}
            // @ts-ignore
            onMouseLeave={() => setIsBtnHovered(false)}
            onFocus={() => setIsBtnHovered(true)}
            onBlur={() => setIsBtnHovered(false)}
            accessibilityRole="button"
            accessibilityLabel="ফুল স্ক্রিনে দেখুন"
            style={{
              cursor: 'pointer',
              backgroundColor: isBtnHovered ? '#0A0A0A' : '#FFFFFF',
              borderColor: isBtnHovered ? '#0A0A0A' : 'rgba(0, 0, 0, 0.15)',
              transition: 'all 0.15s ease-in-out',
            } as any}
            className="flex-row items-center gap-1.5 rounded-md border px-2.5 py-1 shadow-2xs active:scale-95">
            <Maximize2 size={12} color={isBtnHovered ? '#FFFFFF' : '#0A0A0A'} />
            <Text
              style={{
                fontFamily: FONT.uiBold,
                fontSize: 11.5,
                color: isBtnHovered ? '#FFFFFF' : '#0A0A0A',
                transition: 'color 0.15s ease-in-out',
              } as any}>
              ফুল স্ক্রিনে দেখুন
            </Text>
          </Pressable>
        </View>

        {/* Clickable Image Preview */}
        <Pressable
          onPress={handleOpen}
          // @ts-ignore
          onClick={handleOpen}
          style={{
            cursor: 'zoom-in',
          } as any}
          className="items-center justify-center p-3">
          <Image
            source={{ uri }}
            style={{ width: '100%', height }}
            contentFit="contain"
          />
        </Pressable>
      </View>

      {/* In-app Full Screen Modal */}
      <ImageLightboxModal
        uri={isOpen ? uri : null}
        onClose={handleClose}
        title={title}
      />
    </>
  );
}
