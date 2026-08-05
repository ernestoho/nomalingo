/**
 * Native map. Platform-split via the .native/.web filename convention rather
 * than a runtime Platform check, because react-native-maps has no web build at
 * all — a runtime check still pulls it into the web bundle and breaks it.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { color, radius } from '../theme/tokens';

export type MapCardProps = {
  lat: number;
  lng: number;
  label: string;
  height?: number;
};

export default function MapCard({ lat, lng, label, height = 170 }: MapCardProps) {
  return (
    <View
      style={{
        height,
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: color.border,
      }}
    >
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        pointerEvents="none"
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} title={label} />
      </MapView>
    </View>
  );
}
