import React, { useState, useEffect } from 'react';
// charts removed from Dashboard; keep only in Analytics
import { useTranslation } from 'react-i18next';

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDonation } from '../../contexts/DonationContext';
import { useNotification } from '../../contexts/NotificationContext';
import CO2Calculator from '../../components/CO2Calculator';
import { 
  PlusIcon, 
  HeartIcon, 
  LocationMarkerIcon, 
  ChartBarIcon,
  BellIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationIcon
} from '@heroicons/react/outline';

// No chart registration needed on Dashboard

const DashboardPage = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const { donations, requests, deliveries, collections, DONATION_STATUS, REQUEST_STATUS, getUserStats } = useDonation();
  const { notifications, unreadCount } = useNotification();
  const [recentActivity, setRecentActivity] = useState([]);
  const [userStats, setUserStats] = useState(null);

  // Fallback CO2 calculator to match Analytics behavior when donation.co2Saved is absent
  const calculateCO2SavedLocal = (donation) => {
    if (!donation || donation.quantity == null || !donation.unit) return 0;
    const quantity = Number(donation.quantity) || 0;
    if (donation.unit === 'meals') return quantity * 1.3;
    if ([ 'kg', 'liters', 'packs' ].includes(donation.unit)) return quantity * 2.5;
    return 0;
  };

  const getStats = () => {
    const totalDonations = donations.length;
    const completedDonations = donations.filter(d => d.status === DONATION_STATUS.COMPLETED).length;
    const pendingDonations = donations.filter(d => d.status === DONATION_STATUS.PENDING).length;
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === REQUEST_STATUS.PENDING).length;
    const acceptedRequests = requests.filter(r => r.status === REQUEST_STATUS.ACCEPTED).length;
    const fulfilledRequests = requests.filter(r => r.status === REQUEST_STATUS.FULFILLED).length;
    // Match Analytics: sum CO2 from completed donations (stored on each donation)
    const completedDonationItems = donations.filter(d => d.status === DONATION_STATUS.COMPLETED);
    const co2Saved = Math.round(
      completedDonationItems.reduce((sum, d) => sum + (Number(d.co2Saved) || calculateCO2SavedLocal(d) || 0), 0)
    );

  if (userProfile?.role === 'restaurant' || userProfile?.role === 'individual' || userProfile?.role === 'mess') {
      return [
        { name: 'Meals Donated', value: userStats?.donationsMade ?? completedDonations, icon: HeartIcon, color: 'green' },
        { name: 'CO₂ Saved (kg)', value: userStats?.co2Saved ?? co2Saved, icon: ChartBarIcon, color: 'blue' },
        { name: 'Requests Fulfilled', value: fulfilledRequests, icon: CheckCircleIcon, color: 'purple' },
        { name: 'Pending Donations', value: pendingDonations, icon: ClockIcon, color: 'yellow' }
      ];
    } else if (userProfile?.role === 'foodbank' || userProfile?.role === 'nursery' || userProfile?.role === 'poultry') {
      const receiverDeliveries = Array.isArray(deliveries) ? deliveries : [];
      const deliveriesReceived = userStats?.deliveriesReceived ?? receiverDeliveries.length;
      const receiverCo2 = userStats?.receiverCo2 ?? Math.round(receiverDeliveries.reduce((sum, r) => sum + (Number(r.co2Saved) || 0), 0));
      const inProgress = receiverDeliveries.filter(r => (r.status || '').toLowerCase() !== REQUEST_STATUS.FULFILLED).length;
      return [
        { name: 'Deliveries Received', value: deliveriesReceived, icon: CheckCircleIcon, color: 'green' },
        { name: 'CO₂ Saved (kg)', value: receiverCo2, icon: ChartBarIcon, color: 'blue' },
        { name: 'Pending Deliveries', value: inProgress, icon: ClockIcon, color: 'yellow' },
        { name: 'Unread Notifications', value: unreadCount, icon: ExclamationIcon, color: 'red' }
      ];
    } else if (userProfile?.role === 'volunteer') {
      const volunteerCollections = Array.isArray(collections) ? collections : [];
      const deliveriesCompleted = userStats?.deliveriesCompleted ?? volunteerCollections.length;
      const co2Volunteer = userStats?.volunteerCo2 ?? Math.round(volunteerCollections.reduce((sum, c) => sum + (Number(c.co2Saved) || 0), 0));
      return [
        { name: 'Open Food Requests', value: requests.filter(r => r.status === REQUEST_STATUS.PENDING).length, icon: BellIcon, color: 'purple' },
        { name: 'Deliveries Completed', value: deliveriesCompleted, icon: CheckCircleIcon, color: 'green' },
        { name: 'CO₂ Saved (kg)', value: co2Volunteer, icon: ChartBarIcon, color: 'blue' },
        { name: 'Unread Notifications', value: unreadCount, icon: ExclamationIcon, color: 'red' }
      ];
    } else {
      return [
        { name: 'Meals Donated', value: completedDonations, icon: HeartIcon, color: 'green' },
        { name: 'CO₂ Saved (kg)', value: co2Saved, icon: ChartBarIcon, color: 'blue' },
        { name: 'Requests Fulfilled', value: fulfilledRequests, icon: CheckCircleIcon, color: 'purple' },
        { name: 'Unread Notifications', value: unreadCount, icon: ExclamationIcon, color: 'red' }
      ];
    }
  };

  // Time-series and chart computation removed from Dashboard

  const getQuickActions = () => {
    if (userProfile?.role === 'restaurant' || userProfile?.role === 'individual') {
      return [
        { key: 'createDonation', href: '/donations', icon: PlusIcon, color: 'green' },
        { key: 'viewRequests', href: '/requests', icon: BellIcon, color: 'blue' },
        { key: 'viewAnalytics', href: '/analytics', icon: ChartBarIcon, color: 'orange' }
      ];
    } else if (userProfile?.role === 'foodbank') {
      return [
        { key: 'createRequest', href: '/requests', icon: PlusIcon, color: 'green' },
        { key: 'browseDonations', href: '/donations', icon: HeartIcon, color: 'blue' },
        { key: 'viewAnalytics', href: '/analytics', icon: ChartBarIcon, color: 'orange' }
      ];
    } else {
      return [
        { key: 'createDonation', href: '/donations', icon: PlusIcon, color: 'green' },
        { key: 'createRequest', href: '/requests', icon: BellIcon, color: 'blue' },
        { key: 'chatbotHelp', href: '/chatbot', icon: ChartBarIcon, color: 'orange' }
      ];
    }
  };

  const statKeyFromName = (name) => {
    switch (name) {
      case 'Meals Donated':
        return 'dashboard.stat.mealsDonated';
      case 'CO₂ Saved (kg)':
        return 'dashboard.stat.co2Saved';
      case 'Requests Fulfilled':
        return 'dashboard.stat.requestsFulfilled';
      case 'Deliveries Completed':
        return 'dashboard.stat.deliveriesCompleted';
      case 'Pending Donations':
        return 'dashboard.stat.pendingDonations';
      case 'Total Requests':
        return 'dashboard.stat.totalRequests';
      case 'Pending Requests':
        return 'dashboard.stat.pendingRequests';
      case 'Accepted Requests':
        return 'dashboard.stat.acceptedRequests';
      case 'Open Food Requests':
        return 'dashboard.stat.openFoodRequests';
      case 'Unread Notifications':
        return 'dashboard.stat.unreadNotifications';
      case 'Deliveries Received':
        return 'dashboard.stat.deliveriesReceived';
      case 'Pending Deliveries':
        return 'dashboard.stat.pendingDeliveries';
      default:
        return name;
    }
  };

  

  useEffect(() => {
    const activities = [
      ...donations.map(d => ({
        ...d,
        type: 'donation',
        title: `Donation: ${d.foodType}` + (d.volunteerName ? ` (Volunteer: ${d.volunteerName})` : ''),
        status: d.status,
        date: d.createdAt
      })),
      ...requests.map(r => ({
        ...r,
        type: 'request',
        title: `Request: ${r.foodType || 'Food Request'}`,
        status: r.status,
        date: r.createdAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

    setRecentActivity(activities);
  }, [donations, requests]);

  // Load authoritative user stats to align with Analytics across roles
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userProfile?.uid) { setUserStats(null); return; }
      try {
        const us = await getUserStats(userProfile.uid);
        if (!cancelled) setUserStats(us);
      } catch (e) {
        if (!cancelled) setUserStats(null);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [getUserStats, userProfile?.uid, userProfile?.role, donations, requests, deliveries, collections]);

  const stats = getStats();
  const quickActions = getQuickActions();

  // No personal impact chart dataset needed on Dashboard

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {t('dashboard.welcome', { name: userProfile?.name || '' })}
            </h1>
            <p className="text-green-100 mt-1">
              {userProfile?.role === 'restaurant' || userProfile?.role === 'individual'
                ? t('dashboard.tagline.restaurant')
                : userProfile?.role === 'foodbank'
                ? t('dashboard.tagline.foodbank')
                : t('dashboard.tagline.default')}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
              {userProfile?.role === 'restaurant' ? '🍽️' : userProfile?.role === 'foodbank' ? '🏢' : '🤝'}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t(statKeyFromName(stat.name), stat.name)}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.href}
                  className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 bg-${action.color}-100 rounded-lg flex items-center justify-center`}>
                    <action.icon className={`w-5 h-5 text-${action.color}-600`} />
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{t(`dashboard.action.${action.key}`)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentActivity')}</h2>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClockIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600">{t('dashboard.noRecent')}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {userProfile?.role === 'restaurant' || userProfile?.role === 'individual'
                    ? t('dashboard.noRecentHint.restaurant')
                    : userProfile?.role === 'foodbank'
                    ? t('dashboard.noRecentHint.foodbank')
                    : t('dashboard.noRecentHint.default')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center p-4 border border-gray-200 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'donation' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {activity.type === 'donation' ? (
                        <HeartIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <BellIcon className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    </div>
                    <span className={`status-badge status-${activity.status}`}>
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recentNotifications')}</h2>
            <Link to="/notifications" className="text-sm text-green-600 hover:text-green-700">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          <div className="space-y-3">
            {notifications.slice(0, 3).map((notification, index) => (
              <div key={index} className="flex items-center p-3 border border-gray-200 rounded-lg">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                  {notification.type === 'donation_request' ? '🍽️' : 
                   notification.type === 'request_accepted' ? '✅' : 
                   notification.type === 'request_rejected' ? '❌' : '📢'}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="text-xs text-gray-500">{notification.message}</p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-xl font-bold mb-4">{t('dashboard.yourImpact')}</h2>
        {userProfile?.role === 'restaurant' || userProfile?.role === 'individual'
          ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'Meals Donated')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.stat.mealsDonated')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'CO₂ Saved (kg)')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.impact.co2Unit')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'Requests Fulfilled')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.stat.requestsFulfilled')}</div>
              </div>
            </div>
          )
          : userProfile?.role === 'volunteer'
          ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'Deliveries Completed')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.stat.deliveriesCompleted', 'Deliveries Completed')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'CO₂ Saved (kg)')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.impact.co2Unit')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{unreadCount}</div>
                <div className="text-blue-100">{t('dashboard.stat.unreadNotifications')}</div>
              </div>
            </div>
          )
          : ['foodbank', 'nursery', 'poultry'].includes(userProfile?.role)
          ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'Deliveries Received')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.stat.deliveriesReceived')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'CO₂ Saved (kg)')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.impact.co2Unit')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'Pending Deliveries')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.stat.pendingDeliveries')}</div>
              </div>
            </div>
          )
          : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'Requests Fulfilled')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.stat.requestsFulfilled')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{getStats().find(s => s.name === 'CO₂ Saved (kg)')?.value ?? 0}</div>
                <div className="text-blue-100">{t('dashboard.impact.co2Unit')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{unreadCount}</div>
                <div className="text-blue-100">{t('dashboard.stat.unreadNotifications')}</div>
              </div>
            </div>
          )}
      </div>

      {/* Personal impact charts intentionally removed from Dashboard. View Analytics for graphs. */}
    </div>
  );
};

export default DashboardPage; 