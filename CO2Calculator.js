import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CO2_EMISSIONS_FACTORS_KG,
  convertToKg,
  guessCategory,
} from '../utils/impactUtils';

const CO2Calculator = ({ donationFoodItems, donationQuantity, donationUnit }) => {
  const [foodCategory, setFoodCategory] = useState('Mixed Meal');
  const [quantityKg, setQuantityKg] = useState(0);
  const [emissions, setEmissions] = useState(null);

  useEffect(() => {
    const category = guessCategory(donationFoodItems);
    const kg = convertToKg(donationQuantity, donationUnit);
    
    setFoodCategory(category);
    setQuantityKg(kg);
    
    if (kg > 0) {
        const factor = CO2_EMISSIONS_FACTORS_KG[category] || 2;
        const calculatedEmissions = (kg * factor).toFixed(2);
        setEmissions(calculatedEmissions);
    } else {
        setEmissions(null);
    }
  }, [donationFoodItems, donationQuantity, donationUnit]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
      <h2 className="text-lg font-semibold text-gray-900">Estimate CO₂ Emissions Saved</h2>
      <p className="text-sm text-gray-600 mt-2">
        As you fill out the donation form, we'll estimate the positive environmental impact here.
      </p>

      {emissions !== null && quantityKg > 0 ? (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-sm text-green-800">
            Based on a donation of <strong>{quantityKg.toFixed(1)} kg</strong> of <strong>{foodCategory}</strong>, your estimated CO₂ savings are:
          </p>
          <p className="text-3xl font-bold text-green-900 mt-2">{emissions} kg CO₂e</p>
          <p className="text-xs text-gray-500 mt-1">This is an estimate. Actual emissions depend on many factors.</p>
        </div>
      ) : (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-sm text-gray-600">Enter food details above to see your impact.</p>
        </div>
      )}
    </div>
  );
};

export default CO2Calculator;