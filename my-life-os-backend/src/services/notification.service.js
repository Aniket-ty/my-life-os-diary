let admin;
try {
  admin = require('../config/firebase');
} catch {
  admin = null;
}

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!admin || !fcmToken) {
    console.log(`[NOTIFICATION SKIPPED] ${title}: ${body}`);
    return;
  }

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      android: { notification: { sound: 'default' } },
    });
    console.log(`[NOTIFICATION SENT] ${title} → ${fcmToken.substring(0, 20)}...`);
  } catch (e) {
    console.error('[NOTIFICATION ERROR]', e.message);
  }
};

module.exports = { sendPushNotification };
