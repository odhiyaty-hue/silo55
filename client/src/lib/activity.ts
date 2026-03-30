import { db } from "./firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Notification, ActivityLog } from "@shared/schema";

/**
 * إضافة إشعار جديد لمستخدم معين
 */
export async function addNotification(notification: Omit<Notification, "id" | "createdAt">) {
  try {
    console.log("📝 Adding notification for user:", notification.userId, notification.title);
    const notificationsRef = collection(db, "notifications");
    const docRef = await addDoc(notificationsRef, {
      ...notification,
      isRead: false,
      createdAt: Date.now(),
    });
    console.log("✅ Notification added with ID:", docRef.id);
  } catch (error) {
    console.error("Error adding notification:", error);
  }
}

/**
 * إضافة سجل نشاط جديد (للإدارة)
 */
export async function addActivityLog(log: Omit<ActivityLog, "id" | "createdAt">) {
  try {
    console.log("📝 Adding activity log:", log.action);
    const logsRef = collection(db, "activityLogs");
    const docRef = await addDoc(logsRef, {
      ...log,
      createdAt: Date.now(),
    });
    console.log("✅ Activity log added with ID:", docRef.id);
  } catch (error) {
    console.error("Error adding activity log:", error);
  }
}

/**
 * تعليم الإشعار كـ "مقروء"
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

/**
 * تعليم كافة إشعارات المستخدم كـ "مقروءة"
 */
export async function markAllNotificationsAsRead(userId: string, notificationIds: string[]) {
  try {
    const promises = notificationIds.map(id => markNotificationAsRead(id));
    await Promise.all(promises);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}
