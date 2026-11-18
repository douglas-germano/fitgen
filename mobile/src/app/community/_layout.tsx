import { Stack } from 'expo-router';
export default function CommunityLayout() { return <Stack screenOptions={{ headerShown: false }}>
  {['create-group', 'create-challenge', 'post', 'join/index'].map(name => <Stack.Screen key={name} name={name} options={{ presentation: 'modal' }} />)}
</Stack>; }
