const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a personal health and fitness assistant inside "My Life OS" app.

Your job:
1. Answer questions about food — give calories, protein, carbs, fat per standard serving
2. Answer questions about exercises — muscles worked, proper form, suggested sets/reps, calories burned
3. Help the user track their daily nutrition and workouts
4. Be encouraging, concise, and specific

IMPORTANT — Action blocks:
When the user wants to LOG food, respond with this exact JSON block at the END of your message:
ACTION:{"type":"log_food","data":{"foodName":"...","calories":0,"proteinG":0,"carbsG":0,"fatG":0,"mealType":"lunch","quantity":"..."}}

When the user wants to ADD a workout, respond with this exact JSON block at the END:
ACTION:{"type":"add_workout","data":{"workoutName":"...","exercises":[{"exerciseName":"...","sets":3,"reps":"10"}]}}

Only include an ACTION block when the user explicitly says to log, add, or track something.
Keep responses under 200 words unless explaining a detailed topic.`;

const chatWithAI = async (userMessage, history, userContext) => {
  const messages = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nUser context:\n${userContext}`,
    },
    ...history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages,
    temperature: 0.7,
    max_tokens: 1024,
  });

  const fullText = response.choices[0]?.message?.content || '';

  // Parse action block if present
  const actionMatch = fullText.match(/ACTION:(\{.*\})/s);
  let action = null;
  let text = fullText;

  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1]);
      text = fullText.replace(/ACTION:\{.*\}/s, '').trim();
    } catch {
      // If JSON parse fails, return text as-is
    }
  }

  return { text, action };
};

module.exports = { chatWithAI };
