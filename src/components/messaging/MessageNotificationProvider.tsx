import { ReactNode } from 'react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

interface MessageNotificationProviderProps {
  children: ReactNode;
}

export const MessageNotificationProvider = ({ children }: MessageNotificationProviderProps) => {
  useMessageNotifications();
  return <>{children}</>;
};
