const prisma = require('../config/database');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    const OpenAI = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch (err) {
    console.warn('OpenAI SDK load failed in workoutPlanAI:', err.message);
  }
}

let groq = null;
if (process.env.GROQ_API_KEY) {
  try {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } catch (err) {
    console.warn('Groq SDK load failed in workoutPlanAI:', err.message);
  }
}

const PLAN_SYSTEM_PROMPT = `You are an expert fitness coach and exercise physiologist. Generate a structured weekly workout plan tailored specifically to the user's requirements, preferred split, and preferences.

Respond with ONLY a valid JSON object (no markdown, no code fences, no extra text):
{
  "name": "Custom Weekly Plan",
  "goal": "lose|maintain|gain",
  "fitnessLevel": "beginner|intermediate|advanced",
  "daysPerWeek": 5,
  "days": [
    {
      "dayNumber": 1,
      "workoutName": "Push Day (Chest, Shoulders, Triceps)",
      "muscleGroup": "Chest, Shoulders, Triceps",
      "restDay": false,
      "notes": "Focus on controlled eccentrics and progressive overload",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "8-10", "restSec": 90 }
      ]
    },
    {
      "dayNumber": 2,
      "workoutName": "Rest & Recovery",
      "muscleGroup": "",
      "restDay": true,
      "notes": "Active recovery, stretching or light walking",
      "exercises": []
    }
  ]
}

Rules:
- dayNumber uses 0-based weekday index: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday. Include ALL 7 days, marking rest days with restDay: true.
- Respect the user's PREFERRED SPLIT (e.g. Push/Pull/Legs, Upper/Lower, Arnold Split, Bro Split, Full Body, Home/Dumbbell).
- Strictly adhere to user PREFERENCES, restrictions, favorite movements, and target focus areas.
- For each exercise, provide: name, sets (number), reps (string e.g. "8-12"), and restSec (number, typically 60, 90, or 120 sec).
- Keep exercise names clean and standard so they link with demonstration video catalog (e.g. "Bench Press", "Lat Pulldown", "Incline Dumbbell Press", "Leg Press", "Smith Machine Squat", "Seated Cable Row", "Pec Deck Fly", "Barbell Bicep Curl").
- Keep the response CONCISE and valid JSON.
`;

function buildFallbackPlan({ goal, fitnessLevel, daysPerWeek, equipment, focus, preferences, splitType }) {
  const isGain = goal === 'gain';
  const sets = isGain ? 4 : 3;
  const reps = isGain ? '8-10' : '10-12';
  const restSec = isGain ? 90 : 60;

  const prefTitle = splitType || (daysPerWeek >= 5 ? 'Push Pull Legs' : daysPerWeek >= 4 ? 'Upper Lower Split' : 'Full Body Split');

  const days = [
    {
      dayNumber: 0,
      workoutName: 'Rest & Mobility',
      muscleGroup: 'Recovery',
      restDay: true,
      notes: 'Active recovery, stretching, or light walk',
      exercises: [],
    },
    {
      dayNumber: 1,
      workoutName: 'Chest & Triceps Push',
      muscleGroup: 'Chest, Triceps',
      restDay: false,
      notes: 'Focus on full range of motion and chest stretch',
      exercises: [
        { name: 'Bench Press', sets, reps, restSec },
        { name: 'Incline Dumbbell Press', sets, reps, restSec },
        { name: 'Pec Deck Chest Fly', sets, reps: '12-15', restSec: 60 },
        { name: 'Cable Tricep Pushdown', sets, reps: '12-15', restSec: 60 },
      ],
    },
    {
      dayNumber: 2,
      workoutName: 'Back & Biceps Pull',
      muscleGroup: 'Back, Biceps',
      restDay: false,
      notes: 'Drive elbows down and squeeze back muscles',
      exercises: [
        { name: 'Wide-Grip Lat Pulldown', sets, reps, restSec },
        { name: 'Seated Cable Row', sets, reps, restSec },
        { name: 'Preacher Curl', sets, reps: '10-12', restSec: 60 },
        { name: 'Face Pull', sets, reps: '15', restSec: 60 },
      ],
    },
    {
      dayNumber: 3,
      workoutName: 'Legs & Core Power',
      muscleGroup: 'Quads, Hamstrings, Calves',
      restDay: false,
      notes: 'Brace core and maintain knees tracking over toes',
      exercises: [
        { name: 'Leg Press', sets, reps, restSec: 90 },
        { name: 'Leg Extension', sets, reps: '12-15', restSec: 60 },
        { name: 'Lying Leg Curl', sets, reps: '12-15', restSec: 60 },
        { name: 'Calf Raise', sets, reps: '15-20', restSec: 60 },
      ],
    },
    {
      dayNumber: 4,
      workoutName: 'Rest & Conditioning',
      muscleGroup: 'Cardio',
      restDay: daysPerWeek < 5,
      notes: daysPerWeek < 5 ? 'Rest and hydration day' : 'Zone 2 cardio or active recovery',
      exercises: daysPerWeek >= 5 ? [
        { name: 'Shoulder Press Machine', sets, reps, restSec },
        { name: 'Dumbbell Lateral Raise', sets: 4, reps: '15', restSec: 45 },
      ] : [],
    },
    {
      dayNumber: 5,
      workoutName: 'Upper Body Hypertrophy',
      muscleGroup: 'Upper Body',
      restDay: daysPerWeek < 4,
      notes: 'Moderate weight with controlled negatives',
      exercises: daysPerWeek >= 4 ? [
        { name: 'Incline Dumbbell Press', sets, reps, restSec },
        { name: 'Lat Pulldown', sets, reps, restSec },
        { name: 'Cable Crossover', sets, reps: '12-15', restSec: 60 },
      ] : [],
    },
    {
      dayNumber: 6,
      workoutName: 'Rest Day',
      muscleGroup: 'Recovery',
      restDay: true,
      notes: 'Rest and prepare for next week',
      exercises: [],
    },
  ];

  return {
    name: `${prefTitle} (${fitnessLevel.toUpperCase()})`,
    goal,
    fitnessLevel,
    daysPerWeek,
    days,
  };
}

const generatePlan = async (req, res) => {
  try {
    const {
      goal = 'maintain',
      fitnessLevel = 'beginner',
      daysPerWeek = 5,
      equipment = [],
      focus = '',
      preferences = '',
      splitType = '',
      workoutDuration = '',
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const latestScan = await prisma.bodyScan.findFirst({
      where: { userId: req.user.id },
      orderBy: { scanDate: 'desc' },
    });
    const goals = await prisma.fitnessGoal.findUnique({ where: { userId: req.user.id } });

    if (!openai && !groq) {
      const fallback = buildFallbackPlan({ goal, fitnessLevel, daysPerWeek, equipment, focus, preferences, splitType });
      return res.json(fallback);
    }

    const userContext = `User context:
- Name: ${user.name}
- Goal: ${goal}
- Fitness level: ${fitnessLevel}
- Days per week: ${daysPerWeek}
- Preferred Workout Split: ${splitType || 'Balanced split (PPL / Upper Lower)'}
- Target Session Duration: ${workoutDuration || '45-60 minutes'}
- Available equipment: ${equipment.length ? equipment.join(', ') : 'Full commercial gym'}
- Age: ${user.age || 'N/A'}, Gender: ${user.gender || 'unknown'}
- Current weight: ${latestScan ? Number(latestScan.weight) : 'N/A'} kg
- Daily calorie goal: ${goals?.dailyCalories || 'N/A'}
${focus ? `- Muscle focus areas: ${focus}` : ''}
${preferences ? `- User Custom Preferences & Requirements: "${preferences}"` : ''}`;

    let planData = null;

    try {
      let content = '';
      if (openai) {
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: PLAN_SYSTEM_PROMPT },
            { role: 'user', content: userContext },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 4096,
        });
        content = response.choices[0]?.message?.content || '';
      } else if (groq) {
        const response = await groq.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: PLAN_SYSTEM_PROMPT },
            { role: 'user', content: userContext },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        });
        content = response.choices[0]?.message?.content || '';
      }

      content = content.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();

      const firstBrace = content.indexOf('{');
      if (firstBrace !== -1) {
        let depth = 0;
        let end = -1;
        for (let i = firstBrace; i < content.length; i++) {
          if (content[i] === '{') depth++;
          else if (content[i] === '}') {
            depth--;
            if (depth === 0) { end = i; break; }
          }
        }
        if (end > firstBrace) {
          try {
            planData = JSON.parse(content.substring(firstBrace, end + 1));
          } catch {
            const partial = content.substring(firstBrace, end + 1);
            const lastCompleteDay = partial.lastIndexOf('}');
            if (lastCompleteDay > 0) {
              const repaired = partial.substring(0, lastCompleteDay + 1) + ']}';
              try { planData = JSON.parse(repaired); } catch { /* ignore */ }
            }
          }
        }
      }

      if (!planData) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { planData = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
        }
      }
    } catch (apiErr) {
      console.warn('AI workout plan generation failed, falling back to deterministic plan:', apiErr.message);
      planData = buildFallbackPlan({ goal, fitnessLevel, daysPerWeek, equipment, focus, preferences, splitType });
    }

    if (!planData || !planData.days || !Array.isArray(planData.days)) {
      planData = buildFallbackPlan({ goal, fitnessLevel, daysPerWeek, equipment, focus, preferences, splitType });
    }

    res.json({
      name: planData.name || 'My Weekly Plan',
      goal: planData.goal || goal,
      fitnessLevel: planData.fitnessLevel || fitnessLevel,
      daysPerWeek: planData.daysPerWeek || daysPerWeek,
      days: planData.days,
    });
  } catch (e) {
    console.error('Plan generation error:', e.message);
    res.status(500).json({ error: 'Failed to generate plan: ' + e.message });
  }
};

module.exports = { generatePlan };