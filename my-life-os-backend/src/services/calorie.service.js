// Mifflin-St Jeor Equation for BMR calculation
// Activity multipliers
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,        // Little or no exercise
  light: 1.375,          // Light exercise 1-3 days/week
  moderate: 1.55,        // Moderate exercise 3-5 days/week
  active: 1.725,         // Hard exercise 6-7 days/week
  veryActive: 1.9,       // Very hard exercise, physical job
};

// Goal calorie adjustments
const GOAL_ADJUSTMENTS = {
  lose: -500,    // ~0.5kg/week loss
  maintain: 0,
  gain: 400,     // ~0.3-0.4kg/week gain
};

function calculateBMR(weightKg, heightCm, age, gender) {
  // Mifflin-St Jeor
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'female' ? base - 161 : base + 5;
}

function calculateTDEE(bmr, activityLevel) {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  return Math.round(bmr * multiplier);
}

function calculateCalorieGoal(tdee, goal) {
  const adjustment = GOAL_ADJUSTMENTS[goal] || 0;
  return Math.max(1200, tdee + adjustment); // Floor at 1200
}

function calculateMacros(calorieGoal, weightKg, goal) {
  // Protein: 1.6-2.2g/kg based on goal
  let proteinPerKg;
  switch (goal) {
    case 'lose': proteinPerKg = 2.0; break;     // Higher protein to preserve muscle during cut
    case 'gain': proteinPerKg = 1.8; break;     // Moderate-high for muscle building
    case 'maintain': proteinPerKg = 1.6; break;
    default: proteinPerKg = 1.8;
  }
  const proteinG = Math.round(weightKg * proteinPerKg);

  // Fat: 0.8-1g/kg (floor at 20% of calories)
  const fatG = Math.max(Math.round(weightKg * 0.9), Math.round(calorieGoal * 0.2 / 9));

  // Carbs: remaining calories
  const proteinCals = proteinG * 4;
  const fatCals = fatG * 9;
  const carbsG = Math.round((calorieGoal - proteinCals - fatCals) / 4);

  return { proteinG, carbsG, fatG };
}

function calculateAll({ weightKg, heightCm, age, gender, activityLevel, goal, bodyFatPct }) {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const calorieGoal = calculateCalorieGoal(tdee, goal);
  const macros = calculateMacros(calorieGoal, weightKg, goal);

  // Lean body mass from body fat if provided
  let leanBodyMass = null;
  let proteinPerKgLean = null;
  if (bodyFatPct) {
    leanBodyMass = Math.round(weightKg * (1 - bodyFatPct / 100) * 10) / 10;
    proteinPerKgLean = Math.round((macros.proteinG / leanBodyMass) * 10) / 10;
  }

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieGoal,
    ...macros,
    leanBodyMass,
    proteinPerKgLean,
    activityLevel,
    goal,
  };
}

module.exports = {
  calculateAll,
  calculateBMR,
  calculateTDEE,
  calculateCalorieGoal,
  calculateMacros,
  ACTIVITY_MULTIPLIERS,
};
