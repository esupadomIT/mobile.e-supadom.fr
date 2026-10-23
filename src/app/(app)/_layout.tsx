import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { useColors } from '@/theme';
import type { Message } from '@/types';

/** Zone connectée : protège les écrans et branche le temps réel. */
export default function AppLayout() {
  const { token, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const c = useColors();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const onMessage = (message: Message) => {
      queryClient.setQueryData<Message[]>(['messages', message.conversationId], (old) =>
        old && !old.some((m) => m.id === message.id) ? [...old, message] : old,
      );
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on('message:new', onMessage);
    return () => {
      socket.off('message:new', onMessage);
    };
  }, [token, queryClient]);

  if (isLoading) return null;
  if (!token) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        contentStyle: { backgroundColor: c.bg },
      }}
    />
  );
}
