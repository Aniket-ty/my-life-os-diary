export interface FoodItem {
  id: string
  name: string
  servingUnit: string
  servingWeightG: number
  per100g: {
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
  }
  category: 'protein' | 'dairy' | 'grain' | 'fruit' | 'vegetable' | 'nut' | 'indian' | 'snack' | 'drink'
  keywords?: string[]
}

export const CURATED_FOOD_DATABASE: FoodItem[] = [
  // ── PROTEINS ────────────────────────────────────────────────────
  {
    id: 'chicken_breast_cooked',
    name: 'Chicken Breast (Cooked, Skinless)',
    servingUnit: 'fillet (150g)',
    servingWeightG: 150,
    per100g: { calories: 165, proteinG: 31.0, carbsG: 0.0, fatG: 3.6 },
    category: 'protein',
    keywords: ['chicken', 'breast', 'poultry', 'meat', 'grilled chicken', 'baked chicken'],
  },
  {
    id: 'chicken_breast_raw',
    name: 'Chicken Breast (Raw, Skinless)',
    servingUnit: 'fillet (150g)',
    servingWeightG: 150,
    per100g: { calories: 120, proteinG: 22.5, carbsG: 0.0, fatG: 2.6 },
    category: 'protein',
    keywords: ['chicken', 'raw chicken', 'breast'],
  },
  {
    id: 'chicken_thigh_cooked',
    name: 'Chicken Thigh (Cooked, Skinless)',
    servingUnit: 'thigh (120g)',
    servingWeightG: 120,
    per100g: { calories: 209, proteinG: 26.0, carbsG: 0.0, fatG: 10.9 },
    category: 'protein',
    keywords: ['chicken', 'thigh', 'chicken thigh', 'dark meat'],
  },
  {
    id: 'whole_egg',
    name: 'Whole Egg (Large)',
    servingUnit: 'large egg (50g)',
    servingWeightG: 50,
    per100g: { calories: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
    category: 'protein',
    keywords: ['egg', 'eggs', 'whole egg', 'raw egg', 'poultry'],
  },
  {
    id: 'boiled_egg',
    name: 'Boiled Egg (Hard / Soft Boiled)',
    servingUnit: 'egg (50g)',
    servingWeightG: 50,
    per100g: { calories: 155, proteinG: 12.6, carbsG: 1.1, fatG: 10.6 },
    category: 'protein',
    keywords: ['egg', 'boiled egg', 'hard boiled', 'soft boiled'],
  },
  {
    id: 'scrambled_eggs',
    name: 'Scrambled Eggs (with Butter/Oil)',
    servingUnit: '2-egg portion (110g)',
    servingWeightG: 110,
    per100g: { calories: 149, proteinG: 10.0, carbsG: 1.5, fatG: 11.0 },
    category: 'protein',
    keywords: ['egg', 'scrambled', 'scrambled eggs', 'breakfast'],
  },
  {
    id: 'egg_whites',
    name: 'Egg Whites',
    servingUnit: 'whites from 2 eggs (66g)',
    servingWeightG: 66,
    per100g: { calories: 52, proteinG: 10.9, carbsG: 0.7, fatG: 0.2 },
    category: 'protein',
    keywords: ['egg', 'egg white', 'egg whites', 'albumin'],
  },
  {
    id: 'omelette_plain',
    name: 'Omelette (Plain 2-Egg)',
    servingUnit: 'omelette (115g)',
    servingWeightG: 115,
    per100g: { calories: 154, proteinG: 11.0, carbsG: 0.8, fatG: 11.7 },
    category: 'protein',
    keywords: ['egg', 'omelette', 'omlet', 'omelet'],
  },
  {
    id: 'salmon_cooked',
    name: 'Salmon Fillet (Cooked / Baked)',
    servingUnit: 'fillet (150g)',
    servingWeightG: 150,
    per100g: { calories: 206, proteinG: 22.0, carbsG: 0.0, fatG: 12.3 },
    category: 'protein',
    keywords: ['salmon', 'fish', 'seafood', 'omega 3'],
  },
  {
    id: 'tuna_canned_water',
    name: 'Tuna (Canned in Water, Drained)',
    servingUnit: 'can (130g)',
    servingWeightG: 130,
    per100g: { calories: 116, proteinG: 25.5, carbsG: 0.0, fatG: 1.0 },
    category: 'protein',
    keywords: ['tuna', 'canned tuna', 'fish', 'seafood'],
  },
  {
    id: 'shrimp_cooked',
    name: 'Shrimp / Prawns (Cooked)',
    servingUnit: 'serving (100g)',
    servingWeightG: 100,
    per100g: { calories: 99, proteinG: 24.0, carbsG: 0.2, fatG: 0.3 },
    category: 'protein',
    keywords: ['shrimp', 'prawns', 'prawn', 'seafood'],
  },
  {
    id: 'ground_beef_lean',
    name: 'Lean Ground Beef 90/10 (Cooked)',
    servingUnit: 'patty / serving (115g)',
    servingWeightG: 115,
    per100g: { calories: 217, proteinG: 26.1, carbsG: 0.0, fatG: 11.8 },
    category: 'protein',
    keywords: ['beef', 'ground beef', 'mince', 'red meat', 'burger'],
  },
  {
    id: 'beef_sirloin_steak',
    name: 'Beef Sirloin Steak (Cooked)',
    servingUnit: 'steak (170g)',
    servingWeightG: 170,
    per100g: { calories: 201, proteinG: 30.3, carbsG: 0.0, fatG: 8.0 },
    category: 'protein',
    keywords: ['steak', 'beef', 'sirloin', 'red meat'],
  },
  {
    id: 'turkey_breast_cooked',
    name: 'Turkey Breast (Cooked, Skinless)',
    servingUnit: 'serving (120g)',
    servingWeightG: 120,
    per100g: { calories: 135, proteinG: 30.0, carbsG: 0.0, fatG: 1.0 },
    category: 'protein',
    keywords: ['turkey', 'turkey breast', 'poultry'],
  },
  {
    id: 'whey_protein',
    name: 'Whey Protein Powder',
    servingUnit: 'scoop (30g)',
    servingWeightG: 30,
    per100g: { calories: 400, proteinG: 80.0, carbsG: 10.0, fatG: 5.0 },
    category: 'protein',
    keywords: ['protein', 'whey', 'protein shake', 'powder', 'supplement'],
  },
  {
    id: 'plant_protein',
    name: 'Plant / Vegan Protein Powder',
    servingUnit: 'scoop (30g)',
    servingWeightG: 30,
    per100g: { calories: 380, proteinG: 75.0, carbsG: 12.0, fatG: 4.5 },
    category: 'protein',
    keywords: ['protein', 'vegan protein', 'pea protein', 'plant protein'],
  },

  // ── INDIAN & VEGETARIAN STAPLES ─────────────────────────────────
  {
    id: 'roti_chapati',
    name: 'Roti / Chapati (Plain, 1 medium)',
    servingUnit: 'medium roti (40g)',
    servingWeightG: 40,
    per100g: { calories: 297, proteinG: 9.3, carbsG: 55.8, fatG: 3.7 },
    category: 'indian',
    keywords: ['roti', 'chapati', 'phulka', 'flatbread', 'wheat roti', 'indian bread'],
  },
  {
    id: 'roti_ghee',
    name: 'Roti / Chapati with Ghee (1 medium)',
    servingUnit: 'medium roti (45g)',
    servingWeightG: 45,
    per100g: { calories: 340, proteinG: 8.5, carbsG: 52.0, fatG: 10.5 },
    category: 'indian',
    keywords: ['roti ghee', 'chapati ghee', 'ghee roti'],
  },
  {
    id: 'paneer_raw',
    name: 'Paneer / Cottage Cheese (Raw)',
    servingUnit: 'serving (100g)',
    servingWeightG: 100,
    per100g: { calories: 265, proteinG: 18.3, carbsG: 3.4, fatG: 20.8 },
    category: 'indian',
    keywords: ['paneer', 'cottage cheese', 'indian cheese', 'dairypaneer'],
  },
  {
    id: 'paneer_tikka',
    name: 'Paneer Tikka (Cooked)',
    servingUnit: 'plate / 6 pcs (150g)',
    servingWeightG: 150,
    per100g: { calories: 230, proteinG: 15.0, carbsG: 6.0, fatG: 16.5 },
    category: 'indian',
    keywords: ['paneer', 'tikka', 'paneer tikka', 'tandoori paneer'],
  },
  {
    id: 'dal_yellow_tadka',
    name: 'Dal Tadka / Yellow Lentils (Cooked)',
    servingUnit: 'bowl / katori (150g)',
    servingWeightG: 150,
    per100g: { calories: 95, proteinG: 5.5, carbsG: 14.2, fatG: 2.1 },
    category: 'indian',
    keywords: ['dal', 'daal', 'dal tadka', 'yellow dal', 'toor dal', 'moong dal', 'lentils'],
  },
  {
    id: 'dal_makhani',
    name: 'Dal Makhani (Cooked)',
    servingUnit: 'bowl / katori (150g)',
    servingWeightG: 150,
    per100g: { calories: 150, proteinG: 5.0, carbsG: 16.0, fatG: 7.5 },
    category: 'indian',
    keywords: ['dal', 'dal makhani', 'black dal', 'urad dal'],
  },
  {
    id: 'chana_masala',
    name: 'Chana Masala / Chickpea Curry',
    servingUnit: 'bowl (180g)',
    servingWeightG: 180,
    per100g: { calories: 130, proteinG: 6.0, carbsG: 18.5, fatG: 3.8 },
    category: 'indian',
    keywords: ['chana', 'chole', 'chickpeas', 'chana masala', 'curry'],
  },
  {
    id: 'rajma_masala',
    name: 'Rajma / Kidney Bean Curry',
    servingUnit: 'bowl (180g)',
    servingWeightG: 180,
    per100g: { calories: 125, proteinG: 6.5, carbsG: 17.5, fatG: 3.5 },
    category: 'indian',
    keywords: ['rajma', 'kidney beans', 'rajma chawal', 'bean curry'],
  },
  {
    id: 'chicken_biryani',
    name: 'Chicken Biryani',
    servingUnit: 'plate (300g)',
    servingWeightG: 300,
    per100g: { calories: 180, proteinG: 9.5, carbsG: 21.0, fatG: 6.5 },
    category: 'indian',
    keywords: ['biryani', 'chicken biryani', 'briyani', 'rice'],
  },
  {
    id: 'veg_biryani',
    name: 'Vegetable Biryani / Pulao',
    servingUnit: 'plate (250g)',
    servingWeightG: 250,
    per100g: { calories: 155, proteinG: 3.8, carbsG: 25.0, fatG: 4.5 },
    category: 'indian',
    keywords: ['biryani', 'veg biryani', 'pulao', 'pilaf'],
  },
  {
    id: 'plain_dosa',
    name: 'Plain Dosa',
    servingUnit: 'medium dosa (80g)',
    servingWeightG: 80,
    per100g: { calories: 165, proteinG: 4.2, carbsG: 29.5, fatG: 3.5 },
    category: 'indian',
    keywords: ['dosa', 'plain dosa', 'south indian'],
  },
  {
    id: 'masala_dosa',
    name: 'Masala Dosa with Potato Filling',
    servingUnit: 'medium dosa (160g)',
    servingWeightG: 160,
    per100g: { calories: 180, proteinG: 4.0, carbsG: 28.0, fatG: 5.5 },
    category: 'indian',
    keywords: ['dosa', 'masala dosa', 'south indian'],
  },
  {
    id: 'idli',
    name: 'Idli (Steamed Rice Cake)',
    servingUnit: 'piece (50g)',
    servingWeightG: 50,
    per100g: { calories: 130, proteinG: 4.5, carbsG: 27.0, fatG: 0.5 },
    category: 'indian',
    keywords: ['idli', 'idly', 'steamed idli', 'south indian'],
  },
  {
    id: 'plain_paratha',
    name: 'Plain Paratha (Shallow Fried)',
    servingUnit: 'medium paratha (70g)',
    servingWeightG: 70,
    per100g: { calories: 320, proteinG: 6.5, carbsG: 46.0, fatG: 12.0 },
    category: 'indian',
    keywords: ['paratha', 'plain paratha', 'indian bread'],
  },
  {
    id: 'aloo_paratha',
    name: 'Aloo Paratha (Stuffed with Potato)',
    servingUnit: 'medium paratha (120g)',
    servingWeightG: 120,
    per100g: { calories: 250, proteinG: 5.0, carbsG: 38.0, fatG: 8.8 },
    category: 'indian',
    keywords: ['paratha', 'aloo paratha', 'potato paratha'],
  },
  {
    id: 'khichdi',
    name: 'Khichdi (Moong Dal & Rice)',
    servingUnit: 'bowl (200g)',
    servingWeightG: 200,
    per100g: { calories: 120, proteinG: 4.5, carbsG: 21.0, fatG: 2.2 },
    category: 'indian',
    keywords: ['khichdi', 'khichuri', 'moong dal rice'],
  },
  {
    id: 'curd_dahi',
    name: 'Curd / Dahi (Plain Whole Milk Yogurt)',
    servingUnit: 'cup / katori (150g)',
    servingWeightG: 150,
    per100g: { calories: 61, proteinG: 3.5, carbsG: 4.7, fatG: 3.3 },
    category: 'dairy',
    keywords: ['curd', 'dahi', 'yogurt', 'yoghurt', 'indian curd'],
  },

  // ── GRAINS, RICE & CARBS ─────────────────────────────────────────
  {
    id: 'white_rice_cooked',
    name: 'White Rice (Cooked)',
    servingUnit: 'cup / bowl (150g)',
    servingWeightG: 150,
    per100g: { calories: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3 },
    category: 'grain',
    keywords: ['rice', 'white rice', 'cooked rice', 'steamed rice', 'chawal'],
  },
  {
    id: 'brown_rice_cooked',
    name: 'Brown Rice (Cooked)',
    servingUnit: 'cup / bowl (150g)',
    servingWeightG: 150,
    per100g: { calories: 111, proteinG: 2.6, carbsG: 23.0, fatG: 0.9 },
    category: 'grain',
    keywords: ['rice', 'brown rice', 'cooked brown rice'],
  },
  {
    id: 'basmati_rice_cooked',
    name: 'Basmati Rice (Cooked)',
    servingUnit: 'cup / bowl (150g)',
    servingWeightG: 150,
    per100g: { calories: 121, proteinG: 3.5, carbsG: 25.2, fatG: 0.4 },
    category: 'grain',
    keywords: ['rice', 'basmati', 'basmati rice'],
  },
  {
    id: 'oats_dry',
    name: 'Rolled Oats / Oatmeal (Dry)',
    servingUnit: 'cup / serving (40g)',
    servingWeightG: 40,
    per100g: { calories: 389, proteinG: 16.9, carbsG: 66.3, fatG: 6.9 },
    category: 'grain',
    keywords: ['oats', 'oatmeal', 'rolled oats', 'porridge'],
  },
  {
    id: 'quinoa_cooked',
    name: 'Quinoa (Cooked)',
    servingUnit: 'cup (185g)',
    servingWeightG: 185,
    per100g: { calories: 120, proteinG: 4.4, carbsG: 21.3, fatG: 1.9 },
    category: 'grain',
    keywords: ['quinoa', 'grain', 'superfood'],
  },
  {
    id: 'sweet_potato_baked',
    name: 'Sweet Potato (Baked / Boiled)',
    servingUnit: 'medium potato (130g)',
    servingWeightG: 130,
    per100g: { calories: 86, proteinG: 1.6, carbsG: 20.1, fatG: 0.1 },
    category: 'grain',
    keywords: ['sweet potato', 'potato', 'yam', 'shakarkandi'],
  },
  {
    id: 'potato_boiled',
    name: 'White Potato (Boiled with Skin)',
    servingUnit: 'medium potato (150g)',
    servingWeightG: 150,
    per100g: { calories: 87, proteinG: 1.9, carbsG: 20.1, fatG: 0.1 },
    category: 'grain',
    keywords: ['potato', 'potatoes', 'boiled potato', 'aloo'],
  },
  {
    id: 'pasta_cooked',
    name: 'Pasta / Spaghetti (Cooked)',
    servingUnit: 'cup (140g)',
    servingWeightG: 140,
    per100g: { calories: 158, proteinG: 5.8, carbsG: 30.9, fatG: 0.9 },
    category: 'grain',
    keywords: ['pasta', 'spaghetti', 'noodles', 'penne', 'macaroni'],
  },
  {
    id: 'whole_wheat_bread',
    name: 'Whole Wheat Bread',
    servingUnit: 'slice (40g)',
    servingWeightG: 40,
    per100g: { calories: 247, proteinG: 13.0, carbsG: 41.0, fatG: 3.4 },
    category: 'grain',
    keywords: ['bread', 'wheat bread', 'brown bread', 'toast'],
  },
  {
    id: 'white_bread',
    name: 'White Bread',
    servingUnit: 'slice (30g)',
    servingWeightG: 30,
    per100g: { calories: 265, proteinG: 9.0, carbsG: 49.0, fatG: 3.2 },
    category: 'grain',
    keywords: ['bread', 'white bread', 'toast', 'sandwich bread'],
  },

  // ── DAIRY & MILK ────────────────────────────────────────────────
  {
    id: 'whole_milk',
    name: 'Whole Milk (Cow)',
    servingUnit: 'glass / cup (240ml / 245g)',
    servingWeightG: 245,
    per100g: { calories: 61, proteinG: 3.2, carbsG: 4.8, fatG: 3.3 },
    category: 'dairy',
    keywords: ['milk', 'whole milk', 'full cream milk', 'cow milk', 'doodh'],
  },
  {
    id: 'skim_milk',
    name: 'Skim Milk / Fat-Free Milk',
    servingUnit: 'glass / cup (240ml / 245g)',
    servingWeightG: 245,
    per100g: { calories: 34, proteinG: 3.4, carbsG: 5.0, fatG: 0.1 },
    category: 'dairy',
    keywords: ['milk', 'skim milk', 'toned milk', 'double toned milk', 'fat free milk'],
  },
  {
    id: 'almond_milk_unsweetened',
    name: 'Almond Milk (Unsweetened)',
    servingUnit: 'glass / cup (240ml / 240g)',
    servingWeightG: 240,
    per100g: { calories: 15, proteinG: 0.5, carbsG: 0.3, fatG: 1.1 },
    category: 'dairy',
    keywords: ['almond milk', 'nut milk', 'plant milk'],
  },
  {
    id: 'greek_yogurt_0',
    name: 'Greek Yogurt (0% Fat, Plain)',
    servingUnit: 'cup / serving (170g)',
    servingWeightG: 170,
    per100g: { calories: 59, proteinG: 10.0, carbsG: 3.6, fatG: 0.4 },
    category: 'dairy',
    keywords: ['yogurt', 'greek yogurt', 'non fat yogurt', 'protein yogurt'],
  },
  {
    id: 'cheddar_cheese',
    name: 'Cheddar Cheese',
    servingUnit: 'slice / cube (28g)',
    servingWeightG: 28,
    per100g: { calories: 403, proteinG: 24.9, carbsG: 1.3, fatG: 33.1 },
    category: 'dairy',
    keywords: ['cheese', 'cheddar', 'cheddar cheese'],
  },
  {
    id: 'butter_salted',
    name: 'Butter',
    servingUnit: 'pat / tbsp (14g)',
    servingWeightG: 14,
    per100g: { calories: 717, proteinG: 0.9, carbsG: 0.1, fatG: 81.1 },
    category: 'dairy',
    keywords: ['butter', 'makhan', 'amul butter'],
  },
  {
    id: 'pure_ghee',
    name: 'Ghee (Clarified Butter)',
    servingUnit: 'tbsp (14g)',
    servingWeightG: 14,
    per100g: { calories: 900, proteinG: 0.0, carbsG: 0.0, fatG: 99.8 },
    category: 'dairy',
    keywords: ['ghee', 'clarified butter', 'desi ghee'],
  },

  // ── PLANT PROTEINS & LEGUMES ────────────────────────────────────
  {
    id: 'tofu_firm',
    name: 'Firm Tofu',
    servingUnit: 'serving (100g)',
    servingWeightG: 100,
    per100g: { calories: 83, proteinG: 10.0, carbsG: 1.2, fatG: 5.3 },
    category: 'protein',
    keywords: ['tofu', 'firm tofu', 'soy', 'bean curd', 'vegan protein'],
  },
  {
    id: 'peanut_butter',
    name: 'Peanut Butter',
    servingUnit: 'tbsp (32g)',
    servingWeightG: 32,
    per100g: { calories: 588, proteinG: 25.1, carbsG: 20.0, fatG: 50.4 },
    category: 'nut',
    keywords: ['peanut butter', 'pb', 'peanuts', 'nut butter'],
  },

  // ── FRUITS ──────────────────────────────────────────────────────
  {
    id: 'banana',
    name: 'Banana',
    servingUnit: 'medium banana (118g)',
    servingWeightG: 118,
    per100g: { calories: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3 },
    category: 'fruit',
    keywords: ['banana', 'bananas', 'kela', 'fruit'],
  },
  {
    id: 'apple',
    name: 'Apple (with skin)',
    servingUnit: 'medium apple (182g)',
    servingWeightG: 182,
    per100g: { calories: 52, proteinG: 0.3, carbsG: 13.8, fatG: 0.2 },
    category: 'fruit',
    keywords: ['apple', 'apples', 'seb', 'fruit'],
  },
  {
    id: 'orange',
    name: 'Orange',
    servingUnit: 'medium orange (131g)',
    servingWeightG: 131,
    per100g: { calories: 47, proteinG: 0.9, carbsG: 11.8, fatG: 0.1 },
    category: 'fruit',
    keywords: ['orange', 'oranges', 'citrus', 'santra'],
  },
  {
    id: 'strawberries',
    name: 'Strawberries (Fresh)',
    servingUnit: 'cup (150g)',
    servingWeightG: 150,
    per100g: { calories: 32, proteinG: 0.7, carbsG: 7.7, fatG: 0.3 },
    category: 'fruit',
    keywords: ['strawberries', 'strawberry', 'berries'],
  },
  {
    id: 'blueberries',
    name: 'Blueberries (Fresh)',
    servingUnit: 'cup (148g)',
    servingWeightG: 148,
    per100g: { calories: 57, proteinG: 0.7, carbsG: 14.5, fatG: 0.3 },
    category: 'fruit',
    keywords: ['blueberries', 'blueberry', 'berries'],
  },
  {
    id: 'avocado',
    name: 'Avocado',
    servingUnit: 'half avocado (100g)',
    servingWeightG: 100,
    per100g: { calories: 160, proteinG: 2.0, carbsG: 8.5, fatG: 14.7 },
    category: 'fruit',
    keywords: ['avocado', 'guacamole', 'healthy fats'],
  },
  {
    id: 'mango',
    name: 'Mango (Fresh)',
    servingUnit: 'cup diced (165g)',
    servingWeightG: 165,
    per100g: { calories: 60, proteinG: 0.8, carbsG: 15.0, fatG: 0.4 },
    category: 'fruit',
    keywords: ['mango', 'aam', 'tropical fruit'],
  },
  {
    id: 'watermelon',
    name: 'Watermelon',
    servingUnit: 'wedge / slice (280g)',
    servingWeightG: 280,
    per100g: { calories: 30, proteinG: 0.6, carbsG: 7.6, fatG: 0.2 },
    category: 'fruit',
    keywords: ['watermelon', 'tarbooj', 'melon'],
  },

  // ── VEGETABLES ──────────────────────────────────────────────────
  {
    id: 'broccoli_steamed',
    name: 'Broccoli (Steamed)',
    servingUnit: 'cup (90g)',
    servingWeightG: 90,
    per100g: { calories: 35, proteinG: 2.4, carbsG: 7.2, fatG: 0.4 },
    category: 'vegetable',
    keywords: ['broccoli', 'green vegetables'],
  },
  {
    id: 'spinach_cooked',
    name: 'Spinach (Cooked)',
    servingUnit: 'cup (180g)',
    servingWeightG: 180,
    per100g: { calories: 23, proteinG: 3.0, carbsG: 3.8, fatG: 0.3 },
    category: 'vegetable',
    keywords: ['spinach', 'palak', 'greens'],
  },
  {
    id: 'cucumber',
    name: 'Cucumber (with peel)',
    servingUnit: 'medium cucumber (200g)',
    servingWeightG: 200,
    per100g: { calories: 15, proteinG: 0.7, carbsG: 3.6, fatG: 0.1 },
    category: 'vegetable',
    keywords: ['cucumber', 'kheera', 'salad'],
  },
  {
    id: 'tomato',
    name: 'Tomato',
    servingUnit: 'medium tomato (120g)',
    servingWeightG: 120,
    per100g: { calories: 18, proteinG: 0.9, carbsG: 3.9, fatG: 0.2 },
    category: 'vegetable',
    keywords: ['tomato', 'tamatar', 'salad'],
  },

  // ── NUTS & SEEDS ────────────────────────────────────────────────
  {
    id: 'almonds',
    name: 'Almonds (Raw)',
    servingUnit: 'handful (30g / ~23 nuts)',
    servingWeightG: 30,
    per100g: { calories: 579, proteinG: 21.2, carbsG: 21.6, fatG: 49.9 },
    category: 'nut',
    keywords: ['almonds', 'badam', 'nuts'],
  },
  {
    id: 'walnuts',
    name: 'Walnuts',
    servingUnit: 'handful (30g / ~7 halves)',
    servingWeightG: 30,
    per100g: { calories: 654, proteinG: 15.2, carbsG: 13.7, fatG: 65.2 },
    category: 'nut',
    keywords: ['walnuts', 'akhrot', 'nuts'],
  },
  {
    id: 'cashews',
    name: 'Cashews (Raw or Roasted)',
    servingUnit: 'handful (30g)',
    servingWeightG: 30,
    per100g: { calories: 553, proteinG: 18.2, carbsG: 30.2, fatG: 43.8 },
    category: 'nut',
    keywords: ['cashews', 'kaju', 'nuts'],
  },
  {
    id: 'chia_seeds',
    name: 'Chia Seeds',
    servingUnit: 'tbsp (12g)',
    servingWeightG: 12,
    per100g: { calories: 486, proteinG: 16.5, carbsG: 42.1, fatG: 30.7 },
    category: 'nut',
    keywords: ['chia', 'chia seeds', 'seeds', 'omega 3'],
  },
]

/**
 * Searches the local curated food database with smart scoring:
 * 1. Exact matches / starts-with on name
 * 2. Word boundary substring match on name
 * 3. Match on keywords array
 */
export function searchLocalFoods(query: string, maxResults = 8): FoodItem[] {
  const clean = query.trim().toLowerCase()
  if (!clean) return []

  const terms = clean.split(/\s+/).filter(Boolean)

  const scored: Array<{ item: FoodItem; score: number }> = []

  for (const item of CURATED_FOOD_DATABASE) {
    const lowerName = item.name.toLowerCase()
    let score = 0

    // Exact match
    if (lowerName === clean) {
      score += 100
    } else if (lowerName.startsWith(clean)) {
      score += 60
    } else if (lowerName.includes(clean)) {
      score += 40
    }

    // Keyword match
    if (item.keywords) {
      for (const kw of item.keywords) {
        if (kw === clean) {
          score += 50
        } else if (kw.startsWith(clean)) {
          score += 30
        } else if (kw.includes(clean)) {
          score += 20
        }
      }
    }

    // Multi-term match (e.g. "chicken breast" or "egg boiled")
    const allTermsMatch = terms.every(
      (term) => lowerName.includes(term) || item.keywords?.some((k) => k.includes(term)),
    )
    if (allTermsMatch && terms.length > 1) {
      score += 45
    }

    if (score > 0) {
      scored.push({ item, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxResults).map((s) => s.item)
}
