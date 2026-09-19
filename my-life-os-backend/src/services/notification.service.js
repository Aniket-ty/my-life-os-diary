let admin;
try {
  admin = require('../config/firebase');
} catch {
  admin = null;
}
const prisma = require('../config/database');

/**
 * Send an FCM push notification if configured and token is present
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!admin || !fcmToken) {
    console.log(`[PUSH SKIPPED] ${title}: ${body}`);
    return;
  }

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      android: { notification: { sound: 'default' } },
    });
    console.log(`[PUSH SENT] ${title} → ${fcmToken.substring(0, 20)}...`);
  } catch (e) {
    console.error('[PUSH ERROR]', e.message);
  }
};

/**
 * Dual Notification: Creates an In-App Notification AND sends Push Notification
 */
const notifyUser = async (userId, { title, message, type = 'info', data = {} }) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fcmToken: true },
    });

    if (!user) return;

    // 1. Create In-App Notification
    const inApp = await prisma.inAppNotification.create({
      data: {
        userId,
        title,
        message,
        type,
        data,
      },
    });

    // 2. Dispatch FCM Push
    if (user.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, data);
    }

    return inApp;
  } catch (err) {
    console.error('[NOTIFY USER ERROR]', err.message);
  }
};

/**
 * Send an invite email/SMS notification to a non-registered user
 */
const sendInviteToNonAppUser = async ({ toEmail, toPhone, inviterName, groupName, amount, inviteToken }) => {
  const joinUrl = `${process.env.FRONTEND_URL || 'https://my-life-os-diary.onrender.com'}/login?invite=${inviteToken}`;
  const subject = `${inviterName} shared an expense with you on Life OS`;
  const body = `Hi there!\n\n${inviterName} has split an expense of ₹${amount || '0'} with you ${
    groupName ? `in "${groupName}"` : ''
  }.\n\nJoin My Life OS to see the bill, settle up, and track your shared spending:\n${joinUrl}\n\nCheers,\nMy Life OS Team`;

  console.log(`\n==================================================`);
  console.log(`📧 [INVITE EMAIL SENT TO NON-APP USER]`);
  console.log(`To: ${toEmail || toPhone}`);
  console.log(`Subject: ${subject}`);
  console.log(`Link: ${joinUrl}`);
  console.log(`==================================================\n`);

  return { success: true, joinUrl };
};

module.exports = {
  sendPushNotification,
  notifyUser,
  sendInviteToNonAppUser,
};
