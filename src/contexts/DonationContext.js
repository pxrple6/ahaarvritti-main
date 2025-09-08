import React, { createContext, useContext, useState, useEffect } from 'react';
import { firestore } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const DonationContext = createContext();

export function useDonation() {
  return useContext(DonationContext);
}
const calculateCO2Saved = (donation) => {
  if (!donation || !donation.quantity || !donation.unit) {
    return 0;
  }
  const quantity = Number(donation.quantity) || 0;
  if (donation.unit === 'meals') {
    return quantity * 1.3; 
  }
  
  if (['kg', 'liters', 'packs'].includes(donation.unit)) {
    return quantity * 2.5; }
  return 0;
};

export const DonationProvider = ({ children }) => {
  const { currentUser, userProfile, getUsersByRole } = useAuth();
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [volunteerRequests, setVolunteerRequests] = useState([]);
  const [collections, setCollections] = useState([]);
  const [deliveries, setDeliveries] = useState([]); 
  const [availableRequests, setAvailableRequests] = useState([]); 
  const getAllPendingRequests = async () => {
    try {
      const q = query(
        collection(firestore, 'requests'),
        where('status', '==', REQUEST_STATUS.PENDING),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Get all pending requests error:', error);
      return [];
    }
  };

  // Helper: fetch a single donation by id
  const getDonationById = async (donationId) => {
    if (!donationId) return null;
    try {
      const snap = await getDoc(doc(firestore, 'donations', donationId));
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    } catch (e) {
      console.error('getDonationById error:', e);
      return null;
    }
  };

  // Destination acknowledges/accepts an incoming delivery
  const acceptIncomingDelivery = async (requestId) => {
    try {
      const requestRef = doc(firestore, 'requests', requestId);
      // Fetch request to derive who to notify
      const reqSnap = await getDoc(requestRef);
      if (!reqSnap.exists()) throw new Error('Request not found');
      const reqData = reqSnap.data();

      await updateDoc(requestRef, {
        destinationAccepted: true,
        updatedAt: serverTimestamp()
      });

      // Try to notify donor and volunteer (if any)
      try {
        const donationId = reqData.donationId;
        let donorId = null;
        if (donationId) {
          const donationSnap = await getDoc(doc(firestore, 'donations', donationId));
          if (donationSnap.exists()) donorId = donationSnap.data().donorId || null;
        }

        const notifications = [];
        // Notify donor
        if (donorId) {
          notifications.push(addDoc(collection(firestore, 'notifications'), {
            userId: donorId,
            type: 'system_message',
            title: 'Delivery Accepted',
            message: `${reqData.destinationName || 'The destination'} has accepted your donation delivery`,
            data: { requestId, donationId },
            createdAt: serverTimestamp(),
            isRead: false,
            readAt: null
          }));
        }
        // Notify volunteer if assigned
        if (reqData.volunteerId) {
          notifications.push(addDoc(collection(firestore, 'notifications'), {
            userId: reqData.volunteerId,
            type: 'system_message',
            title: 'Delivery Accepted',
            message: `${reqData.destinationName || 'The destination'} has accepted the delivery`,
            data: { requestId, donationId },
            createdAt: serverTimestamp(),
            isRead: false,
            readAt: null
          }));
        }
        await Promise.all(notifications);
      } catch (notifyErr) {
        console.error('Error sending acceptance notifications:', notifyErr);
      }

      toast.success('Delivery accepted');
    } catch (error) {
      console.error('Accept incoming delivery error:', error);
      toast.error('Error accepting delivery');
      throw error;
    }
  };

  // Create a request for self-delivery donors with destination pre-selected and notify destination
  const createSelfDeliveryAssignment = async ({ donationId, destinationType, destinationUserId, destinationInfo }) => {
    if (!currentUser || !donationId || !destinationUserId || !destinationInfo) return null;
    try {
      const request = {
        donationId,
        requesterId: currentUser.uid,
        requesterName: userProfile?.name,
        requesterEmail: userProfile?.email,
        requesterPhone: userProfile?.phone,
        requesterAddress: userProfile?.address,
        requesterCoordinates: userProfile?.coordinates,
        status: REQUEST_STATUS.ACCEPTED, // accepted since donor is self-delivering
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        foodType: '',
        notes: 'Self delivery scheduled by donor',
        quantity: null,
        unit: null,
        isVolunteerRequest: false,
        destinationUserId,
        destinationName: destinationInfo.name,
        destinationEmail: destinationInfo.email,
        destinationAddress: destinationInfo.address,
        destinationPhone: destinationInfo.phone || null,
        destinationType,
        quality: 'good',
        destinationNotified: false
      };
      const reqRef = await addDoc(collection(firestore, 'requests'), request);

      // Notify destination
      await addDoc(collection(firestore, 'notifications'), {
        userId: destinationUserId,
        type: 'system_message',
        title: 'Incoming Self-Delivery',
        message: `${userProfile?.name || 'A donor'} will deliver a donation to your organization`,
        data: { donationId, requestId: reqRef.id, destinationName: destinationInfo?.name || null },
        createdAt: serverTimestamp(),
        isRead: false,
        readAt: null
      });
      await updateDoc(doc(firestore, 'requests', reqRef.id), { destinationNotified: true, updatedAt: serverTimestamp() });
      return reqRef.id;
    } catch (error) {
      console.error('createSelfDeliveryAssignment error:', error);
      toast.error('Failed to schedule self-delivery');
      throw error;
    }
  };

  const acceptRequestAsVolunteer = async (requestId) => {
    if (!currentUser) {
      toast.error('You must be logged in as a volunteer to accept requests');
      return;
    }
    try {
      const requestRef = doc(firestore, 'requests', requestId);
      await updateDoc(requestRef, {
        status: REQUEST_STATUS.ACCEPTED,
        volunteerId: currentUser.uid,
        volunteerName: userProfile?.name,
        volunteerEmail: userProfile?.email,
        updatedAt: serverTimestamp()
      });
      toast.success('Request accepted!');
    } catch (error) {
      console.error('Accept request error:', error);
      toast.error('Error accepting request');
      throw error;
    }
  };
  const [loading, setLoading] = useState(false);

  const DONATION_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    COMPLETED: 'completed',
    EXPIRED: 'expired'
  };

  const REQUEST_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    FULFILLED: 'fulfilled'
  };

  const getRequestsForDonation = async (donationId) => {
    if (!donationId) return [];
    try {
      const q = query(
        collection(firestore, 'requests'),
        where('donationId', '==', donationId)
      );
      const querySnapshot = await getDocs(q);
      const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      requests.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      
      return requests;
    } catch (error) {
      console.error('Get requests for donation error:', error);
      return [];
    }
  };

  const createDonation = async (donationData) => {
    try {
      setLoading(true);
      const donation = {
        ...donationData,
        donorId: currentUser.uid,
        donorName: userProfile.name,
        donorEmail: userProfile.email,
        donorPhone: userProfile.phone,
        donorAddress: userProfile.address,
        donorCoordinates: userProfile.coordinates,
        status: DONATION_STATUS.PENDING,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiryTime: new Date(Date.now() + donationData.expiryHours * 60 * 60 * 1000).toISOString(),
        isExpired: false,
        totalRequests: 0,
        acceptedRequests: 0
      };
      const docRef = await addDoc(collection(firestore, 'donations'), donation);

      // If deliveryMethod is 'volunteer', create a pending request for volunteers
      if (donationData.deliveryMethod === 'volunteer') {
        const volunteerRequest = {
          donationId: docRef.id,
          requesterId: currentUser.uid,
          requesterName: userProfile.name,
          requesterEmail: userProfile.email,
          requesterPhone: userProfile.phone,
          requesterAddress: userProfile.address,
          requesterCoordinates: userProfile.coordinates,
          status: REQUEST_STATUS.PENDING,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          foodType: donationData.foodType,
          notes: donationData.notes || '',
          quantity: donationData.quantity || null,
          unit: donationData.unit || null,
          isVolunteerRequest: true
        };
        await addDoc(collection(firestore, 'requests'), volunteerRequest);
      }

      toast.success('Donation created successfully!');
      return docRef.id;
    } catch (error) {
      console.error('Create donation error:', error);
      toast.error('Error creating donation');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (donationId, requestData) => {
    try {
      setLoading(true);
      
      const request = {
        donationId,
        requesterId: currentUser.uid,
        requesterName: userProfile.name,
        requesterEmail: userProfile.email,
        requesterPhone: userProfile.phone,
        requesterAddress: userProfile.address,
        requesterCoordinates: userProfile.coordinates,
        status: REQUEST_STATUS.PENDING,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...requestData
      };

      const docRef = await addDoc(collection(firestore, 'requests'), request);
      
      const donationRef = doc(firestore, 'donations', donationId);
      await updateDoc(donationRef, {
        totalRequests: increment(1)
      });
      
      toast.success('Request sent successfully!');
      return docRef.id;
    } catch (error) {
      console.error('Create request error:', error);
      toast.error('Error sending request');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateDonationStatus = async (donationId, status) => {
    try {
      const donationRef = doc(firestore, 'donations', donationId);
      await updateDoc(donationRef, {
        status,
        updatedAt: serverTimestamp()
      });
      
      toast.success('Donation status updated');
    } catch (error) {
      console.error('Update donation status error:', error);
      toast.error('Error updating donation status');
      throw error;
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      const requestRef = doc(firestore, 'requests', requestId);
      await updateDoc(requestRef, {
        status,
        updatedAt: serverTimestamp()
      });
      
      toast.success('Request status updated');
    } catch (error) {
      console.error('Update request status error:', error);
      toast.error('Error updating request status');
      throw error;
    }
  };

  const deleteDonation = async (donationId) => {
    try {
      await deleteDoc(doc(firestore, 'donations', donationId));
      toast.success('Donation deleted successfully');
    } catch (error) {
      console.error('Delete donation error:', error);
      toast.error('Error deleting donation');
      throw error;
    }
  };

  const getUserDonations = async (userId = currentUser?.uid) => {
    if (!userId) return [];
    
    try {
      const q = query(
        collection(firestore, 'donations'),
        where('donorId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Get user donations error:', error);
      return [];
    }
  };

  const getUserRequests = async (userId = currentUser?.uid) => {
    if (!userId) return [];
    
    try {
      const q = query(
        collection(firestore, 'requests'),
        where('requesterId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Get user requests error:', error);
      return [];
    }
  };

  const getNearbyDonations = async (coordinates, radius = 10) => {
    try {
      const q = query(
        collection(firestore, 'donations'),
        where('status', '==', DONATION_STATUS.PENDING),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const allDonations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return allDonations.filter(donation => {
        if (!donation.donorCoordinates || !coordinates) return false;
        
        const distance = calculateDistance(
          coordinates.lat,
          coordinates.lng,
          donation.donorCoordinates.lat,
          donation.donorCoordinates.lng
        );
        
        return distance <= radius;
      });
    } catch (error) {
      console.error('Get nearby donations error:', error);
      return [];
    }
  };

  const getPendingDonations = async (limitCount = 50) => {
    try {
      const q = query(
        collection(firestore, 'donations'),
        where('status', '==', DONATION_STATUS.PENDING),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.slice(0, limitCount).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Get pending donations error:', error);
      return [];
    }
  };


  const updateRequestWithDestination = async (requestId, status, destinationInfo, destinationType, quality, co2Saved, destinationUserId) => {
    if (!requestId || !destinationInfo) return;
    const requestRef = doc(firestore, 'requests', requestId);
    await updateDoc(requestRef, {
      status,
      destinationUserId: destinationUserId || null,
      destinationName: destinationInfo.name,
      destinationEmail: destinationInfo.email,
      destinationAddress: destinationInfo.address,
      destinationPhone: destinationInfo.phone || null,
      destinationType,
      quality,
      co2Saved: co2Saved || 0,
      destinationNotified: false,
      updatedAt: serverTimestamp()
    });
  };

  const collectDonation = async ({
    donationId,
    requestId,
    file,
    quality,
    destinationType, 
    destinationUserId,
    notes,
    destinationInfo 
  }) => {
    if (!currentUser) {
      toast.error('You must be logged in to collect donations');
      return;
    }

    try {
      setLoading(true);

      let photoUrl = null;

      const donationDataForCO2 = donations.find(d => d.id === donationId) || await getDoc(doc(firestore, 'donations', donationId)).then(d => d.data());
      const co2Saved = quality === 'good' && donationDataForCO2 ? calculateCO2Saved(donationDataForCO2) : 0;

      const collectionDoc = {
        donationId,
        volunteerId: currentUser.uid,
        volunteerName: userProfile?.name,
        volunteerEmail: userProfile?.email,
        photoUrl,
        quality,
        destinationType: destinationType || null,
        destinationUserId: destinationUserId || null,
        co2Saved,
        notes: notes || null,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(firestore, 'collections'), collectionDoc);

      const donationRef = doc(firestore, 'donations', donationId);
      await updateDoc(donationRef, {
        status: quality === 'good' ? DONATION_STATUS.COMPLETED : DONATION_STATUS.REJECTED,
        co2Saved: quality === 'good' ? co2Saved : 0,
        updatedAt: serverTimestamp()
      });

      if (quality === 'good' && donationDataForCO2?.donorId) {
        const donorRef = doc(firestore, 'users', donationDataForCO2.donorId);
        await updateDoc(donorRef, { tokens: increment(10) });
      }

      if (requestId && destinationUserId && destinationInfo) {
        await updateRequestWithDestination(
          requestId,
          'collected', 
          destinationInfo,
          destinationType,
          quality,
          co2Saved,
          destinationUserId
        );

        // Notify the selected destination (e.g., food bank) about the incoming donation
        try {
          await addDoc(collection(firestore, 'notifications'), {
            userId: destinationUserId,
            type: 'system_message',
            title: 'New Incoming Donation',
            message: `${userProfile?.name || 'A volunteer'} assigned a ${quality === 'bad' ? 'non-edible' : 'food'} donation (${donationDataForCO2?.foodType || 'Food'}) to your organization`,
            data: {
              donationId,
              requestId,
              quantity: donationDataForCO2?.quantity || null,
              unit: donationDataForCO2?.unit || null,
              quality,
              volunteerName: userProfile?.name || null,
              destinationName: destinationInfo?.name || null
            },
            createdAt: serverTimestamp(),
            isRead: false,
            readAt: null
          });
          // Mark request as notified for UI badges
          await updateDoc(doc(firestore, 'requests', requestId), {
            destinationNotified: true,
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.error('Failed to create destination notification:', e);
        }
      }

      toast.success('Collection recorded successfully');
    } catch (error) {
      console.error('Collect donation error:', error);
      toast.error('Error recording collection');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getPlatformStats = async () => {
    try {
      const donationsQuery = query(
        collection(firestore, 'donations'),
        where('status', '==', DONATION_STATUS.COMPLETED)
      );
      const donationSnapshot = await getDocs(donationsQuery);
      const completedDonations = donationSnapshot.docs.map(doc => doc.data());

      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const totalUsers = usersSnapshot.size;
      const donorRoles = ['restaurant', 'individual', 'mess'];
      const receiverRoles = ['foodbank', 'nursery', 'poultry'];
      const volunteerRoles = ['volunteer'];

      let totalDonors = 0;
      let totalReceivers = 0;
      let totalVolunteers = 0;
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (donorRoles.includes(user.role)) totalDonors++;
        if (receiverRoles.includes(user.role)) totalReceivers++;
        if (volunteerRoles.includes(user.role)) totalVolunteers++;
      });

      let totalCO2Saved = 0;
      let totalMealsDonated = 0;
      let totalKgDonated = 0;

      completedDonations.forEach(donation => {
        totalCO2Saved += donation.co2Saved || calculateCO2Saved(donation);
        if (donation.unit === 'meals') {
          totalMealsDonated += donation.quantity || 0;
        } else if (['kg', 'liters', 'packs'].includes(donation.unit)) {
          totalKgDonated += donation.quantity || 0;
        }
      });

      return {
        totalCompletedDonations: completedDonations.length,
        totalCO2Saved: Math.round(totalCO2Saved),
        totalMealsDonated,
        totalKgDonated,
        totalUsers,
        totalDonors,
        totalReceivers,
        totalVolunteers,
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      toast.error('Could not load platform statistics.');
      return null;
    }
  };


  const getUserStats = async (userId) => {
    if (!userId) return null;

    try {
      const donationsQuery = query(
        collection(firestore, 'donations'),
        where('donorId', '==', userId),
        where('status', '==', DONATION_STATUS.COMPLETED)
      );
      const donationSnapshot = await getDocs(donationsQuery);
      const userDonations = donationSnapshot.docs.map(doc => doc.data());

      const userDoc = await getDoc(doc(firestore, 'users', userId));
      const userTokens = userDoc.exists() ? userDoc.data().tokens || 0 : 0;

      let userCo2Saved = 0;
      let userMealsDonated = 0;
      let userKgDonated = 0;
      userDonations.forEach(donation => {
        userCo2Saved += donation.co2Saved || calculateCO2Saved(donation);
        if (donation.unit === 'meals') {
          userMealsDonated += donation.quantity || 0;
        } else if (['kg', 'liters', 'packs'].includes(donation.unit)) {
          userKgDonated += donation.quantity || 0;
        }
      });

      // Deliveries completed by volunteer: authoritative source is 'collections'
      const deliveriesQuery = query(
        collection(firestore, 'collections'),
        where('volunteerId', '==', userId)
      );
      const deliveriesSnapshot = await getDocs(deliveriesQuery);
      const collectionsDocs = deliveriesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Volunteer CO2: prefer stored co2Saved, fallback to donation calculation
      const volunteerCo2 = Math.round(await (async () => {
        let sum = 0;
        await Promise.all(collectionsDocs.map(async (c) => {
          const v = Number(c.co2Saved) || 0;
          if (v > 0) { sum += v; return; }
          const donationId = c.donationId;
          if (donationId) {
            try {
              const dSnap = await getDoc(doc(firestore, 'donations', donationId));
              if (dSnap.exists()) {
                sum += calculateCO2Saved(dSnap.data());
              }
            } catch (_) { /* ignore */ }
          }
        }));
        return sum;
      })());

      // Receiver metrics: deliveries received and CO2 impact via deliveries
      const receiverReqSnap = await getDocs(query(
        collection(firestore, 'requests'),
        where('destinationUserId', '==', userId)
      ));
      const receiverRequests = receiverReqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const validStatuses = new Set(['accepted', 'collected', 'fulfilled']);
      const receiverRelevant = receiverRequests.filter(r => validStatuses.has((r.status || '').toLowerCase()));
      const deliveriesReceived = receiverRelevant.length;
      const receiverCo2 = Math.round(await (async () => {
        let sum = 0;
        await Promise.all(receiverRelevant.map(async (r) => {
          const v = Number(r.co2Saved) || 0;
          if (v > 0) { sum += v; return; }
          const donationId = r.donationId;
          if (donationId) {
            try {
              const dSnap = await getDoc(doc(firestore, 'donations', donationId));
              if (dSnap.exists()) {
                sum += calculateCO2Saved(dSnap.data());
              }
            } catch (_) { /* ignore */ }
          }
        }));
        return sum;
      })());

      return {
        donationsMade: userDonations.length,
        co2Saved: Math.round(userCo2Saved),
        mealsDonated: userMealsDonated,
        kgDonated: userKgDonated,
        tokens: userTokens,
        deliveriesCompleted: deliveriesSnapshot.size,
        deliveriesReceived,
        receiverCo2,
        volunteerCo2
      };
    } catch (error) {
      console.error(`Error getting stats for user ${userId}:`, error);
      toast.error('Could not load your personal statistics.');
      return null;
    }
  };

  const getTopCuisines = async () => {
    try {
      const donationsQuery = query(
        collection(firestore, 'donations'),
        where('status', '==', DONATION_STATUS.COMPLETED)
      );
      const donationSnapshot = await getDocs(donationsQuery);

      const cuisineCounts = {};
      donationSnapshot.forEach(doc => {
        const cuisine = doc.data().cuisine;
        if (cuisine && cuisine !== 'Other') {
          cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
        }
      });

      const sortedCuisines = Object.entries(cuisineCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      const labels = sortedCuisines.map(([cuisine]) => cuisine);
      const data = sortedCuisines.map(([, count]) => count);

      return { labels, data };
    } catch (error) {
      console.error('Error getting top cuisines:', error);
      return null;
    }
  };

  const getDonationTrends = async () => {
    try {
      const donationsQuery = query(
        collection(firestore, 'donations'),
        where('status', '==', DONATION_STATUS.COMPLETED)
      );
      const donationSnapshot = await getDocs(donationsQuery);

      const monthlyData = {};

      donationSnapshot.docs.forEach(doc => {
        const donation = doc.data();
        if (!donation.createdAt?.toDate) return;

        const date = donation.createdAt.toDate();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { count: 0 };
        }
        monthlyData[monthKey].count += 1;
      });

      const sortedMonths = Object.keys(monthlyData).sort();
      
      const labels = sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-');
        return new Date(year, parseInt(month, 10) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
      });
      
      const donationCounts = sortedMonths.map(monthKey => monthlyData[monthKey].count);

      return { labels, donationCounts };
    } catch (error) {
      console.error('Error getting donation trends:', error);
      toast.error('Could not load donation trends.');
      return null;
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setDonations([]);
      setRequests([]);
      setVolunteerRequests([]);
      setDeliveries([]);
      setAvailableRequests([]);
      return;
    }

    const donationsUnsubscribe = onSnapshot(
      query(
        collection(firestore, 'donations'),
        where('donorId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const donationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDonations(donationsData);
      }
    );

    const requestsUnsubscribe = onSnapshot(
      query(
        collection(firestore, 'requests'),
        where('requesterId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRequests(requestsData);
      }
    );

    const volunteerRequestsUnsubscribe = onSnapshot(
      query(
        collection(firestore, 'requests'),
        where('volunteerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const volunteerRequestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVolunteerRequests(volunteerRequestsData);
      }
    );

    const availableDonationsUnsubscribe = onSnapshot(
      query(
        collection(firestore, 'donations'),
        where('status', '==', DONATION_STATUS.PENDING),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const availableDonationsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(d => d.deliveryMethod === 'volunteer' && !d.volunteerId);
        setAvailableRequests(availableDonationsData);
      }
    );

    let deliveriesUnsubscribe = () => {};
    let collectionsUnsubscribe = () => {};
    if (['foodbank', 'nursery', 'poultry'].includes(userProfile?.role)) {
      deliveriesUnsubscribe = onSnapshot(
        query(
          collection(firestore, 'requests'),
          where('destinationUserId', '==', currentUser.uid),
          where('status', 'in', ['accepted', 'collected', 'fulfilled'])
        ),
        (snapshot) => {
          const deliveriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setDeliveries(deliveriesData);
        }
      );
    }

    if (userProfile?.role === 'volunteer') {
      collectionsUnsubscribe = onSnapshot(
        query(
          collection(firestore, 'collections'),
          where('volunteerId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        ),
        (snapshot) => {
          const collectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCollections(collectionsData);
        }
      );
    }

    return () => {
      donationsUnsubscribe();
      requestsUnsubscribe();
      volunteerRequestsUnsubscribe();
      availableDonationsUnsubscribe();
      deliveriesUnsubscribe();
      collectionsUnsubscribe();
    };
  }, [currentUser, userProfile?.role, DONATION_STATUS.PENDING]);

  const value = {
    donations,
    requests,
    volunteerRequests,
    deliveries,
    availableRequests, 
    collections,
    loading,
    createDonation,
    createRequest,
    updateDonationStatus,
    updateRequestStatus,
    acceptIncomingDelivery,
    deleteDonation,
    getUserDonations,
    getUserRequests,
    getNearbyDonations,
    getPendingDonations,
    collectDonation,
    getRequestsForDonation,
    getAllPendingRequests,
    acceptRequestAsVolunteer,
    getUserStats,
    getPlatformStats,
    getTopCuisines,
    getDonationTrends,
    getUsersByRole,
    DONATION_STATUS,
    REQUEST_STATUS,
    createSelfDeliveryAssignment,
    getDonationById
  };

  return (
    <DonationContext.Provider value={value}>
      {children}
    </DonationContext.Provider>
  );
}; 