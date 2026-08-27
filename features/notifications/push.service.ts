import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Push] Las notificaciones push requieren un dispositivo físico');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permiso de notificaciones denegado');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Kontrolia',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  await api.post('/notifications/register-token', { token });
  return token;
}

export async function fetchNotificationReport(): Promise<{ overdue: number; pending: number }> {
  const response = await api.get<{ overdue: number; pending: number }>('/notifications/report');
  return response.data;
}

export function addNotificationResponseListener(
  handler: (data: { entityId?: string; entityType?: string }) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as {
      entityId?: string;
      entityType?: string;
    };
    handler(data);
  });
}
