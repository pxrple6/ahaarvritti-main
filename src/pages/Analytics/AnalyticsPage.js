import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDonation } from '../../contexts/DonationContext';
import { useAuth } from '../../contexts/AuthContext';

// Color palette for donation/request statuses used in charts
const statusColors = {
  pending: 'rgba(234,179,8,0.8)',     // amber-400
  accepted: 'rgba(59,130,246,0.8)',   // blue-500
  rejected: 'rgba(239,68,68,0.8)',    // red-500
  completed: 'rgba(34,197,94,0.8)',   // green-500
  fulfilled: 'rgba(34,197,94,0.8)',   // green-500 (alias)
  expired: 'rgba(148,163,184,0.8)',   // slate-400
  unknown: 'rgba(148,163,184,0.8)',   // slate-400
  other: 'rgba(148,163,184,0.8)'      // fallback
};

const ProgressBar = ({ value = 0, max = 100, color = 'bg-green-600' }) => {
  const pct = Math.max(0, Math.min(100, Math.round((value / (max || 1)) * 100)));
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div className={`${color} h-3`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const Badge = ({ text }) => (
  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
    {text}
  </span>
);

const StatCard = ({ title, value, unit }) => (
  <div className="bg-gray-50 p-4 rounded-lg text-center shadow-sm border border-gray-200">
    <p className="text-sm text-gray-500 font-medium">{title}</p>
    <p className="text-3xl font-bold text-gray-900">
      {value}
      {unit && <span className="text-xl ml-1">{unit}</span>}
    </p>
  </div>
);

const ImpactFact = ({ icon, text }) => (
  <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
    <span className="text-green-600 text-xl mr-3">{icon}</span>
    <p className="text-sm text-green-800">{text}</p>
  </div>
);

const UserStats = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const { getUserStats } = useDonation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userProfile?.uid) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const userStatsData = await getUserStats(userProfile.uid);
        setStats(userStatsData);
      } catch (e) {
        console.error("Failed to fetch user stats:", e);
        setError(t('analyticsPage.errorLoading'));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [getUserStats, userProfile, t]);

  const renderContent = () => {
    if (loading) {
      return <p className="text-gray-600">{t('analyticsPage.loadingPersonal')}</p>;
    }

    if (error) {
      return <p className="text-red-600">{error}</p>;
    }

    if (!stats) {
      return <p className="text-gray-600">{t('analyticsPage.noActivityYet')}</p>;
    }

    const isDonor = ['restaurant', 'individual', 'mess'].includes(userProfile?.role);
    const isVolunteer = userProfile?.role === 'volunteer';
    const isReceiver = ['foodbank', 'nursery', 'poultry'].includes(userProfile?.role);

    const hasStatsToShow =
      (isDonor && (stats.donationsMade > 0 || stats.co2Saved > 0)) ||
      (isVolunteer && stats.deliveriesCompleted > 0) ||
      (isReceiver && (stats.deliveriesReceived > 0 || stats.receiverCo2 > 0));

    if (!hasStatsToShow) {
      const donorRoles = ['restaurant', 'individual', 'mess'];
      const role = userProfile?.role;
      const key = donorRoles.includes(role)
        ? 'analyticsPage.noActivityYetDonor'
        : role === 'foodbank' || role === 'nursery' || role === 'poultry'
          ? 'analyticsPage.noActivityYetReceiver'
          : role === 'volunteer'
            ? 'analyticsPage.noActivityYetVolunteer'
            : 'analyticsPage.noActivityYet';
      return <p className="text-gray-600">{t(key)}</p>;
    }

    const co2MilesEquivalent = Math.round((stats.co2Saved * 1000) / 404);
    const mealsForFamily = Math.floor(stats.mealsDonated / 12);

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isDonor && (
            <>
              <StatCard title="Donations Made" value={stats.donationsMade} />
              <StatCard title="Meals Provided" value={stats.mealsDonated} />
              <StatCard title="CO₂ Saved" value={stats.co2Saved} unit="kg" />
              <StatCard title="Reward Tokens" value={stats.tokens} />
            </>
          )}
          {isVolunteer && (
            <>
              <StatCard title="Deliveries Completed" value={stats.deliveriesCompleted} />
              <StatCard title="CO₂ Saved" value={stats.volunteerCo2 || 0} unit="kg" />
            </>
          )}
          {isReceiver && (
            <>
              <StatCard title="Deliveries Received" value={stats.deliveriesReceived} />
              <StatCard title="CO₂ Saved" value={stats.receiverCo2} unit="kg" />
            </>
          )}
        </div>
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Impact in Perspective</h3>
          {isDonor && stats.co2Saved > 10 && <ImpactFact icon="🚗" text={`The ${stats.co2Saved} kg of CO₂ you've saved is equivalent to avoiding ${co2MilesEquivalent} miles of driving in an average car!`} />}
          {isDonor && stats.mealsDonated > 20 && <ImpactFact icon="👨‍👩‍👧‍👦" text={`The ${stats.mealsDonated} meals you've donated could have fed a family of four for ${mealsForFamily > 0 ? mealsForFamily : 'several'} days.`} />}
          {isVolunteer && stats.deliveriesCompleted > 5 && <ImpactFact icon="🚚" text={`With your ${stats.deliveriesCompleted} deliveries, you've been a crucial link in our logistics chain, ensuring food reaches those in need.`} />}
          {userProfile.role === 'restaurant' && isDonor && <ImpactFact icon="⭐" text="As a restaurant partner, you are a pillar of our community, turning potential waste into vital meals." />}
          {stats.tokens > 50 && <ImpactFact icon="🏆" text={`With ${stats.tokens} tokens, you are one of our top contributors! Thank you for your continued impact.`} />}
          {isReceiver && stats.deliveriesReceived > 0 && (
            <ImpactFact icon="🏠" text={t('analyticsPage.receiverImpact.receivedDeliveries', { count: stats.deliveriesReceived })} />
          )}
          {isReceiver && stats.receiverCo2 > 10 && (
            <ImpactFact icon="🌍" text={t('analyticsPage.receiverImpact.co2Miles', { miles: Math.round((stats.receiverCo2 * 1000) / 404) })} />
          )}
          {isReceiver && stats.deliveriesReceived > 10 && (
            <ImpactFact icon="💚" text={t('analyticsPage.receiverImpact.thankYou')} />
          )}
        </div>
      </>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('analyticsPage.personalImpact')}</h2>
      {renderContent()}
    </div>
  );
};

const AnalyticsPage = () => {
  const { t } = useTranslation();
  const dashboardRef = useRef();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { getPlatformStats, donations, collections, deliveries, requests, getUserStats, getDonationById } = useDonation();
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  // Widgets state
  const [userStatusData, setUserStatusData] = useState(null); // used for badges
  const [volunteerSeries, setVolunteerSeries] = useState(null); // retains CO2 fallback
  // Personal impact range selector
  const defaultRange = (userProfile?.role === 'volunteer') ? 90 : 30;
  const [rangeDays, setRangeDays] = useState(defaultRange);

  // Ensure volunteers default to 90 days once profile loads
  useEffect(() => {
    if (userProfile?.role === 'volunteer' && rangeDays < 90) {
      setRangeDays(90);
    }
  }, [userProfile?.role]);

  // Helpers mirrored from Dashboard for time-series personal impact
  const calculateCO2SavedLocal = (donation) => {
    if (!donation || donation.quantity == null || !donation.unit) return 0;
    const quantity = Number(donation.quantity) || 0;
    if (donation.unit === 'meals') return quantity * 1.3;
    if ([ 'kg', 'liters', 'packs' ].includes(donation.unit)) return quantity * 2.5;
    return 0;
  };

  const toJSDate = (ts) => {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if (typeof ts?.toDate === 'function') {
      try { return ts.toDate(); } catch { /* fallthrough */ }
    }
    if (typeof ts === 'object' && (typeof ts.seconds === 'number' || typeof ts._seconds === 'number')) {
      const secs = typeof ts.seconds === 'number' ? ts.seconds : ts._seconds;
      return new Date(secs * 1000);
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  const dateKey = (d) => {
    const yr = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${yr}-${m}-${day}`;
  };

  const buildLastNDays = (n = 30) => {
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(dateKey(d));
    }
    return days;
  };

  const role = userProfile?.role;
  const lastDays = buildLastNDays(rangeDays);
  const co2ByDay = Object.fromEntries(lastDays.map(k => [k, 0]));
  const countByDay = Object.fromEntries(lastDays.map(k => [k, 0]));

  if (role === 'restaurant' || role === 'individual' || role === 'mess') {
    const completedDonationItems = (donations || []).filter(d => (d.status || '').toLowerCase() === 'completed');
    completedDonationItems.forEach(d => {
      const dDate = toJSDate(d.completedAt || d.updatedAt || d.createdAt);
      if (!dDate) return;
      const key = dateKey(new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate()));
      if (!(key in co2ByDay)) return;
      const co2 = Number(d.co2Saved) || calculateCO2SavedLocal(d) || 0;
      co2ByDay[key] += co2;
      countByDay[key] += 1;
    });
  } else if (role === 'volunteer') {
    // Base counts (will be overridden by async fallback effect if needed)
    const volunteerCollections = (Array.isArray(collections) ? collections : []).filter(c => c.volunteerId === userProfile?.uid);
    volunteerCollections.forEach(c => {
      const dDate = toJSDate(c.completedAt || c.updatedAt || c.createdAt);
      if (!dDate) return;
      const key = dateKey(new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate()));
      if (!(key in co2ByDay)) return;
      const co2 = Number(c.co2Saved) || 0;
      co2ByDay[key] += co2;
      countByDay[key] += 1;
    });
  } else if (['foodbank', 'nursery', 'poultry'].includes(role)) {
    const receiverDeliveries = (Array.isArray(deliveries) ? deliveries : []).filter(r => r.destinationUserId === userProfile?.uid);
    receiverDeliveries.forEach(r => {
      const dDate = toJSDate(r.receivedAt || r.completedAt || r.updatedAt || r.createdAt);
      if (!dDate) return;
      const key = dateKey(new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate()));
      if (!(key in co2ByDay)) return;
      const co2 = Number(r.co2Saved) || 0;
      co2ByDay[key] += co2;
      countByDay[key] += 1;
    });
  }

  // Base series from direct aggregation
  const baseCo2Series = lastDays.map(k => Math.round(co2ByDay[k]));
  const baseCountSeries = lastDays.map(k => countByDay[k]);

  // If volunteer and we have a fallback series, only use it if it has signal
  const fallbackHasSignal = (arr) => Array.isArray(arr) && arr.some(v => Number(v) > 0);
  const co2Series = (role === 'volunteer' && volunteerSeries?.co2Series)
    ? (fallbackHasSignal(volunteerSeries.co2Series) ? volunteerSeries.co2Series : baseCo2Series)
    : baseCo2Series;
  const countSeries = (role === 'volunteer' && volunteerSeries?.countSeries)
    ? (fallbackHasSignal(volunteerSeries.countSeries) ? volunteerSeries.countSeries : baseCountSeries)
    : baseCountSeries;

  // Role flags
  const isDonor = role === 'restaurant' || role === 'individual' || role === 'mess';
  const isVolunteer = role === 'volunteer';
  const isReceiver = role === 'foodbank' || role === 'nursery' || role === 'poultry';

  // Totals over a time window
  const totalsByWindow = (days = 30) => {
    const len = Math.min(days, lastDays.length);
    const sliceCo2 = co2Series.slice(-len);
    const sliceCount = countSeries.slice(-len);
    const totalCo2 = Math.round(sliceCo2.reduce((a, b) => a + (Number(b) || 0), 0));
    const totalCount = sliceCount.reduce((a, b) => a + (Number(b) || 0), 0);
    let meals = 0;
    if (isDonor) {
      const now = new Date(); now.setHours(0,0,0,0);
      const cutoff = new Date(now); cutoff.setDate(now.getDate() - (days - 1));
      meals = (donations || []).filter(d => {
        const dDate = toJSDate(d.completedAt || d.updatedAt || d.createdAt);
        return dDate && dDate >= cutoff && (d.status || '').toLowerCase() === 'completed';
      }).reduce((sum, d) => sum + (Number(d.mealsDonated) || 0), 0);
    }
    return { co2: totalCo2, count: totalCount, meals };
  };

  // CO2 milestone based on userStats
  const nextMilestone = () => {
    const co2 = isVolunteer ? (userStats?.volunteerCo2 || 0)
      : isReceiver ? (userStats?.receiverCo2 || 0)
      : (userStats?.co2Saved || 0);
    const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    const next = milestones.find(m => co2 < m) || (Math.ceil(co2 / 1000) * 1000 + 1000);
    return { current: Math.round(co2), next };
  };

  // Weekly target progress
  const weeklyTarget = () => {
    const target = isVolunteer ? 5 : isDonor ? 3 : 3;
    const days = 7;
    const achieved = totalsByWindow(days).count;
    return { target, achieved };
  };

  // Receiver fulfillment rate for last 30 days
  const receiverFulfillment = () => {
    if (!isReceiver) return { total: 0, fulfilled: 0 };
    const now = new Date(); now.setHours(0,0,0,0);
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 29);
    const myRequests = (Array.isArray(requests) ? requests : []).filter(r => r.destinationUserId === userProfile?.uid);
    const within = myRequests.filter(r => {
      const d = toJSDate(r.updatedAt || r.createdAt);
      return d && d >= cutoff;
    });
    const fulfilled = within.filter(r => {
      const s = (r.status || '').toLowerCase();
      return s === 'fulfilled' || s === 'completed';
    }).length;
    return { total: within.length, fulfilled };
  };

  // Recent activity items (last 10)
  const recentActivity = () => {
    const items = [];
    if (isDonor) {
      (donations || []).forEach(d => {
        const date = toJSDate(d.completedAt || d.updatedAt || d.createdAt);
        items.push({
          id: d.id || d._id || `${d.donationId || ''}-${date?.getTime() || Math.random()}`,
          title: `Donation ${(d.status || '').toLowerCase()}`,
          subtitle: d.foodType ? String(d.foodType) : 'Donation',
          meta: `${Number(d.mealsDonated) || 0} meals · ${Number(d.co2Saved) || calculateCO2SavedLocal(d)} kg CO₂`,
          date
        });
      });
    } else if (isVolunteer) {
      (collections || []).filter(c => c.volunteerId === userProfile?.uid).forEach(c => {
        const date = toJSDate(c.completedAt || c.updatedAt || c.createdAt);
        items.push({
          id: c.id || c._id || `${c.collectionId || ''}-${date?.getTime() || Math.random()}`,
          title: `Delivery ${(c.status || '').toLowerCase()}`,
          subtitle: c.donationId ? `Donation ${c.donationId}` : 'Delivery',
          meta: `${Number(c.co2Saved) || 0} kg CO₂`,
          date
        });
      });
    } else if (isReceiver) {
      (deliveries || []).filter(r => r.destinationUserId === userProfile?.uid).forEach(r => {
        const date = toJSDate(r.receivedAt || r.completedAt || r.updatedAt || r.createdAt);
        items.push({
          id: r.id || r._id || `${r.deliveryId || ''}-${date?.getTime() || Math.random()}`,
          title: `Delivery ${(r.status || '').toLowerCase()}`,
          subtitle: r.notes || 'Received',
          meta: `${Number(r.co2Saved) || 0} kg CO₂`,
          date
        });
      });
    }
    return items
      .filter(it => !!it.date)
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);
  };

  // Simple badges
  const badges = () => {
    const list = [];
    if (!userStats) return list;
    const totalCo2 = isVolunteer ? (userStats.volunteerCo2 || 0)
      : isReceiver ? (userStats.receiverCo2 || 0)
      : (userStats.co2Saved || 0);
    const totalCount = isVolunteer ? (userStats.deliveriesCompleted || 0)
      : isReceiver ? (userStats.deliveriesReceived || 0)
      : (userStats.donationsMade || 0);
    if (totalCount >= 1) list.push('Getting Started');
    if (totalCount >= 10) list.push('Community Helper');
    if (totalCo2 >= 100) list.push('100 kg CO₂ Saved');
    if (totalCo2 >= 500) list.push('500 kg CO₂ Saved');
    return list;
  };

  // Helper getters for date filtering
  const inLastNDays = (date, n) => {
    const d = toJSDate(date);
    if (!d) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - (n - 1));
    return d >= cutoff;
  };

  // Async fallback for volunteer CO2: compute from donation if collection.co2Saved missing
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (role !== 'volunteer') { return; }
      const days = buildLastNDays(rangeDays);
      const co2Map = Object.fromEntries(days.map(k => [k, 0]));
      const countMap = Object.fromEntries(days.map(k => [k, 0]));
      const volunteerCollections = (Array.isArray(collections) ? collections : []).filter(c => c.volunteerId === userProfile?.uid);
      const withinRange = volunteerCollections.filter(c => {
        const dDate = toJSDate(c.completedAt || c.updatedAt || c.createdAt);
        if (!dDate) return false;
        const key = dateKey(new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate()));
        return key in co2Map;
      });
      // Prepare fetches for missing co2Saved
      const results = await Promise.all(withinRange.map(async c => {
        const dDate = toJSDate(c.completedAt || c.updatedAt || c.createdAt);
        const key = dateKey(new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate()));
        let co2 = Number(c.co2Saved) || 0;
        if (!co2 && c.donationId) {
          const donation = await getDonationById(c.donationId);
          if (donation) co2 = Number(donation.co2Saved) || calculateCO2SavedLocal(donation) || 0;
        }
        return { key, co2 };
      }));
      results.forEach(({ key, co2 }) => {
        if (!(key in co2Map)) return;
        co2Map[key] += co2 || 0;
      });
      withinRange.forEach(c => {
        const dDate = toJSDate(c.completedAt || c.updatedAt || c.createdAt);
        const key = dateKey(new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate()));
        if (key in countMap) countMap[key] += 1;
      });
      if (!cancelled) {
        setVolunteerSeries({
          co2Series: days.map(k => Math.round(co2Map[k])),
          countSeries: days.map(k => countMap[k])
        });
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { cancelled = true; };
  }, [role, collections, rangeDays, userProfile?.uid]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const platformStats = await getPlatformStats();
      if (platformStats) setStats(platformStats);
      setLoading(false);
    };
    fetchAllData();
  }, [getPlatformStats]);

  // Load user stats once for widgets
  const [userStats, setUserStats] = useState(null);
  useEffect(() => {
    const load = async () => {
      if (!userProfile?.uid) return setUserStats(null);
      try { setUserStats(await getUserStats(userProfile.uid)); } catch { setUserStats(null); }
    };
    load();
  }, [getUserStats, userProfile]);

  // Build role-specific counts for badges
  useEffect(() => {
    // Donor (restaurant/individual/mess): status breakdown of own donations
    const donorRoles = ['restaurant', 'individual', 'mess'];
    if (donorRoles.includes(userProfile?.role)) {
      const counts = donations?.reduce((acc, d) => {
        const k = (d.status || 'unknown').toLowerCase();
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {}) || {};
      setUserStatusData(counts);

      // omit charts
    } else {
      setUserStatusData(null);
    }

    // Receiver trend removed
  }, [userProfile?.role, donations]);

  const downloadPdf = () => {
    const element = dashboardRef.current;
    if (!element) return;
    window.html2pdf()
      .set({
        margin: [5, 5, 5, 5],
        filename: 'dashboard-analytics.pdf',
        image: { type: 'png', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all'] }
      })
      .from(element)
      .save()
      .then(() => { setIsDownloading(false); setIsExporting(false); });
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setIsExporting(true);
    if (window.html2pdf) {
      // Allow layout to reflow at larger chart heights before capture
      setTimeout(downloadPdf, 200);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => setTimeout(downloadPdf, 200);
      script.onerror = () => {
        setIsDownloading(false);
        setIsExporting(false);
        alert('Could not load PDF library.');
      };
      document.body.appendChild(script);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('analyticsPage.title')}</h1>
        <button onClick={handleDownload} className="btn-primary px-4 py-2" disabled={isDownloading || loading}>
          {isDownloading ? t('analyticsPage.download.generating') : t('analyticsPage.download.default')}
        </button>
      </div>

      <div ref={dashboardRef} className={
          `bg-white rounded-lg ${isExporting ? 'shadow-none border-0 p-4 space-y-6' : 'shadow-sm border border-gray-200 p-6 space-y-10'}`
        }>
        {/* Platform Overview */}
        {stats && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">{t('analyticsPage.platformOverview') || 'Platform Overview'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title={t('analyticsPage.totalMeals') || 'Total Meals Donated'} value={stats.totalMealsDonated || 0} />
              <StatCard title={t('analyticsPage.totalCO2') || 'Total CO₂ Saved'} value={stats.totalCO2Saved || 0} unit="kg" />
              <StatCard title={t('analyticsPage.totalDonors') || 'Donors'} value={stats.totalDonors || 0} />
              <StatCard title={t('analyticsPage.totalVolunteers') || 'Volunteers'} value={stats.totalVolunteers || 0} />
            </div>

            {/* charts removed */}
          </div>
        )}
        
        {/* Personal Stats Section */}
        <UserStats />

        {/* Widgets: Time-window totals */}
        <div>
          <div className="flex items-center justify-end mb-2">
            <div className="inline-flex rounded-md shadow-sm overflow-hidden border">
              {[7,30,90,'All'].map(opt => (
                <button
                  key={String(opt)}
                  onClick={() => setRangeDays(opt === 'All' ? 3650 : opt)}
                  className={`px-3 py-1 text-sm ${ (opt === 'All' ? rangeDays >= 3650 : rangeDays === opt) ? 'bg-green-600 text-white' : 'bg-white text-gray-700' }`}
                >{String(opt)}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title={isReceiver ? 'Deliveries Received' : isVolunteer ? 'Deliveries Completed' : 'Donations'} value={totalsByWindow(rangeDays).count} />
            <StatCard title="CO₂ Saved" value={totalsByWindow(rangeDays).co2 || 0} unit="kg" />
            {isDonor && <StatCard title="Meals Donated" value={totalsByWindow(rangeDays).meals || 0} />}
          </div>
        </div>

        {/* Widgets: CO2 milestone progress */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">CO₂ Milestone</h3>
          {(() => { const m = nextMilestone(); return (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600"><span>{m.current} kg</span><span>{m.next} kg</span></div>
              <ProgressBar value={m.current} max={m.next} />
            </div>
          ); })()}
        </div>

        {/* Widgets: Weekly target progress */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Weekly Target</h3>
          {(() => { const w = weeklyTarget(); return (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600"><span>This week</span><span>{w.achieved}/{w.target}</span></div>
              <ProgressBar value={w.achieved} max={w.target} color="bg-blue-600" />
            </div>
          ); })()}
        </div>

        {/* Widgets: Receiver fulfillment rate */}
        {isReceiver && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Fulfillment (30 days)</h3>
            {(() => { const r = receiverFulfillment(); const pct = r?.total ? Math.round((r.fulfilled/r.total)*100) : 0; return (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600"><span>{r?.fulfilled || 0} fulfilled</span><span>{pct}%</span></div>
                <ProgressBar value={r?.fulfilled || 0} max={r?.total || 1} color="bg-amber-600" />
              </div>
            ); })()}
          </div>
        )}

        {/* Widgets: Recent activity list */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h3>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {recentActivity().map(item => (
              <li key={item.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-700">{item.meta}</p>
                  <p className="text-xs text-gray-400">{item.date ? item.date.toLocaleDateString() : ''}</p>
                </div>
              </li>
            ))}
            {recentActivity().length === 0 && (
              <li className="p-4 text-sm text-gray-500">No recent activity</li>
            )}
          </ul>
        </div>

        {/* Widgets: Badges */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Badges</h3>
          <div className="flex flex-wrap gap-2">
            {badges().map(b => <Badge key={b} text={b} />)}
            {badges().length === 0 && <span className="text-sm text-gray-500">No badges yet</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;