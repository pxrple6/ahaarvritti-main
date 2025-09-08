import React, { createContext, useContext, useState, useEffect } from 'react';
import { firestore } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const NOTIFICATION_TYPES = {
    DONATION_REQUEST: 'donation_request',
    REQUEST_ACCEPTED: 'request_accepted',
    REQUEST_REJECTED: 'request_rejected',
    DONATION_EXPIRING: 'donation_expiring',
    DONATION_EXPIRED: 'donation_expired',
    PICKUP_SCHEDULED: 'pickup_scheduled',
    DELIVERY_COMPLETED: 'delivery_completed',
    SYSTEM_MESSAGE: 'system_message',
    RATING_RECEIVED: 'rating_received'
  };

  const createNotification = async (notificationData) => {
    try {
      const notification = {
        ...notificationData,
        createdAt: serverTimestamp(),
        isRead: false,
        readAt: null
      };

      await addDoc(collection(firestore, 'notifications'), notification);
    } catch (error) {
      console.error('Create notification error:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(firestore, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(firestore, 'notifications', notification.id), {
          isRead: true,
          readAt: serverTimestamp()
        })
      );
      
      await Promise.all(updatePromises);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Mark all as read error:', error);
      toast.error('Error marking notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(firestore, 'notifications', notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Delete notification error:', error);
      toast.error('Error deleting notification');
    }
  };

  const sendDonationRequestNotification = async (donorId, requesterName, donationType) => {
    await createNotification({
      userId: donorId,
      type: NOTIFICATION_TYPES.DONATION_REQUEST,
      title: 'New Donation Request',
      message: `${requesterName} has requested your ${donationType} donation`,
      data: {
        requesterName,
        donationType
      }
    });
  };

  const sendRequestStatusNotification = async (requesterId, donorName, status, donationType) => {
    const type = status === 'accepted' 
      ? NOTIFICATION_TYPES.REQUEST_ACCEPTED 
      : NOTIFICATION_TYPES.REQUEST_REJECTED;
    
    const title = status === 'accepted' 
      ? 'Request Accepted' 
      : 'Request Rejected';
    
    const message = status === 'accepted'
      ? `${donorName} has accepted your request for ${donationType}`
      : `${donorName} has rejected your request for ${donationType}`;

    await createNotification({
      userId: requesterId,
      type,
      title,
      message,
      data: {
        donorName,
        donationType,
        status
      }
    });
  };

  const sendExpiringDonationNotification = async (donorId, donationType, hoursLeft) => {
    await createNotification({
      userId: donorId,
      type: NOTIFICATION_TYPES.DONATION_EXPIRING,
      title: 'Donation Expiring Soon',
      message: `Your ${donationType} donation will expire in ${hoursLeft} hours`,
      data: {
        donationType,
        hoursLeft
      }
    });
  };

  const sendPickupScheduledNotification = async (userId, pickupTime, location) => {
    await createNotification({
      userId,
      type: NOTIFICATION_TYPES.PICKUP_SCHEDULED,
      title: 'Pickup Scheduled',
      message: `Food pickup scheduled for ${pickupTime} at ${location}`,
      data: {
        pickupTime,
        location
      }
    });
  };

  const sendDeliveryCompletedNotification = async (donorId, requesterName) => {
    await createNotification({
      userId: donorId,
      type: NOTIFICATION_TYPES.DELIVERY_COMPLETED,
      title: 'Delivery Completed',
      message: `Food delivery to ${requesterName} has been completed successfully`,
      data: {
        requesterName
      }
    });
  };

  const sendRatingNotification = async (userId, raterName, rating) => {
    await createNotification({
      userId,
      type: NOTIFICATION_TYPES.RATING_RECEIVED,
      title: 'New Rating Received',
      message: `${raterName} has given you a ${rating}-star rating`,
      data: {
        raterName,
        rating
      }
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.DONATION_REQUEST:
        return '🍽️';
      case NOTIFICATION_TYPES.REQUEST_ACCEPTED:
        return '✅';
      case NOTIFICATION_TYPES.REQUEST_REJECTED:
        return '❌';
      case NOTIFICATION_TYPES.DONATION_EXPIRING:
        return '⏰';
      case NOTIFICATION_TYPES.DONATION_EXPIRED:
        return '🚫';
      case NOTIFICATION_TYPES.PICKUP_SCHEDULED:
        return '🚚';
      case NOTIFICATION_TYPES.DELIVERY_COMPLETED:
        return '🎉';
      case NOTIFICATION_TYPES.SYSTEM_MESSAGE:
        return 'ℹ️';
      case NOTIFICATION_TYPES.RATING_RECEIVED:
        return '⭐';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.DONATION_REQUEST:
        return 'blue';
      case NOTIFICATION_TYPES.REQUEST_ACCEPTED:
        return 'green';
      case NOTIFICATION_TYPES.REQUEST_REJECTED:
        return 'red';
      case NOTIFICATION_TYPES.DONATION_EXPIRING:
        return 'yellow';
      case NOTIFICATION_TYPES.DONATION_EXPIRED:
        return 'red';
      case NOTIFICATION_TYPES.PICKUP_SCHEDULED:
        return 'purple';
      case NOTIFICATION_TYPES.DELIVERY_COMPLETED:
        return 'green';
      case NOTIFICATION_TYPES.SYSTEM_MESSAGE:
        return 'gray';
      case NOTIFICATION_TYPES.RATING_RECEIVED:
        return 'orange';
      default:
        return 'gray';
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(firestore, 'notifications'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snapshot) => {
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter(n => !n.isRead).length);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const value = {
    notifications,
    unreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendDonationRequestNotification,
    sendRequestStatusNotification,
    sendExpiringDonationNotification,
    sendPickupScheduledNotification,
    sendDeliveryCompletedNotification,
    sendRatingNotification,
    getNotificationIcon,
    getNotificationColor,
    NOTIFICATION_TYPES
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 