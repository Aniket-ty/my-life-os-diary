"""
Inline Knowledge Base for Nutrition, Exercises, and Health Guidelines.
Enables offline, instant, zero-cost processing for 85%+ of common fitness app requests.
"""

# Nutrition per 100 grams: calories, protein_g, carbs_g, fat_g, and default serving weight in grams
FOOD_DATABASE = {
    # Proteins & Meats
    "chicken breast": {"cal": 165, "p": 31.0, "c": 0.0, "f": 3.6, "unit_g": 120, "unit_name": "breast"},
    "chicken": {"cal": 239, "p": 27.0, "c": 0.0, "f": 14.0, "unit_g": 150, "unit_name": "serving"},
    "egg": {"cal": 143, "p": 12.6, "c": 0.7, "f": 9.5, "unit_g": 50, "unit_name": "egg"},
    "eggs": {"cal": 143, "p": 12.6, "c": 0.7, "f": 9.5, "unit_g": 50, "unit_name": "egg"},
    "egg white": {"cal": 52, "p": 10.9, "c": 0.7, "f": 0.2, "unit_g": 33, "unit_name": "egg white"},
    "egg whites": {"cal": 52, "p": 10.9, "c": 0.7, "f": 0.2, "unit_g": 33, "unit_name": "egg white"},
    "boiled egg": {"cal": 155, "p": 12.6, "c": 1.1, "f": 10.6, "unit_g": 50, "unit_name": "egg"},
    "boiled eggs": {"cal": 155, "p": 12.6, "c": 1.1, "f": 10.6, "unit_g": 50, "unit_name": "egg"},
    "whey protein": {"cal": 400, "p": 80.0, "c": 8.0, "f": 5.0, "unit_g": 30, "unit_name": "scoop"},
    "protein shake": {"cal": 140, "p": 25.0, "c": 4.0, "f": 2.5, "unit_g": 300, "unit_name": "shake"},
    "salmon": {"cal": 208, "p": 20.4, "c": 0.0, "f": 13.4, "unit_g": 150, "unit_name": "fillet"},
    "tuna": {"cal": 132, "p": 28.0, "c": 0.0, "f": 1.0, "unit_g": 120, "unit_name": "can"},
    "tofu": {"cal": 76, "p": 8.0, "c": 1.9, "f": 4.8, "unit_g": 100, "unit_name": "block"},
    "paneer": {"cal": 265, "p": 18.3, "c": 3.4, "f": 20.8, "unit_g": 100, "unit_name": "serving"},
    "soya chunks": {"cal": 345, "p": 52.0, "c": 33.0, "f": 0.5, "unit_g": 50, "unit_name": "serving"},
    "greek yogurt": {"cal": 59, "p": 10.0, "c": 3.6, "f": 0.4, "unit_g": 150, "unit_name": "cup"},
    "curd": {"cal": 60, "p": 3.5, "c": 4.7, "f": 3.2, "unit_g": 150, "unit_name": "bowl"},
    "dahi": {"cal": 60, "p": 3.5, "c": 4.7, "f": 3.2, "unit_g": 150, "unit_name": "bowl"},
    "milk": {"cal": 62, "p": 3.2, "c": 4.8, "f": 3.4, "unit_g": 240, "unit_name": "cup / glass"},

    # Carbs & Grains
    "rice": {"cal": 130, "p": 2.7, "c": 28.2, "f": 0.3, "unit_g": 150, "unit_name": "cup (cooked)"},
    "white rice": {"cal": 130, "p": 2.7, "c": 28.2, "f": 0.3, "unit_g": 150, "unit_name": "cup (cooked)"},
    "brown rice": {"cal": 111, "p": 2.6, "c": 23.0, "f": 0.9, "unit_g": 150, "unit_name": "cup (cooked)"},
    "roti": {"cal": 297, "p": 11.0, "c": 50.0, "f": 4.0, "unit_g": 40, "unit_name": "roti / chapati"},
    "chapati": {"cal": 297, "p": 11.0, "c": 50.0, "f": 4.0, "unit_g": 40, "unit_name": "chapati"},
    "oats": {"cal": 389, "p": 16.9, "c": 66.3, "f": 6.9, "unit_g": 50, "unit_name": "bowl"},
    "oatmeal": {"cal": 68, "p": 2.4, "c": 12.0, "f": 1.4, "unit_g": 200, "unit_name": "bowl"},
    "bread": {"cal": 265, "p": 9.0, "c": 49.0, "f": 3.2, "unit_g": 30, "unit_name": "slice"},
    "brown bread": {"cal": 247, "p": 13.0, "c": 41.0, "f": 3.4, "unit_g": 30, "unit_name": "slice"},
    "potato": {"cal": 77, "p": 2.0, "c": 17.5, "f": 0.1, "unit_g": 150, "unit_name": "medium potato"},
    "sweet potato": {"cal": 86, "p": 1.6, "c": 20.1, "f": 0.1, "unit_g": 130, "unit_name": "medium"},
    "dal": {"cal": 104, "p": 6.8, "c": 15.0, "f": 2.0, "unit_g": 180, "unit_name": "bowl"},
    "lentils": {"cal": 116, "p": 9.0, "c": 20.0, "f": 0.4, "unit_g": 180, "unit_name": "cup"},
    "pasta": {"cal": 131, "p": 5.0, "c": 25.0, "f": 1.1, "unit_g": 140, "unit_name": "cup"},

    # Fruits & Vegetables
    "banana": {"cal": 89, "p": 1.1, "c": 22.8, "f": 0.3, "unit_g": 118, "unit_name": "medium banana"},
    "apple": {"cal": 52, "p": 0.3, "c": 13.8, "f": 0.2, "unit_g": 180, "unit_name": "medium apple"},
    "orange": {"cal": 47, "p": 0.9, "c": 11.8, "f": 0.1, "unit_g": 130, "unit_name": "medium orange"},
    "broccoli": {"cal": 34, "p": 2.8, "c": 6.6, "f": 0.4, "unit_g": 100, "unit_name": "cup"},
    "spinach": {"cal": 23, "p": 2.9, "c": 3.6, "f": 0.4, "unit_g": 80, "unit_name": "cup"},
    "avocado": {"cal": 160, "p": 2.0, "c": 8.5, "f": 14.7, "unit_g": 150, "unit_name": "avocado"},
    "salad": {"cal": 35, "p": 1.5, "c": 6.0, "f": 0.5, "unit_g": 150, "unit_name": "bowl"},

    # Healthy Fats & Nuts
    "almonds": {"cal": 579, "p": 21.2, "c": 21.6, "f": 49.9, "unit_g": 28, "unit_name": "handful (23 nuts)"},
    "peanut butter": {"cal": 588, "p": 25.0, "c": 20.0, "f": 50.0, "unit_g": 32, "unit_name": "tablespoon (2 tbsp)"},
    "peanuts": {"cal": 567, "p": 25.8, "c": 16.1, "f": 49.2, "unit_g": 28, "unit_name": "handful"},
    "walnuts": {"cal": 654, "p": 15.2, "c": 13.7, "f": 65.2, "unit_g": 28, "unit_name": "handful"},
    "olive oil": {"cal": 884, "p": 0.0, "c": 0.0, "f": 100.0, "unit_g": 14, "unit_name": "tablespoon"},
    "ghee": {"cal": 900, "p": 0.0, "c": 0.0, "f": 100.0, "unit_g": 14, "unit_name": "tablespoon"},
}

EXERCISE_DATABASE = {
    "bench press": {
        "muscles": "Chest, Shoulders, Triceps",
        "category": "Compound Chest",
        "default_sets": 4,
        "default_reps": "8-10",
        "form": "Keep eyes under the bar, retract scapulae firmly, drive through heels, and lower the bar under control to mid-chest with elbows at ~45-60 degrees.",
    },
    "incline dumbbell press": {
        "muscles": "Upper Chest, Front Delts, Triceps",
        "category": "Compound Chest",
        "default_sets": 3,
        "default_reps": "10-12",
        "form": "Set bench to 30-45 degrees. Press dumbbells upward without clanking them at the top. Control the eccentric stretch.",
    },
    "squat": {
        "muscles": "Quadriceps, Glutes, Adductors, Core",
        "category": "Compound Legs",
        "default_sets": 4,
        "default_reps": "6-8",
        "form": "Place bar on upper traps, feet shoulder-width, break at hips and knees together, descend until thighs are parallel or below, keeping chest tall.",
    },
    "barbell squat": {
        "muscles": "Quadriceps, Glutes, Adductors, Core",
        "category": "Compound Legs",
        "default_sets": 4,
        "default_reps": "6-8",
        "form": "Place bar across upper back, brace core 360 degrees, squat down pushing knees out in line with toes, drive up smoothly.",
    },
    "deadlift": {
        "muscles": "Hamstrings, Glutes, Erector Spinae, Lats, Traps",
        "category": "Compound Posterior Chain",
        "default_sets": 3,
        "default_reps": "5-6",
        "form": "Bar over mid-foot, hinge at hips, grip bar firmly, engage lats, push floor away through midfoot with neutral spine.",
    },
    "lat pulldown": {
        "muscles": "Latissimus Dorsi, Biceps, Rear Delts",
        "category": "Vertical Pull",
        "default_sets": 4,
        "default_reps": "10-12",
        "form": "Thighs locked under pads, grip slightly outside shoulder-width, pull elbows down toward hips while keeping chest lifted.",
    },
    "seated cable row": {
        "muscles": "Mid-Back, Rhomboids, Lats, Biceps",
        "category": "Horizontal Pull",
        "default_sets": 3,
        "default_reps": "10-12",
        "form": "Sit upright with knees slightly bent, pull handle toward lower abdomen, squeeze shoulder blades together at peak contraction.",
    },
    "bicep curl": {
        "muscles": "Biceps Brachii, Brachialis",
        "category": "Isolation Arms",
        "default_sets": 3,
        "default_reps": "12-15",
        "form": "Keep elbows pinned at sides, curl without swinging torso, squeeze at top for 1 second, control negative.",
    },
    "tricep pushdown": {
        "muscles": "Triceps",
        "category": "Isolation Arms",
        "default_sets": 3,
        "default_reps": "12-15",
        "form": "Elbows tucked into ribs, push rope or bar down to full extension, squeeze triceps, control return to 90 degrees.",
    },
    "overhead shoulder press": {
        "muscles": "Anterior Delts, Lateral Delts, Triceps, Upper Chest",
        "category": "Compound Shoulders",
        "default_sets": 4,
        "default_reps": "8-10",
        "form": "Brace core and glutes, press bar overhead in a vertical path, locking out directly above ears at the top.",
    },
    "leg press": {
        "muscles": "Quadriceps, Glutes",
        "category": "Compound Legs",
        "default_sets": 4,
        "default_reps": "10-12",
        "form": "Feet shoulder-width in middle of platform, lower safety handles, descend until knees hit ~90 degrees, press without locking knees.",
    },
    "pullup": {
        "muscles": "Lats, Upper Back, Biceps",
        "category": "Bodyweight Pull",
        "default_sets": 3,
        "default_reps": "8-10",
        "form": "Overhand grip wider than shoulders, pull chin above bar leading with chest, lower to full dead hang under control.",
    },
    "pushup": {
        "muscles": "Chest, Front Delts, Triceps, Core",
        "category": "Bodyweight Push",
        "default_sets": 3,
        "default_reps": "15-20",
        "form": "Hands shoulder-width, body in rigid straight plank, lower chest to floor with elbows at 45 degrees, push up explosively.",
    },
}

FITNESS_QA_TOPICS = {
    "protein": (
        "For muscle growth and recovery, aim for **1.6 to 2.2 grams of protein per kilogram of body weight** daily "
        "(or ~0.8 to 1.0g per pound). Space protein across 3–4 meals with 25–40g per meal."
    ),
    "water": (
        "General fitness recommendation: Drink **2.5 to 3.5 liters (10–14 cups)** of water daily, plus an additional 500ml "
        "for every hour of intense workout or sweating."
    ),
    "rest": (
        "Recommended rest intervals: **2 to 3 minutes** for heavy compound lifts (squats, bench, deadlifts) to maximize strength, "
        "and **60 to 90 seconds** for hypertrophy isolation exercises."
    ),
    "creatine": (
        "Take **3 to 5 grams of Creatine Monohydrate** daily consistently. Timing doesn't strictly matter, though post-workout with carbs/protein "
        "may marginally aid uptake. No loading phase is required."
    ),
    "fat loss": (
        "For sustainable fat loss, maintain a **moderate calorie deficit of 300–500 kcal below maintenance**, consume high protein (2g/kg) "
        "to preserve muscle, and lift weights 3–5 days per week."
    ),
    "weight gain": (
        "For lean muscle gain (bulking), aim for a **slight surplus of 250–400 kcal above maintenance** combined with progressive overload "
        "in resistance training. Target gaining ~0.25 to 0.5 kg per week."
    ),
}
