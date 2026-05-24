const cron = require('node-cron');
const prisma = require('../config/database');
const { sendPushNotification } = require('./notification.service');

const startReminderCron = () => {
  // Every minute: check for due task reminders
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      const dueTasks = await prisma.todo.findMany({
        where: {
          reminderAt: { gte: oneMinuteAgo, lte: now },
          isCompleted: false,
          reminderSent: false,
        },
        include: { user: true },
      });

      for (const task of dueTasks) {
        await sendPushNotification(
          task.user.fcmToken,
          '⏰ Reminder',
          `Time to: ${task.title}`,
          { taskId: task.id, type: 'reminder' }
        );
        await prisma.todo.update({
          where: { id: task.id },
          data: { reminderSent: true },
        });
      }

      if (dueTasks.length > 0) {
        console.log(`[CRON] Sent ${dueTasks.length} reminder(s)`);
      }
    } catch (e) {
      console.error('[CRON ERROR]', e.message);
    }
  });

  // Every day at 9 PM: diary nudge
  cron.schedule('0 21 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find users who haven't written a diary entry today
      const usersWithEntry = await prisma.diaryEntry.findMany({
        where: { entryDate: today },
        select: { userId: true },
      });
      const usersWithEntryIds = usersWithEntry.map((e) => e.userId);

      const usersWithoutEntry = await prisma.user.findMany({
        where: {
          fcmToken: { not: null },
          id: { notIn: usersWithEntryIds },
        },
      });

      for (const user of usersWithoutEntry) {
        await sendPushNotification(
          user.fcmToken,
          '📔 Daily Check-in',
          "How was your day? Don't forget to write in your diary.",
          { type: 'diary_nudge' }
        );
      }

      console.log(`[CRON] Diary nudge sent to ${usersWithoutEntry.length} user(s)`);
    } catch (e) {
      console.error('[CRON DIARY NUDGE ERROR]', e.message);
    }
  });

  // Every day at 8 AM: planned workout reminder
  cron.schedule('0 8 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const plannedWorkouts = await prisma.workout.findMany({
        where: { workoutDate: today, status: 'planned' },
        include: { user: true },
      });

      for (const workout of plannedWorkouts) {
        if (workout.user.fcmToken) {
          await sendPushNotification(
            workout.user.fcmToken,
            '💪 Workout Reminder',
            `Your "${workout.name}" is planned for today. Let's go!`,
            { workoutId: workout.id, type: 'workout_reminder' }
          );
        }
      }

      console.log(`[CRON] Workout reminders sent to ${plannedWorkouts.length} user(s)`);
    } catch (e) {
      console.error('[CRON WORKOUT REMINDER ERROR]', e.message);
    }
  });

  console.log('[CRON] Reminder scheduler started');
};

module.exports = { startReminderCron };
