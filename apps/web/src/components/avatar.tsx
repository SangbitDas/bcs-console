import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { FONT } from '../lib/fonts';

export function UserAvatar({
  url,
  name,
  size = 24,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name?.[0] ?? 'U').toUpperCase();

  if (url && !failed) {
    return (
      <img
        src={url}
        referrerPolicy="no-referrer"
        alt={name ?? 'User'}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center bg-ink"
      style={{ width: size, height: size, borderRadius: size / 2 }}>
      <Text
        className="text-white font-bold"
        style={{ fontFamily: FONT.uiBold, fontSize: Math.max(10, Math.floor(size * 0.42)) }}>
        {initial}
      </Text>
    </View>
  );
}
