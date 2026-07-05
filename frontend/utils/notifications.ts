import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TASK_REMINDER_PREFIX = "task-reminder-";
const DAILY_SUMMARY_ID = "daily-summary";
const REMINDER_LEAD_MINUTES = 5;

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (e) {
    console.error("Notification permission request failed:", e);
    return false;
  }
}

interface TaskForReminder {
  id: string;
  name: string;
  start_time?: string;
  done: boolean;
}

function parseTimeToday(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export async function cancelTaskReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ids = scheduled
      .filter(n => n.identifier.startsWith(TASK_REMINDER_PREFIX))
      .map(n => n.identifier);
    await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  } catch (e) {
    console.error("Failed to cancel task reminders:", e);
  }
}

export async function scheduleTaskReminders(tasks: TaskForReminder[]) {
  try {
    await cancelTaskReminders();
    const now = new Date();

    for (const task of tasks) {
      if (task.done || !task.start_time) continue;
      const startDate = parseTimeToday(task.start_time);
      const reminderDate = new Date(startDate.getTime() - REMINDER_LEAD_MINUTES * 60 * 1000);
      if (reminderDate <= now) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: `${TASK_REMINDER_PREFIX}${task.id}`,
        content: {
          title: "Coming up",
          body: `${task.name} starts in ${REMINDER_LEAD_MINUTES} minutes`,
        },
        trigger: reminderDate,
      });
    }
  } catch (e) {
    console.error("Failed to schedule task reminders:", e);
  }
}

export async function scheduleDailySummary() {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_SUMMARY_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_SUMMARY_ID,
      content: {
        title: "Daily summary",
        body: "See how your day went in Momentum.",
      },
      trigger: { hour: 21, minute: 0, repeats: true },
    });
  } catch (e) {
    console.error("Failed to schedule daily summary:", e);
  }
}

export async function cancelDailySummary() {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_SUMMARY_ID);
  } catch (e) {
    console.error("Failed to cancel daily summary:", e);
  }
}