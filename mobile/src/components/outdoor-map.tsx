import { AppleMaps } from 'expo-maps';
import { useEffect, useMemo, useRef } from 'react';
import { Platform, View } from 'react-native';

import { OutdoorTrace } from '@/components/outdoor-summary';
import { GROUP_RADIUS, GroupTitle } from '@/components/grouped';
import { Spacing } from '@/constants/theme';
import type { OutdoorRoute } from '@/lib/outdoor';
import { useAppTheme } from '@/providers/theme';

// Apple Maps through expo-maps renders only on iOS 17+. Android (Google Maps needs an API key)
// and older iPhones keep the drawn trace.
const mapsAvailable = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 17;

const LIVE_ZOOM = 16.5;

export function OutdoorMap({ route, emptyMessage, live = false }: {
  route: OutdoorRoute;
  emptyMessage: string;
  /** Follows the latest GPS point and shows the user's location while recording. */
  live?: boolean;
}) {
  const points = route.flat();
  if (!mapsAvailable || !points.length) return <OutdoorTrace route={route} emptyMessage={emptyMessage} />;
  return <RouteMap route={route} live={live} />;
}

function RouteMap({ route, live }: { route: OutdoorRoute; live: boolean }) {
  const { colors, scheme } = useAppTheme();
  const map = useRef<AppleMaps.MapView>(null);
  const segments = route.filter((segment) => segment.length > 0);
  const first = segments[0][0];
  const last = segments.at(-1)!.at(-1)!;
  const fitted = useMemo(() => fitRoute(route), [route]);

  useEffect(() => {
    if (!live) return;
    void map.current?.setCameraPosition({ coordinates: { latitude: last[0], longitude: last[1] }, zoom: LIVE_ZOOM });
  }, [live, last[0], last[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const polylines = segments.filter((segment) => segment.length > 1).map((segment, index) => ({
    id: `segment-${index}`,
    coordinates: segment.map(([latitude, longitude]) => ({ latitude, longitude })),
    color: colors.voltInk,
    width: 5,
  }));
  const markers: AppleMaps.Marker[] = [
    { id: 'start', title: 'Início', systemImage: 'flag.fill', tintColor: colors.voltInk,
      coordinates: { latitude: first[0], longitude: first[1] } },
  ];
  if (!live && (first[0] !== last[0] || first[1] !== last[1])) markers.push({
    id: 'finish', title: 'Fim', systemImage: 'flag.checkered', tintColor: colors.ink,
    coordinates: { latitude: last[0], longitude: last[1] },
  });

  return (
    <View style={{ gap: Spacing.three }}>
      <GroupTitle title="Trajeto GPS" />
      <View
        accessible
        accessibilityLabel="Mapa com o trajeto registrado por GPS"
        style={{ height: live ? 240 : 280, borderRadius: GROUP_RADIUS, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.surfaceSunken }}>
        <AppleMaps.View
          ref={map}
          style={{ flex: 1 }}
          cameraPosition={live
            ? { coordinates: { latitude: last[0], longitude: last[1] }, zoom: LIVE_ZOOM }
            : fitted}
          colorScheme={scheme === 'dark' ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
          polylines={polylines}
          markers={markers}
          properties={{
            isMyLocationEnabled: live,
            pointsOfInterest: { including: [] },
          }}
          uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, scaleBarEnabled: false, togglePitchEnabled: false }}
        />
      </View>
    </View>
  );
}

/** Center and zoom that frame the whole route. expo-maps turns zoom into a square span of 360 / 2^zoom degrees. */
function fitRoute(route: OutdoorRoute) {
  const points = route.flat();
  const latitudes = points.map(([latitude]) => latitude);
  const longitudes = points.map(([, longitude]) => longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const span = Math.max(0.003, (maxLat - minLat) * 1.5, (maxLon - minLon) * 1.5);
  return {
    coordinates: { latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2 },
    zoom: Math.min(17, Math.max(3, Math.log2(360 / span))),
  };
}
