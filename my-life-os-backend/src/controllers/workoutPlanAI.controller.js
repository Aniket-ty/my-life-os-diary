const prisma = require('../config/database');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PLAN_SYSTEM_PROMPT = `You are an expert fitness coach. Generate a structured weekly workout plan.

Respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "name": "My Weekly Plan",
  "goal": "lose|maintain|gain",
  "fitnessLevel": "beginner|intermediate|advanced",
  "daysPerWeek": 5,
  "days": [
    {
      "dayNumber": 1,
      "workoutName": "Push Day",
      "muscleGroup": "Chest, Shoulders, Triceps",
      "restDay": false,
      "notes": "Focus on controlled tempo",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "8-10" },
        { "name": "Overhead Press", "sets": 3, "reps": "8-12" },
        { "name": "Lateral Raises", "sets": 3, "reps": "12-15" }
      ]
    }
  ]
}

Rules:
- 1 workout day: 4-6 exercises with sets/reps
- Include appropriate rest days (restDay: true)
- Choose exercises matching the fitness level and available equipment
- Weight loss plans: include 1-2 cardio/HIIT sessions as cardio days (muscleGroup "Cardio")
- Make the plan split logical: push/pull/legs, upper/lower, or full body for beginners
`;

const generatePlan = async (req, res) => {
  try {
    const { goal = 'maintain', fitnessLevel = 'beginner', daysPerWeek = 5, equipment = [], focus } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const latestScan = await prisma.bodyScan.findFirst({
      where: { userId: req.user.id },
      orderBy: { scanDate: 'desc' },
    });
    const goals = await prisma.fitnessGoal.findUnique({ where: { userId: req.user.id } });

    const userContext = `User context:
- Name: ${user.name}
- Goal: ${goal}
- Fitness level: ${fitnessLevel}
- Days per week: ${daysPerWeek}
- Available equipment: ${equipment.length ? equipment.join(', ') : 'None (bodyweight/home)'}
- Age: ${user.age}, Gender: ${user.gender || 'unknown'}
- Current weight: ${latestScan ? Number(latestScan.weight) : 'N/A'} kg
- Daily calorie goal: ${goals?.dailyCalories || 'N/A'}
${focus ? `- Focus areas: ${focus}` : ''}`;

    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: PLAN_SYSTEM_PROMPT },
        { role: 'user', content: userContext },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || '';
    // Extract JSON object from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI returned an invalid plan format' });
    }

    const planData = JSON.parse(jsonMatch[0]);
    if (!planData.days || !Array.isArray(planData.days)) {
      return res.status(500).json({ error: 'AI plan is missing days' });
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