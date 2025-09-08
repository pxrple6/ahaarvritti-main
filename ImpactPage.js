import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDonation } from '../../contexts/DonationContext';
import { GlobeAltIcon, FireIcon, LightBulbIcon } from '@heroicons/react/outline';
import {
  CO2_EMISSIONS_FACTORS_KG,
  UNIT_TO_KG_CONVERSION,
  convertToKg,
  guessCategory,
} from '../../utils/impactUtils';

const CO2_EQUIVALENCIES = {
  car_km: 4.1, 
  phone_charges: 121633, 
  led_bulb_hours: 1428,
};

const ImpactPage = () => {
  const { userProfile } = useAuth();
  const { donations, DONATION_STATUS } = useDonation();

  const [foodCategory, setFoodCategory] = useState('Mixed Meal');
  const [quantity, setQuantity] = useState(10);
  const [unit, setUnit] = useState('meals');
  const [calculatedEmissions, setCalculatedEmissions] = useState(null);
  const [userTotalImpact, setUserTotalImpact] = useState(null);

  const calculateImpact = (category, qty, u) => {
    const kg = convertToKg(qty, u);
    const factor = CO2_EMISSIONS_FACTORS_KG[category] || 2;
    const emissions = (kg * factor);
    setCalculatedEmissions({
      emissions: emissions.toFixed(2),
      equivalents: {
        car_km: (emissions / CO2_EQUIVALENCIES.car_km).toFixed(1),
        phone_charges: Math.round(emissions * CO2_EQUIVALENCIES.phone_charges).toLocaleString(),
        led_bulb_hours: Math.round(emissions * CO2_EQUIVALENCIES.led_bulb_hours).toLocaleString(),
      }
    });
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    calculateImpact(foodCategory, quantity, unit);
  };

  useEffect(() => {
    if (userProfile && donations) {
      const completedDonations = donations.filter(d => d.status === DONATION_STATUS.COMPLETED && d.donorId === userProfile.uid);
      const totalCo2Saved = completedDonations.reduce((total, donation) => {
        const category = guessCategory(donation.foodType);
        const kg = convertToKg(donation.quantity, donation.unit);
        const factor = CO2_EMISSIONS_FACTORS_KG[category] || 2;
        return total + (kg * factor);
      }, 0);
      setUserTotalImpact(totalCo2Saved.toFixed(2));
    }
  }, [donations, userProfile, DONATION_STATUS]);

  useEffect(() => {
    calculateImpact(foodCategory, quantity, unit);
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <GlobeAltIcon className="mx-auto h-12 w-12 text-green-500" />
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Your Environmental Impact</h1>
        <p className="mt-2 text-lg text-gray-600">Understand how donating food helps the planet by reducing CO₂ emissions.</p>
      </div>

      {userProfile && userTotalImpact !== null && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Your Lifetime Contribution</h2>
          <div className="mt-4 text-center bg-green-50 p-8 rounded-lg">
            <p className="text-gray-600">You have saved an estimated</p>
            <p className="text-5xl font-bold text-green-600 my-2">{userTotalImpact} kg</p>
            <p className="text-gray-600">of CO₂ emissions by donating food. Thank you!</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Impact Calculator</h2>
        <p className="text-sm text-gray-600 mb-6">Select a food type and quantity to see the potential CO₂ savings. This helps visualize the impact of even a single donation.</p>
        <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700">Food Category</label>
            <select className="input-field w-full" value={foodCategory} onChange={e => setFoodCategory(e.target.value)}>{Object.keys(CO2_EMISSIONS_FACTORS_KG).map(category => (<option key={category} value={category}>{category}</option>))}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit</label>
            <select className="input-field w-full" value={unit} onChange={e => setUnit(e.target.value)}>{Object.keys(UNIT_TO_KG_CONVERSION).map(u => (<option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>))}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <input type="number" step="0.1" className="input-field w-full" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g., 10" />
          </div>
          <button type="submit" className="btn-primary h-10">Calculate Impact</button>
        </form>

        {calculatedEmissions && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800">Calculation Results</h3>
            <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-800">Estimated CO₂ equivalent emissions saved:</p>
              <p className="text-4xl font-bold text-blue-900 my-2">{calculatedEmissions.emissions} kg CO₂e</p>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-100 rounded-lg"><FireIcon className="h-8 w-8 mx-auto text-gray-500" /><p className="text-xl font-bold mt-2">{calculatedEmissions.equivalents.car_km} km</p><p className="text-sm text-gray-600">driven by an average car</p></div>
              <div className="p-4 bg-gray-100 rounded-lg"><LightBulbIcon className="h-8 w-8 mx-auto text-gray-500" /><p className="text-xl font-bold mt-2">{calculatedEmissions.equivalents.led_bulb_hours}</p><p className="text-sm text-gray-600">hours of a 10W LED bulb</p></div>
              <div className="p-4 bg-gray-100 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg><p className="text-xl font-bold mt-2">{calculatedEmissions.equivalents.phone_charges}</p><p className="text-sm text-gray-600">smartphones charged</p></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">About The Data</h2>
        <p className="text-sm text-gray-600">The CO₂ emission factors are simplified estimates based on global averages for the entire lifecycle of food (from farm to fork). The actual emissions can vary significantly based on production methods, transportation, and processing.</p>
        <p className="text-sm text-gray-600 mt-2">Our data is primarily sourced from studies like those published by 'Our World in Data', which aggregates academic research on environmental impacts. By donating food, you are preventing the final stage of waste, where food in landfills releases potent greenhouse gases like methane.</p>
        <a href="https://ourworldindata.org/food-ghg-emissions" target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-sm text-green-600 hover:text-green-700 font-semibold">Learn more at Our World in Data &rarr;</a>
      </div>
    </div>
  );
};

export default ImpactPage;