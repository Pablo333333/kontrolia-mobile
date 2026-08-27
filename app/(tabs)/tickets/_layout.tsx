import { Stack } from 'expo-router';

export default function TicketsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Seguimiento de comunicación' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del mensaje' }} />
    </Stack>
  );
}
