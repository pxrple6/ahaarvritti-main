import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDonation } from '../../contexts/DonationContext';

const GRAMS_CO2_PER_MILE = 404;
const MEALS_PER_DAY_PER_PERSON = 3;
const FAMILY_SIZE = 4;

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
        setError("We couldn't load your personal stats right now. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [getUserStats, userProfile]);

  const renderContent = () => {
    if (loading) {
      return <p className="text-gray-600">Loading your personal impact...</p>;
    }

    if (error) {
      return <p className="text-red-600">{error}</p>;
    }

    if (!stats) {
      return <p className="text-gray-600">You have no completed activity yet. Once you donate or deliver, your impact will appear here!</p>;
    }

    const isDonor = ['restaurant', 'individual', 'mess'].includes(userProfile?.role);
    const isVolunteer = userProfile?.role === 'volunteer';

    const hasStatsToShow =
      (isDonor && (stats.donationsMade > 0 || stats.co2Saved > 0)) ||
      (isVolunteer && stats.deliveriesCompleted > 0);

    if (!hasStatsToShow) {
      return <p className="text-gray-600">You have no completed activity yet. Once you donate or deliver, your impact will appear here!</p>;
    }

    // Equivalency calculations for "deep analysis"
    const co2MilesEquivalent = Math.round((stats.co2Saved * 1000) / GRAMS_CO2_PER_MILE);
    const mealsForFamily = Math.floor(stats.mealsDonated / (MEALS_PER_DAY_PER_PERSON * FAMILY_SIZE));

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isDonor && (
            <>
              <StatCard title="Donations Made" value={stats.donationsMade} />
              <StatCard title="Meals Provided" value={stats.mealsDonated} />
              <StatCard title="Food Donated" value={stats.kgDonated} unit="kg" />
              <StatCard title="CO₂ Saved" value={stats.co2Saved} unit="kg" />
            </>
          )}
          {isVolunteer && (
            <StatCard title="Deliveries Completed" value={stats.deliveriesCompleted} />
          )}
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Impact in Perspective</h3>
          {isDonor && stats.co2Saved > 10 && (
            <ImpactFact
              icon="🚗"
              text={`The ${stats.co2Saved} kg of CO₂ you've saved is equivalent to avoiding ${co2MilesEquivalent} miles of driving in an average car!`}
            />
          )}
          {isDonor && stats.mealsDonated > 20 && (
            <ImpactFact
              icon="👨‍👩‍👧‍👦"
              text={`The ${stats.mealsDonated} meals you've donated could have fed a family of four for ${mealsForFamily > 0 ? mealsForFamily : 'several'} days.`}
            />
          )}
          {isVolunteer && stats.deliveriesCompleted > 5 && (
            <ImpactFact
              icon="🚚"
              text={`With your ${stats.deliveriesCompleted} deliveries, you've been a crucial link in our logistics chain, ensuring food reaches those in need.`}
            />
          )}
          {userProfile.role === 'restaurant' && (
            <ImpactFact
              icon="⭐"
              text="As a restaurant partner, you are a pillar of our community, turning potential waste into vital meals."
            />
          )}
        </div>
      </>
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">My Personal Impact</h2>
      {renderContent()}
    </div>
  );
};

export default UserStats;