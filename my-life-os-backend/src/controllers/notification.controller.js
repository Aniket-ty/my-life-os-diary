const prisma = require('../config/database');

/**
 * Get all in-app notifications for current user with unread count
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [notifications, unreadCount] = await Promise.all([
      prisma.inAppNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.inAppNotification.count({
        where: { userId, isRead: false },
      }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.inAppNotification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.inAppNotification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read for current user
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await prisma.inAppNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};
