import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { Reminder } from '@domain/entities/Reminder';
import { toast } from '@app/store/toastStore';

export function useReminderNotifications() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialized = useRef(false);

  // Function to play notification sound using alarm.wav
  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/alarm.wav');
        audioRef.current.volume = 0.5; // Set volume to 50%
      }
      
      // Reset audio to start and play
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.warn('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  };

  useEffect(() => {
    // Prevent double initialization
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Listen for reminder-triggered events from Rust
    const unlisten = listen<Reminder>('reminder-triggered', (event) => {
      const reminder = event.payload;
      
      console.log('🔔 Reminder notification received:', reminder);

      // Play notification sound
      playNotificationSound();

      // Show toast notification
      toast.info(
        '⏰ Reminder',
        `${reminder.title}${reminder.description ? ` - ${reminder.description}` : ''}`,
        10000 // 10 seconds
      );

      // You can also trigger browser notification API here if needed
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⏰ Task Reminder', {
          body: reminder.title,
          icon: '/icon.png',
        });
      }
    });

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
