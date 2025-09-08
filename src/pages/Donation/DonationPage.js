import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDonation } from '../../contexts/DonationContext';
import { useNotification } from '../../contexts/NotificationContext';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const USER_ROLES = {
  RESTAURANT: 'restaurant',
  INDIVIDUAL: 'individual',
  FOOD_BANK: 'foodbank',
  VOLUNTEER: 'volunteer',
  NURSERY: 'nursery',
  POULTRY_FARMER: 'poultry',
  MESS: 'mess',
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !positions || positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 12);
    } else {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
    }
  }, [map, positions]);
  return null;
};

const MapComponent = ({ items, onGrab, grabbingId }) => {
  const { t } = useTranslation();
  
  const validItems = items.filter(item =>
    item.donorCoordinates &&
    typeof item.donorCoordinates.lat === 'number' &&
    typeof item.donorCoordinates.lng === 'number'
  );

  const mapCenter = validItems.length > 0
    ? [validItems[0].donorCoordinates.lat, validItems[0].donorCoordinates.lng]
    : [20.5937, 78.9629]; 
  const positions = validItems.map(v => [v.donorCoordinates.lat, v.donorCoordinates.lng]);
  return (
    <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300 shadow-sm">
      <MapContainer center={mapCenter} zoom={validItems.length > 0 ? 10 : 5} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {validItems.map(item => (
          <Marker key={item.id} position={[item.donorCoordinates.lat, item.donorCoordinates.lng]}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{item.foodType}</p>
                <p>{item.quantity} {item.unit}</p>
                <p className="text-xs text-gray-600">{item.pickupAddress}</p>
                {onGrab && <button className="btn-primary mt-2 w-full text-xs" onClick={() => { void onGrab(item); }} disabled={grabbingId === item.id}>{grabbingId === item.id ? t('donation.buttons.grabbing') : t('donation.buttons.grab')}</button>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

const DonationPage = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const {
    donations = [],
    getPendingDonations,
    createDonation,
    createRequest,
    getUsersByRole,
    collectDonation,
    getRequestsForDonation,
    deleteDonation,
    acceptRequestAsVolunteer,
    createSelfDeliveryAssignment
  } = useDonation();
  const { sendDonationRequestNotification } = useNotification();

  const [form, setForm] = useState({
    cuisine: '',
    foodItems: '',
    unit: 'meals',
    quantity: '',
    expiryHours: 6,
    prepDate: '',
    prepTime: '',
    pickupAddress: '',
    notes: '',
    deliveryMethod: '',
    vegType: 'veg',
  });
  const [creating, setCreating] = useState(false);

  const [availableVolunteerDonations, setAvailableVolunteerDonations] = useState([]);
  const [availableReceiverDonations, setAvailableReceiverDonations] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);

  const [requestingId, setRequestingId] = useState(null);
  const [requestNotes, setRequestNotes] = useState('');

  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectingDonationId, setCollectingDonationId] = useState(null);
  const [collectQuality, setCollectQuality] = useState('good');
  const [destinationType, setDestinationType] = useState('foodbank');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [destinationUserId, setDestinationUserId] = useState('');
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [collectSubmitting, setCollectSubmitting] = useState(false);
  const [showCheckRequests, setShowCheckRequests] = useState(false);
  const [grabbingId, setGrabbingId] = useState(null);
  const [collectingRequest, setCollectingRequest] = useState(null);
  // donor (self-delivery) destination selection
  const [donorDestinationType, setDonorDestinationType] = useState('foodbank');
  const [donorDestinationUserId, setDonorDestinationUserId] = useState('');
  const [donorDestinationOptions, setDonorDestinationOptions] = useState([]);
  const [donorSelectedDestination, setDonorSelectedDestination] = useState(null);
  const navigate = useNavigate();

  const isDonor = useMemo(() =>
    [USER_ROLES.RESTAURANT, USER_ROLES.INDIVIDUAL, USER_ROLES.MESS].includes(userProfile?.role),
    [userProfile]
  );
  const isVolunteer = useMemo(() =>
    userProfile?.role === USER_ROLES.VOLUNTEER, [userProfile]);
  const isReceiver = useMemo(() =>
    [USER_ROLES.FOOD_BANK, USER_ROLES.NURSERY, USER_ROLES.POULTRY_FARMER].includes(userProfile?.role),
    [userProfile]
  );

  const myDonations = useMemo(() => (isDonor || isReceiver) ? donations : [], [isDonor, isReceiver, donations]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoadingAvailable(true);
      try {
        const all = await getPendingDonations(100);
        if (!mounted) return;

        if (isVolunteer) {
          const filtered = all.filter(d => d.deliveryMethod === 'volunteer' && !d.volunteerId);
          setAvailableVolunteerDonations(filtered);
        } else if (isReceiver) {
          const filtered = all.filter(d => ['self', 'volunteer'].includes(d.deliveryMethod));
          setAvailableReceiverDonations(filtered);
        }
      } finally {
        mounted && setLoadingAvailable(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [isVolunteer, isReceiver, getPendingDonations]);

  useEffect(() => {
    if (!collectModalOpen) {
      setSelectedDestination(null);
      return;
    }
    // Enforce allowed destination types by quality
    let allowedTypes = [];
    if (collectQuality === 'good') allowedTypes = [USER_ROLES.FOOD_BANK];
    else allowedTypes = [USER_ROLES.NURSERY, USER_ROLES.POULTRY_FARMER];

    // If current destinationType not allowed, set to first allowed
    if (!allowedTypes.includes(destinationType)) {
      setDestinationType(allowedTypes[0]);
      setDestinationUserId('');
      setDestinationOptions([]);
      setSelectedDestination(null);
      return; // will re-run with new destinationType
    }

    (async () => {
      const roleKey = destinationType === USER_ROLES.FOOD_BANK
        ? USER_ROLES.FOOD_BANK
        : destinationType === USER_ROLES.NURSERY
          ? USER_ROLES.NURSERY
          : USER_ROLES.POULTRY_FARMER;
      const users = await getUsersByRole(roleKey, { max: 100 });
      setDestinationOptions(users);
    })();
  }, [collectModalOpen, collectQuality, destinationType, getUsersByRole]);

  useEffect(() => {
    if (destinationUserId) {
      const dest = destinationOptions.find(u => (u.uid || u.id) === destinationUserId);
      setSelectedDestination(dest || null);
    } else {
      setSelectedDestination(null);
    }
  }, [destinationUserId, destinationOptions]);

  // donor self-delivery destination options
  useEffect(() => {
    if (form.deliveryMethod !== 'self') {
      setDonorDestinationUserId('');
      setDonorDestinationOptions([]);
      setDonorSelectedDestination(null);
      return;
    }
    (async () => {
      const roleKey = donorDestinationType === USER_ROLES.FOOD_BANK
        ? USER_ROLES.FOOD_BANK
        : donorDestinationType === USER_ROLES.NURSERY
          ? USER_ROLES.NURSERY
          : USER_ROLES.POULTRY_FARMER;
      const users = await getUsersByRole(roleKey, { max: 100 });
      setDonorDestinationOptions(users);
    })();
  }, [form.deliveryMethod, donorDestinationType, getUsersByRole]);

  useEffect(() => {
    if (donorDestinationUserId) {
      const dest = donorDestinationOptions.find(u => (u.uid || u.id) === donorDestinationUserId);
      setDonorSelectedDestination(dest || null);
    } else {
      setDonorSelectedDestination(null);
    }
  }, [donorDestinationUserId, donorDestinationOptions]);

  const handleCreateDonation = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const donationId = await createDonation({
       
        ...form,
        foodType: form.foodItems,
        quantity: Number(form.quantity) || 0,
        expiryHours: Number(form.expiryHours) || 6,
        pickupAddress: form.pickupAddress || userProfile?.address || '',
        notes: form.notes || ''
      });
      // If self delivery with destination selected, create assignment and notify
      if (form.deliveryMethod === 'self' && donorDestinationUserId && donorSelectedDestination) {
        await createSelfDeliveryAssignment({
          donationId,
          destinationType: donorDestinationType,
          destinationUserId: donorDestinationUserId,
          destinationInfo: {
            name: donorSelectedDestination.name,
            email: donorSelectedDestination.email,
            address: donorSelectedDestination.address,
            phone: donorSelectedDestination.phone
          }
        });
        toast.success('Self-delivery scheduled with destination');
      }
      setForm({
        cuisine: '',
        foodItems: '',
        unit: 'meals',
        quantity: '',
        expiryHours: 6,
        prepDate: '',
        prepTime: '',
        pickupAddress: '',
        notes: '',
        deliveryMethod: '',
        vegType: 'veg'
      });
      setDonorDestinationUserId('');
      setDonorSelectedDestination(null);
    } finally {
      setCreating(false);
    }
  };

  const handleSendRequest = async (donation) => {
    setRequestingId(donation.id);
    try {
      const id = await createRequest(donation.id, { notes: requestNotes, foodType: donation.foodType });
      await sendDonationRequestNotification(donation.donorId, userProfile?.name || 'A user', donation.foodType || 'food');
      setRequestNotes('');
      return id;
    } finally {
      setRequestingId(null);
    }
  };

  const handleGrab = async (donation) => {
    setGrabbingId(donation.id);
    try {
      const requests = await getRequestsForDonation(donation.id);
      const volunteerRequest = requests.find(r => r.isVolunteerRequest && !r.volunteerId);

      if (!volunteerRequest) {
        toast.error('This donation is no longer available for pickup.');
        return;
      }

      await acceptRequestAsVolunteer(volunteerRequest.id);
      setCollectingRequest(volunteerRequest);
      openCollect(donation.id);
    } catch (error) {
      console.error("Error grabbing request:", error);
      toast.error('Failed to grab the request.');
    } finally {
      setGrabbingId(null);
    }
  };

  const openCollect = (donationId) => {
    setCollectingDonationId(donationId);
    setCollectModalOpen(true);
  };

  const submitCollect = async (e) => {
    e.preventDefault();
    setCollectSubmitting(true);
    try {
      if (!collectingRequest) {
        toast.error('Internal error: Request information is missing.');
        return;
      }

      const destUser = destinationOptions.find(u => (u.uid || u.id) === destinationUserId);

      await collectDonation({
        donationId: collectingDonationId,
        requestId: collectingRequest.id,
        quality: collectQuality,
        destinationType: collectQuality === 'good' ? destinationType : null,
        destinationUserId: collectQuality === 'good' ? destinationUserId : null,
        destinationInfo: destUser
          ? { name: destUser.name, email: destUser.email, address: destUser.address, phone: destUser.phone }
          : undefined,
      });

      setShowCheckRequests(true);
      setCollectModalOpen(false);
      setTimeout(() => {
        navigate('/requests');
      }, 800);
    } catch (error) {
      console.error("Failed to submit collection:", error);
      // Firebase 'not-found' error indicates the document was deleted.
      if (error.code === 'not-found') {
        toast.error(
          'This donation is no longer available or has been deleted by the donor.'
        );
      } else {
        toast.error(`An error occurred: ${error.message}`);
      }
      setCollectModalOpen(false);
    } finally {
      setCollectSubmitting(false);
      setCollectingRequest(null);
    }
  };

  return (
    <>
      {showCheckRequests && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 my-4 text-blue-900 font-semibold">
          {t('donation.actionComplete')} <a href="/requests" className="underline">{t('nav.requests')}</a> {t('donation.actionCompleteSuffix')}
        </div>
      )}

      {}
      {(isVolunteer || isReceiver) && (
        <div className="mb-4 flex justify-end">
          <div className="inline-flex rounded-md shadow-sm">
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${viewMode === 'list' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>{t('common.list')}</button>
            <button onClick={() => setViewMode('map')} className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r ${viewMode === 'map' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>{t('common.map')}</button>
          </div>
        </div>
      )}

      {isDonor && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('donation.createTitle')}</h2>
          <form
            onSubmit={e => {
              void handleCreateDonation(e);
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('donation.cuisine')}</label>
              <select
                className="input-field w-full"
                value={form.cuisine}
                onChange={e => setForm(f => ({ ...f, cuisine: e.target.value }))}
                required
              >
                <option value="">{t('donation.selectCuisine')}</option>
                <option value="Indian">{t('donation.cuisineOptions.indian')}</option>
                <option value="Chinese">{t('donation.cuisineOptions.chinese')}</option>
                <option value="Italian">{t('donation.cuisineOptions.italian')}</option>
                <option value="Continental">{t('donation.cuisineOptions.continental')}</option>
                <option value="Mexican">{t('donation.cuisineOptions.mexican')}</option>
                <option value="Other">{t('donation.cuisineOptions.other')}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t('donation.foodItemsLabel')}</label>
              <input
                type="text"
                className="input-field w-full"
                value={form.foodItems}
                onChange={e => setForm(f => ({ ...f, foodItems: e.target.value }))}
                placeholder={t('donation.placeholders.foodItems')}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('donation.hints.foodItems')}
              </p>
            </div>
            {isDonor && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('donation.vegType')}</label>
                <select
                  className="input-field w-full"
                  value={form.vegType}
                  onChange={e => setForm(f => ({ ...f, vegType: e.target.value }))}
                  required
                >
                  <option value="veg">{t('donation.veg')}</option>
                  <option value="nonveg">{t('donation.nonveg')}</option>
                  <option value="mixed">{t('donation.mixed')}</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('donation.unit')}</label>
              <select
                className="input-field w-full"
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              >
                <option value="meals">{t('donation.units.meals')}</option>
                <option value="kg">{t('donation.units.kg')}</option>
                <option value="liters">{t('donation.units.liters')}</option>
                <option value="packs">{t('donation.units.packs')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('donation.quantity')}</label>
              <input
                type="number"
                min="1"
                className="input-field w-full"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('donation.expiry')}</label>
              <input
                type="number"
                min="1"
                className="input-field w-full"
                value={form.expiryHours}
                onChange={e => setForm(f => ({ ...f, expiryHours: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('donation.prepDate')}</label>
              <input
                type="date"
                className="input-field w-full"
                value={form.prepDate}
                onChange={e => setForm(f => ({ ...f, prepDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('donation.prepTime')}</label>
              <input
                type="time"
                className="input-field w-full"
                value={form.prepTime}
                onChange={e => setForm(f => ({ ...f, prepTime: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t('donation.pickupAddress')}</label>
              <input
                type="text"
                className="input-field w-full"
                value={form.pickupAddress}
                onChange={e => setForm(f => ({ ...f, pickupAddress: e.target.value }))}
                placeholder={t('donation.placeholders.pickupAddress')}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t('donation.notes')}</label>
              <textarea
                className="input-field w-full"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">{t('donation.deliveryMethod')}</label>
              <select
                className="input-field w-full"
                value={form.deliveryMethod}
                onChange={e => setForm(f => ({ ...f, deliveryMethod: e.target.value }))}
                required
              >
                <option value="">{t('common.select')}</option>
                <option value="volunteer">{t('donation.deliveryMethodOptions.volunteerPickup')}</option>
                <option value="self">{t('donation.deliveryMethodOptions.selfDelivery')}</option>
              </select>
            </div>
            {form.deliveryMethod === 'self' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('donation.destinationType')}</label>
                  <select
                    className="input-field w-full"
                    value={donorDestinationType}
                    onChange={e => { setDonorDestinationType(e.target.value); setDonorDestinationUserId(''); }}
                  >
                    <option value="foodbank">{t('donation.destinationTypes.foodbank')}</option>
                    <option value="nursery">{t('donation.destinationTypes.nursery')}</option>
                    <option value="poultry">{t('donation.destinationTypes.poultry')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('donation.selectDestination')}</label>
                  <select
                    className="input-field w-full"
                    value={donorDestinationUserId}
                    onChange={e => setDonorDestinationUserId(e.target.value)}
                  >
                    <option value="">{t('common.select')}</option>
                    {donorDestinationOptions.map(u => (
                      <option key={u.uid || u.id} value={u.uid || u.id}>
                        {u.name} {u.address ? `- ${u.address}` : ''}
                      </option>
                    ))}
                  </select>
                  {donorSelectedDestination && (
                    <div className="mt-2 p-2 bg-gray-50 border rounded text-sm">
                      <p className="font-semibold">{donorSelectedDestination.name}</p>
                      <p className="text-xs text-gray-600">{donorSelectedDestination.address}</p>
                      {donorSelectedDestination.address && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(donorSelectedDestination.address)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">{t('common.map')}</a>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            <button type="submit" disabled={creating} className="btn-primary px-6 py-2 disabled:opacity-50 md:col-span-2">
              {creating ? t('donation.buttons.creating') : t('donation.buttons.create')}
            </button>
          </form>

          <h3 className="text-lg font-semibold mt-8 mb-2">{t('donation.myDonations')}</h3>
          {myDonations.length === 0 ? (
            <div className="text-gray-500">{t('donation.noDonationsYet')}</div>
          ) : (
            <ul>
              {myDonations.map(d => (
                <li key={d.id} className="border-b py-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{d.foodType}</span> &mdash; {d.quantity} {d.unit} &mdash; {d.pickupAddress}
                  </div>
                  <button
                    className="ml-4 btn-danger px-2 py-1 rounded text-white bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      if (window.confirm(t('donation.confirmDelete'))) {
                        void deleteDonation(d.id);
                      }
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isVolunteer && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('donation.availableToCollect')}</h2>
          {loadingAvailable ? (
            <div>{t('common.loading')}</div>
          ) : availableVolunteerDonations.length === 0 ? (
            <div className="text-gray-500">{t('donation.noAvailableToCollect')}</div>
          ) : viewMode === 'list' ? (
            <ul>
              {availableVolunteerDonations.map(d => (
                <li key={d.id} className="border-b py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{d.foodType}</span> &mdash; {d.quantity} {d.unit}
                    <p className="text-sm text-gray-600">
                      {d.pickupAddress}
                      {d.pickupAddress && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.pickupAddress)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">({t('common.map')})</a>}
                    </p>
                  </div>
                  <button
                    className="btn-primary ml-4"
                    onClick={() => {
                      void handleGrab(d);
                    }}
                    disabled={grabbingId === d.id}
                  >
                    {grabbingId === d.id ? t('donation.buttons.grabbing') : t('donation.buttons.grab')}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <MapComponent items={availableVolunteerDonations} onGrab={handleGrab} grabbingId={grabbingId} />
          )}
        </div>
      )}

      {isReceiver && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('donation.availableDonations')}</h2>
          {loadingAvailable ? (
            <div>{t('common.loading')}</div>
          ) : availableReceiverDonations.length === 0 ? (
            <div className="text-gray-500">{t('donation.noAvailableDonations')}</div>
          ) : viewMode === 'list' ? (
            <ul>
              {availableReceiverDonations.map(d => (
                <li key={d.id} className="border-b py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{d.foodType}</span> &mdash; {d.quantity} {d.unit}
                    <p className="text-sm text-gray-600">
                      {d.pickupAddress}
                      {d.pickupAddress && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.pickupAddress)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">({t('common.map')})</a>}
                    </p>
                  </div>
                  <button
                    className="btn-primary ml-4"
                    disabled={requestingId === d.id}
                    onClick={() => {
                      void handleSendRequest(d);
                    }}
                  >
                    {requestingId === d.id ? t('donation.buttons.requesting') : t('donation.buttons.request')}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <MapComponent items={availableReceiverDonations} />
          )}
        </div>
      )}

      {collectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setCollectModalOpen(false)}>
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-4">{t('donation.completeCollection')}</h2>
            <form
              onSubmit={e => {
                void submitCollect(e);
              }}
              className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('donation.foodQuality')}</label>
                <select
                  className="input-field w-full"
                  value={collectQuality}
                  onChange={e => { setCollectQuality(e.target.value); setDestinationUserId(''); }}
                  required
                >
                  <option value="good">{t('donation.quality.good')}</option>
                  <option value="bad">{t('donation.quality.bad')}</option>
                </select>
              </div>
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('donation.destinationType')}</label>
                  <select
                    className="input-field w-full"
                    value={destinationType}
                    onChange={e => {
                      setDestinationType(e.target.value);
                      setDestinationUserId('');
                    }}
                    required
                  >
                    {collectQuality === 'good' ? (
                      <>
                        <option value="foodbank">Food Bank</option>
                      </>
                    ) : (
                      <>
                        <option value="nursery">Nursery</option>
                        <option value="poultry">Poultry Farmer</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Destination</label>
                  <select
                    className="input-field w-full"
                    value={destinationUserId}
                    onChange={e => setDestinationUserId(e.target.value)}
                    required
                  >
                    <option value="">Select...</option>
                    {destinationOptions.map(u => (
                      <option key={u.uid || u.id} value={u.uid || u.id}>
                        {u.name} {u.address ? `- ${u.address}` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedDestination && (
                    <div className="mt-2 p-2 bg-gray-50 border rounded text-sm">
                      <p className="font-semibold">{selectedDestination.name}</p>
                      <p className="text-xs text-gray-600">{selectedDestination.address}</p>
                      {selectedDestination.address && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedDestination.address)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">{t('donation.viewOnMap')}</a>
                      )}
                    </div>
                  )}
                </div>
              </>
              <button type="submit" disabled={collectSubmitting || (!destinationUserId || !destinationType)} className="btn-primary px-6 py-2">
                {collectSubmitting ? t('donation.buttons.submitting') : t('donation.buttons.submit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default DonationPage;
