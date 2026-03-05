import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Notification } from '../types';
import { X, CheckCircle, XCircle } from 'lucide-react';

const NotificationBanner: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      // Clean up previous snapshot listener
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        // Load unread notifications
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('read', '==', false)
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const unreadNotifications: Notification[] = [];
          snapshot.forEach((docSnap) => {
            unreadNotifications.push({
              id: docSnap.id,
              ...docSnap.data(),
            } as Notification);
          });

          // Sort by creation date (newest first)
          unreadNotifications.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          setNotifications(unreadNotifications);
          setShowNotifications(unreadNotifications.length > 0);
        });
      } else {
        setNotifications([]);
        setShowNotifications(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const closeNotification = async (notificationId: string) => {
    await markAsRead(notificationId);
    const remaining = notifications.filter(n => n.id !== notificationId);
    setNotifications(remaining);
    setShowNotifications(remaining.length > 0);
  };

  if (!showNotifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`mb-3 p-4 rounded-lg flex items-start gap-4 ${
              notification.type === 'project_deleted'
                ? 'bg-green-900 border border-green-700'
                : 'bg-red-900 border border-red-700'
            }`}
          >
            <div className="flex-shrink-0 mt-1">
              {notification.type === 'project_deleted' ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">{notification.title}</h3>
              <p className="text-sm">{notification.message}</p>
            </div>
            <button
              onClick={() => closeNotification(notification.id)}
              className="flex-shrink-0 text-white hover:text-gray-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationBanner;
