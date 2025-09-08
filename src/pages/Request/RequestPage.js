import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import toast from 'react-hot-toast';
import { useDonation } from '../../contexts/DonationContext';
import { doc, deleteDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

const RequestPage = () => {
  const { requests, volunteerRequests, deliveries, REQUEST_STATUS, getUsersByRole, collectDonation, updateRequestStatus, acceptIncomingDelivery } = useDonation();
  const { t } = useTranslation();
  const { sendDeliveryCompletedNotification, createNotification, NOTIFICATION_TYPES } = useNotification();

  const deleteRequest = async (requestId) => {
    if (!requestId) return;
    const toastId = toast.loading(t('request.toasts.deleting'));
    try {
      await deleteDoc(doc(firestore, 'requests', requestId));
      toast.success(t('request.toasts.deleteSuccess'), { id: toastId });
      
    } catch (err) {
      console.error("Failed to delete request:", err);
      toast.error(`${t('request.toasts.deleteFailed')}: ${err.message}`, { id: toastId });
    }
  };
  const { userProfile } = useAuth();
  const [filter, setFilter] = useState('active');

  const [collectingRequest, setCollectingRequest] = useState(null);
  const [collectQuality, setCollectQuality] = useState('good');
  const [destinationType, setDestinationType] = useState('foodbank');
  const [destinationUserId, setDestinationUserId] = useState('');
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!collectModalOpen) return;
    const fetchOptions = async () => {
      let roleKey = destinationType === 'foodbank' ? 'foodbank' : destinationType === 'nursery' ? 'nursery' : 'poultry';
      if (collectQuality === 'good') {
        const users = await getUsersByRole(roleKey, { max: 100 });
        setDestinationOptions(users);
      } else {
        // For bad, show nursery/poultry
        const users = await getUsersByRole(destinationType, { max: 100 });
        setDestinationOptions(users);
      }
    };
    fetchOptions();
  }, [collectModalOpen, collectQuality, destinationType, getUsersByRole]);

  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    if (!collectingRequest?.donationId) {
      toast.error(t('request.toasts.missingDonation'));
      console.error(
        'Cannot collect request without a donationId.',
        collectingRequest
      );
      return;
    }
    setSubmitting(true);
    try {
      const destUser = destinationOptions.find(
        (opt) => (opt.uid || opt.id) === destinationUserId
      );
      await collectDonation({
        donationId: collectingRequest.donationId,
        requestId: collectingRequest.id,
        quality: collectQuality,
        destinationType: collectQuality === 'good' ? destinationType : null,
        destinationUserId: collectQuality === 'good' ? destinationUserId : null,
        notes: collectingRequest.notes || '',
        destinationInfo: destUser
          ? { name: destUser.name, email: destUser.email, address: destUser.address, phone: destUser.phone }
          : undefined,
      });
      toast.success(t('request.toasts.collectSubmitted'));
      setCollectModalOpen(false);
    } catch (error) {
      console.error('Failed to submit collection from request page:', error);
      if (error.code === 'not-found') {
        toast.error(t('request.toasts.donationNotFound'));
      } else {
        toast.error(`${t('request.toasts.errorOccurred')}: ${error.message}`);
      }
      setCollectModalOpen(false);
    } finally {
      setSubmitting(false);
      setCollectingRequest(null);
    }
  };

  const filtered = useMemo(() => {
    const activeStatuses = [REQUEST_STATUS.PENDING, REQUEST_STATUS.ACCEPTED];
    if (userProfile?.role === 'volunteer') {
      let reqs = volunteerRequests || [];
      if (filter === 'all') return reqs;
      if (filter === 'active') return reqs.filter((r) => activeStatuses.includes(r.status));
      return reqs.filter((r) => r.status === filter);
    }
    if (['foodbank','nursery','poultry'].includes(userProfile?.role)) {
      // Merge personal requests with assigned deliveries (destinationUserId == me)
      const combined = [...(requests || []), ...(deliveries || [])];
      const dedup = Array.from(new Map(combined.map(r => [r.id, r])).values());
      if (filter === 'all') return dedup;
      if (filter === 'active') return dedup.filter(r => activeStatuses.includes(r.status));
      return dedup.filter(r => r.status === filter);
    }
    if (filter === 'all') return requests;
    if (filter === 'active') return requests.filter((r) => activeStatuses.includes(r.status));
    return requests.filter((r) => r.status === filter);
  }, [requests, volunteerRequests, deliveries, filter, userProfile]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('request.title')}</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{t('request.filter.label')}</label>
            <select className="input-field" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="active">{t('request.filter.options.active')}</option>
              <option value="all">{t('request.filter.options.all')}</option>
              <option value={REQUEST_STATUS.PENDING}>{t('request.filter.options.pending')}</option>
              <option value={REQUEST_STATUS.ACCEPTED}>{t('request.filter.options.accepted')}</option>
              <option value={REQUEST_STATUS.REJECTED}>{t('request.filter.options.rejected')}</option>
              <option value={REQUEST_STATUS.FULFILLED}>{t('request.filter.options.fulfilled')}</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-600 mt-4">{t('request.none')}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{new Date(r.createdAt?.toDate?.() || r.createdAt || Date.now()).toLocaleString()}</p>
                    <p className="text-gray-900 font-medium">{r.foodType || t('request.foodRequest')}</p>
                    {r.notes && <p className="text-sm text-gray-600">{r.notes}</p>}
                    {r.donorName && <p className="text-sm text-gray-600">{t('request.fields.from')}: {r.donorName} ({r.donorEmail})</p>}
                    {r.donorAddress && <p className="text-sm text-gray-600">{t('request.fields.pickup')}: {r.donorAddress}</p>}
                    {r.requesterName && <p className="text-sm text-gray-600">{t('request.fields.requestedBy')}: {r.requesterName}</p>}
                    {/* Destination notification badge */}
                    {r.destinationNotified && (
                      <span className="inline-block text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded px-2 py-0.5 mr-2">{t('request.badges.incomingDonation')}</span>
                    )}
                    {}
                    {userProfile?.role === 'volunteer' && r.status === REQUEST_STATUS.ACCEPTED && r.volunteerId === userProfile.uid && (
                      <button
                        className="btn-primary px-2 py-1 rounded text-white bg-green-600 hover:bg-green-700 mt-2"
                        onClick={() => {
                          setCollectingRequest(r);
                          setCollectQuality('good');
                          setDestinationType('foodbank');
                          setDestinationUserId('');
                          setCollectModalOpen(true);
                        }}
                      >
                        {t('request.buttons.collect')}
                      </button>
                    )}
                    {}
                    <button
                      className="ml-2 btn-danger px-2 py-1 rounded text-white bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        if (window.confirm(t('request.confirmDelete'))) {
                          void deleteRequest(r.id);
                        }
                      }}>{t('request.buttons.delete')}</button>
                  </div>
                  <span className={`status-badge status-${r.status}`}>{r.status}</span>
                </div>
                {r.isRoutedByVolunteer && (
                  <p className="text-xs text-purple-600 mt-2">{t('request.routedByVolunteer')}</p>
                )}
                {}
                {['foodbank','nursery','poultry'].includes(userProfile?.role) && r.status === REQUEST_STATUS.ACCEPTED && r.destinationUserId === userProfile?.uid && !r.destinationAccepted && (
                  <button
                    className="btn-primary px-3 py-1 rounded text-white bg-blue-600 hover:bg-blue-700 mt-2"
                    onClick={() => {
                      const toastId = toast.loading(t('request.toasts.accepting'));
                      acceptIncomingDelivery(r.id)
                        .then(() => toast.success(t('request.toasts.accepted'), { id: toastId }))
                        .catch((err) => {
                          console.error('Failed to accept delivery:', err);
                          toast.error(t('request.toasts.failed'), { id: toastId });
                        });
                    }}
                  >
                    {t('request.buttons.accept')}
                  </button>
                )}
                {['foodbank','nursery','poultry'].includes(userProfile?.role) && r.status === REQUEST_STATUS.ACCEPTED && r.destinationUserId === userProfile?.uid && r.destinationAccepted && (
                  <p className="text-sm text-green-700 mt-2">{t('request.badges.incomingDonation')} · {t('request.acceptedByYou') || 'Accepted by you'}</p>
                )}
                {}
                {userProfile?.role === 'volunteer' && r.status === 'collected' && r.destinationName && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="font-semibold text-blue-800">
                      {t('request.dropoffAt')} {r.destinationType === 'foodbank' ? t('donation.destinationTypes.foodbank') : r.destinationType === 'nursery' ? t('donation.destinationTypes.nursery') : t('donation.destinationTypes.poultry')}: {r.destinationName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t('request.address')}: {r.destinationAddress}
                      {r.destinationAddress && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.destinationAddress)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">
                          ({t('common.map')})
                        </a>
                      )}
                    </p>
                    {r.destinationPhone && <p className="text-sm text-gray-600">{t('request.phone')}: {r.destinationPhone}</p>}
                    <button
                      className="btn-primary px-3 py-1 rounded text-white bg-purple-600 hover:bg-purple-700 mt-2"
                      onClick={() => {
                        const markCompleted = async (requestId, volunteerId) => {
                          const toastId = toast.loading(t('request.toasts.markingCompleted'));
                          try {
                            await updateRequestStatus(requestId, REQUEST_STATUS.FULFILLED);
                            const volunteerRef = doc(firestore, 'users', volunteerId);
                            await updateDoc(volunteerRef, { tokens: increment(5) });
                            // Notify donor and destination of completion
                            try {
                              const reqDonationSnap = await getDoc(doc(firestore, 'donations', r.donationId));
                              const donationData = reqDonationSnap.exists() ? reqDonationSnap.data() : null;
                              const donorId = donationData?.donorId;
                              const requesterName = r.requesterName || t('request.receiver');
                              if (donorId) {
                                await sendDeliveryCompletedNotification(donorId, requesterName);
                              }
                              if (r.destinationUserId) {
                                await createNotification({
                                  userId: r.destinationUserId,
                                  type: NOTIFICATION_TYPES.SYSTEM_MESSAGE,
                                  title: t('request.notifications.deliveryCompleted.title'),
                                  message: t('request.notifications.deliveryCompleted.message', { food: r.foodType || t('request.food'), by: userProfile?.name || t('request.aVolunteer') }),
                                  data: { requestId: r.id, donationId: r.donationId }
                                });
                              }
                            } catch (notifyErr) {
                              console.error('Completion notification error:', notifyErr);
                            }
                            toast.success(t('request.toasts.completedAndAwarded'), { id: toastId });
                          } catch (err) {
                            console.error("Failed to mark as completed:", err);
                            toast.error(`${t('request.toasts.updateFailed')}: ${err.message}`, { id: toastId });
                          }
                        };
                        void markCompleted(r.id, userProfile.uid);
                      }}
                    >
                      {t('request.buttons.markCompleted')}
                    </button>
                  </div>
                )}
                {['foodbank','nursery','poultry'].includes(userProfile?.role) && r.status === 'collected' && r.destinationUserId === userProfile?.uid && (
                  <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-200">
                    <p className="text-sm text-green-800">{t('request.pleaseConfirmReceipt')}</p>
                    <button
                      className="btn-primary px-3 py-1 rounded text-white bg-green-600 hover:bg-green-700 mt-2"
                      onClick={() => {
                        const markReceived = async () => {
                          const toastId = toast.loading(t('request.toasts.confirmingReceipt'));
                          try {
                            await updateRequestStatus(r.id, REQUEST_STATUS.FULFILLED);
                            // Notify requester (typically donor for volunteer/self deliveries)
                            if (r.requesterId) {
                              await createNotification({
                                userId: r.requesterId,
                                type: NOTIFICATION_TYPES.SYSTEM_MESSAGE,
                                title: t('request.notifications.deliveryReceived.title'),
                                message: t('request.notifications.deliveryReceived.message', { name: userProfile?.name || t('request.receiver'), food: r.foodType || t('request.theDonation') }),
                                data: { requestId: r.id, donationId: r.donationId }
                              });
                            }
                            toast.success(t('request.toasts.markedReceived'), { id: toastId });
                          } catch (err) {
                            console.error('Failed to confirm receipt:', err);
                            toast.error(`${t('request.toasts.failed')}: ${err.message}`, { id: toastId });
                          }
                        };
                        void markReceived();
                      }}
                    >
                      {t('request.buttons.markReceived')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {}
      {collectModalOpen && collectingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setCollectModalOpen(false)}>&times;</button>
            <h2 className="text-xl font-semibold mb-4">{t('request.collectModal.title')}</h2>
            <form
              onSubmit={(e) => {
                void handleCollectSubmit(e);
              }}
            >
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-1">{t('request.collectModal.quality')}</label>
                <select className="input-field" value={collectQuality} onChange={e => setCollectQuality(e.target.value)}>
                  <option value="good">{t('donation.quality.good')}</option>
                  <option value="bad">{t('request.collectModal.badExpired')}</option>
                </select>
              </div>
              {collectQuality === 'good' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-700 mb-1">{t('request.collectModal.destinationType')}</label>
                    <select className="input-field" value={destinationType} onChange={e => setDestinationType(e.target.value)}>
                      <option value="foodbank">{t('donation.destinationTypes.foodbank')}</option>
                      <option value="nursery">{t('donation.destinationTypes.nursery')}</option>
                      <option value="poultry">{t('donation.destinationTypes.poultry')}</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-700 mb-1">{t('request.collectModal.destination')}</label>
                    <select className="input-field" value={destinationUserId} onChange={e => setDestinationUserId(e.target.value)} required>
                      <option value="">{t('common.select')}</option>
                      {destinationOptions.map(opt => (
                        <option key={opt.uid || opt.id} value={opt.uid || opt.id}>{opt.name} ({opt.address})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {}
              <div className="flex justify-end">
                <button type="submit" className="btn-primary px-6 py-2" disabled={submitting}>
                  {submitting ? t('request.buttons.submitting') : t('request.buttons.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('request.howItWorks.title')}</h2>
        <p className="text-sm text-gray-600 mt-2">
          {t('request.howItWorks.body')}
        </p>
      </div>
    </div>
  );
};

export default RequestPage;
