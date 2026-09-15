const prisma = require('../config/database');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PLAN_SYSTEM_PROMPT = `You are an expert fitness coach. Generate a structured weekly workout plan.

Respond with ONLY a valid JSON object (no markdown, no code fences, no extra text):
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
      "notes": "",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "8-10" }
      ]
    },
    {
      "dayNumber": 2,
      "workoutName": "Rest",
      "muscleGroup": "",
      "restDay": true,
      "notes": "",
      "exercises": []
    }
  ]
}

Rules:
- dayNumber uses 0-based weekday index: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday. Include ALL 7 days, marking rest days with restDay: true.
- Each workout day: 4-5 exercises with sets/reps. Keep exercises SHORT (name max 3 words).
- Include appropriate rest days (restDay: true)
- Choose exercises matching the fitness level and available equipment
- Weight loss plans: include 1-2 cardio/HIIT sessions as cardio days (muscleGroup "Cardio")
- Make the plan split logical: push/pull/legs, upper/lower, or full body for beginners
- Keep the response CONCISE to fit within token limits
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
      max_tokens: 4096,
    });

    let content = response.choices[0]?.message?.content || '';
    // Strip markdown code fences if present
    content = content.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();

    // Extract JSON object using balanced brace matching
    let planData = null;
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
        } catch (parseErr) {
          console.error('Plan JSON parse failed, attempting repair:', parseErr.message);
          // Try truncating at last complete day entry and closing brackets
          const partial = content.substring(firstBrace, end + 1);
          const lastCompleteDay = partial.lastIndexOf('}');
          if (lastCompleteDay > 0) {
            const repaired = partial.substring(0, lastCompleteDay + 1) + ']}';
            try {
              planData = JSON.parse(repaired);
            } catch { /* give up */ }
          }
        }
      }
    }

    // Fallback: greedy regex (original approach)
    if (!planData) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { planData = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
      }
    }

    if (!planData) {
      return res.status(500).json({ error: 'AI returned an invalid plan format' });
    }
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