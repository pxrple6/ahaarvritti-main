import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useDonation } from '../../contexts/DonationContext';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { userProfile, updateUserProfile } = useAuth();
  const { donations, requests, DONATION_STATUS, REQUEST_STATUS, getUserStats } = useDonation();
  const [userStats, setUserStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setForm({
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        address: userProfile.address || ''
      });
    }
  }, [userProfile]);

  const basicStats = useMemo(() => {
    const totalDonations = donations.length;
    const completedDonations = donations.filter(d => d.status === DONATION_STATUS.COMPLETED).length;
    const totalRequests = requests.length;
    const fulfilledRequests = requests.filter(r => r.status === REQUEST_STATUS.FULFILLED).length;
    return { totalDonations, completedDonations, totalRequests, fulfilledRequests };
  }, [donations, requests, DONATION_STATUS, REQUEST_STATUS]);

  const isVolunteer = userProfile?.role === 'volunteer';
  const isDonor = ['restaurant', 'individual', 'mess'].includes(userProfile?.role);
  const isReceiver = ['foodbank', 'nursery', 'poultry'].includes(userProfile?.role);

  useEffect(() => {
    const loadUserStats = async () => {
      if (!userProfile?.uid) return;
      setStatsLoading(true);
      try {
        const s = await getUserStats(userProfile.uid);
        setUserStats(s);
      } catch (e) {
        console.error('Failed to load user stats for profile:', e);
      } finally {
        setStatsLoading(false);
      }
    };
    void loadUserStats();
  }, [userProfile?.uid, getUserStats]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({ name: form.name, phone: form.phone, address: form.address });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('profile.role')}: <span className="capitalize">{userProfile?.role}</span></p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.info.title')}</h2>
        <form
          onSubmit={e => {
            void onSubmit(e);
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">{t('profile.info.name')}</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">{t('profile.info.phone')}</label>
            <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">{t('profile.info.address')}</label>
            <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="btn-primary px-6 py-2 disabled:opacity-50" disabled={saving}>{saving ? t('profile.info.saving') : t('profile.info.save')}</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.stats.title')}</h2>
        {isVolunteer ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label={t('profile.stats.cards.deliveriesCompleted', 'Deliveries Completed')} value={userStats?.deliveriesCompleted ?? (statsLoading ? '…' : 0)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {isDonor && (
              <>
                <StatCard label={t('profile.stats.cards.totalDonations')} value={basicStats.totalDonations} />
                <StatCard label={t('profile.stats.cards.completedDonations')} value={basicStats.completedDonations} />
              </>
            )}
            {(isDonor || isReceiver) && (
              <>
                <StatCard label={t('profile.stats.cards.totalRequests')} value={basicStats.totalRequests} />
                <StatCard label={t('profile.stats.cards.requestsFulfilled')} value={basicStats.fulfilledRequests} />
              </>
            )}
          </div>
        )}
      </div>

      {isVolunteer && (userStats?.deliveriesCompleted ?? 0) > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('profile.impact.title', 'Your Impact in Perspective')}</h3>
          <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-600 text-xl mr-3">🚚</span>
            <p className="text-sm text-green-800">
              {t('profile.impact.volunteerBlurb', `With your ${userStats?.deliveriesCompleted || 0} deliveries, you've been a crucial link in our logistics chain, ensuring food reaches those in need.`)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div className="p-4 border border-gray-200 rounded-lg">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default ProfilePage; 
