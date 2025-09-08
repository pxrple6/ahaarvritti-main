import React, { useState } from 'react';

const CO2Calculator = () => {
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('meals');
  const [resultKg, setResultKg] = useState(null);

  // Mirror DonationContext.calculateCO2Saved logic
  const calculateCO2Saved = (qty, u) => {
    const q = Number(qty) || 0;
    if (!u || q <= 0) return 0;
    if (u === 'meals') return q * 1.3;
    if (['kg', 'liters', 'packs'].includes(u)) return q * 2.5;
    return 0;
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    const co2 = calculateCO2Saved(quantity, unit);
    setResultKg(Math.round(co2));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">CO₂ Savings Calculator</h2>
      <form onSubmit={handleCalculate} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Quantity</label>
          <input
            type="number"
            className="input-field"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="0"
            step="any"
            placeholder="Enter amount"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Unit</label>
          <select
            className="input-field"
            value={unit}
            onChange={e => setUnit(e.target.value)}
          >
            <option value="meals">Meals</option>
            <option value="kg">Kg</option>
            <option value="liters">Liters</option>
            <option value="packs">Packs</option>
          </select>
        </div>
        <button type="submit" className="btn-primary px-6 py-2">Calculate</button>
      </form>
      {resultKg !== null && (
        <div className="mt-4 text-green-700 font-semibold">
          Estimated CO₂ saved: {resultKg} kg
        </div>
      )}
    </div>
  );
};

export default CO2Calculator;
