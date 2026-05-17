/**
 * Patient Reminder Service — Sends notifications every 3 minutes if profile incomplete
 * Prevents spam by tracking last notification timestamp
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patientValidationService, type PatientProfile, type PatientProfileValidation } from './patientValidation.service';
import { patientService } from '../patient.service';

const REMINDER_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const LAST_NOTIFICATION_KEY = 'last_profile_reminder_timestamp';

class PatientReminderService {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the recurring reminder check
   * Should be called when app becomes active
   */
  async startReminders(): Promise<void> {
    this.stopReminders();

    await this.checkAndNotify();

    this.intervalId = setInterval(async () => {
      await this.checkAndNotify();
    }, REMINDER_INTERVAL_MS);
  }

  /**
   * Stop the recurring reminders
   */
  stopReminders(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check profile completeness and send notification if needed
   */
  private async checkAndNotify(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return;

      const profile = await patientService.getProfile(userId);
      if (!profile) return;

      const validation = patientValidationService.validatePatientProfile(profile as unknown as PatientProfile);

      if (validation.isComplete) {
        console.log('[PatientReminder] Profile is complete, skipping notification');
        return;
      }

      const lastSent = await this.getLastNotificationTimestamp();
      const now = Date.now();

      if (lastSent && now - lastSent < REMINDER_INTERVAL_MS) {
        console.log('[PatientReminder] Notification sent recently, skipping');
        return;
      }

      await this.sendReminderNotification(validation, userId);
      await this.setLastNotificationTimestamp(now);
    } catch (error) {
      console.error('[PatientReminder] Check failed:', error);
    }
  }

  /**
   * Send the reminder notification
   */
  private async sendReminderNotification(
    validation: PatientProfileValidation,
    userId: string
  ): Promise<void> {
    const missingCount = validation.missingFields.length;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Medical Profile Incomplete',
        body: `${missingCount} field${missingCount > 1 ? 's' : ''} missing — tap to complete now`,
        data: {
          screen: 'ProfileMain',
          userId,
          missingCount,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  }

  /**
   * Get the current authenticated user ID
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { useAuthStore } = await import('../../store/auth.store');
      const session = useAuthStore.getState().session;
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Get last notification timestamp from AsyncStorage
   */
  private async getLastNotificationTimestamp(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(LAST_NOTIFICATION_KEY);
      return value ? parseInt(value, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set last notification timestamp in AsyncStorage
   */
  private async setLastNotificationTimestamp(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, timestamp.toString());
    } catch {
      // Silent fail
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerManualCheck(): Promise<void> {
    await this.checkAndNotify();
  }

  /**
   * Reset notification history (for testing)
   */
  async resetNotificationHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LAST_NOTIFICATION_KEY);
    } catch {
      // Silent fail
    }
  }
}

export const patientReminderService = new PatientReminderService();