const python = require('./ai/pythonClient');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    const OpenAI = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch {
    // ignore
  }
}

let groq = null;
if (process.env.GROQ_API_KEY) {
  try {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } catch {
    // ignore
  }
}

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
  // 1. Try dedicated Python service (which uses inline local scripts first for 0-cost & instant replies)
  if (python.isConfigured()) {
    try {
      const pyRes = await python.postJson('/assistant/chat', {
        message: userMessage,
        history,
        userContext,
      });
      if (pyRes && pyRes.text) {
        return {
          text: pyRes.text,
          action: pyRes.action || null,
          source: pyRes.source || 'python-inline',
        };
      }
    } catch {
      // Fall through to Node-side OpenAI fallback
    }
  }

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

  let fullText = '';

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      });
      fullText = response.choices[0]?.message?.content || '';
    } catch (err) {
      console.warn('OpenAI chat failed, falling back to Groq:', err.message);
    }
  }

  if (!fullText && groq) {
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });
    fullText = response.choices[0]?.message?.content || '';
  }

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

// ── Food photo analysis ────────────────────────────────

const VISION_MODELS = [
  'qwen/qwen3.8-27b',
];

const FOOD_IMAGE_PROMPT = `You are a food nutrition expert. Look at the food photo and identify what food it is.
Estimate its nutrition PER 100 GRAMS (raw edible portion). Be realistic and specific.

Respond with ONLY valid JSON and nothing else, using this exact shape:
{
  "foodName": "Grilled chicken breast",
  "per100g": { "calories": 165, "proteinG": 31, "carbsG": 0, "fatG": 3.6 },
  "serving": "1 medium breast (~120g)",
  "note": "one short helpful line, or empty string"
}`;

const parseJson = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

const analyzeFoodImage = async (imageBase64, mimeType = 'image/jpeg') => {
  const dataUri = `data:${mimeType};base64,${imageBase64}`;
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: FOOD_IMAGE_PROMPT },
        { type: 'image_url', image_url: { url: dataUri } },
      ],
    },
  ];

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.2,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '';
      const parsed = parseJson(content);
      if (parsed?.foodName && parsed?.per100g) {
        return {
          foodName: parsed.foodName,
          per100g: {
            calories: Math.max(0, Math.round(Number(parsed.per100g.calories) || 0)),
            proteinG: Math.max(0, Math.round((Number(parsed.per100g.proteinG) || 0) * 10) / 10),
            carbsG: Math.max(0, Math.round((Number(parsed.per100g.carbsG) || 0) * 10) / 10),
            fatG: Math.max(0, Math.round((Number(parsed.per100g.fatG) || 0) * 10) / 10),
          },
          serving: parsed.serving || null,
          note: parsed.note || null,
        };
      }
    } catch (err) {
      console.warn('OpenAI food analysis failed, trying Groq:', err.message);
    }
  }

  if (groq) {
    for (const model of VISION_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 512,
        });

        const content = response.choices[0]?.message?.content || '';
        const parsed = parseJson(content);
        if (parsed?.foodName && parsed?.per100g) {
          return {
            foodName: parsed.foodName,
            per100g: {
              calories: Math.max(0, Math.round(Number(parsed.per100g.calories) || 0)),
              proteinG: Math.max(0, Math.round((Number(parsed.per100g.proteinG) || 0) * 10) / 10),
              carbsG: Math.max(0, Math.round((Number(parsed.per100g.carbsG) || 0) * 10) / 10),
              fatG: Math.max(0, Math.round((Number(parsed.per100g.fatG) || 0) * 10) / 10),
            },
            serving: parsed.serving || null,
            note: parsed.note || null,
          };
        }
      } catch {
        // continue
      }
    }
  }

  throw new Error('No vision model available for food analysis');
};

// ── Handwriting recognition ────────────────────────────

const HANDWRITING_PROMPT = `You are a handwriting transcription engine. The image contains handwritten notes drawn with a pen or stylus (possibly light-colored strokes on a dark background).

Transcribe EVERYTHING that is written — every word, number, and punctuation — preserving line breaks as separate lines.

Rules:
- Do not add any commentary, quotes, or markdown formatting.
- Output only the transcribed text.
- If you genuinely cannot read something, keep a clear dash "-" in its place.
- If the image is blank or has no handwriting, output exactly: EMPTY`;

const parseText = (text) => {
  const cleaned = text.trim().replace(/^```(?:text|txt)?/i, '').replace(/```$/i, '').trim();
  if (/^EMPTY$/i.test(cleaned)) return '';
  return cleaned;
};

const recognizeHandwriting = async (imageBase64, mimeType = 'image/png') => {
  const dataUri = `data:${mimeType};base64,${imageBase64}`;
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: HANDWRITING_PROMPT },
        { type: 'image_url', image_url: { url: dataUri } },
      ],
    },
  ];

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0,
        max_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content || '';
      const text = parseText(content);
      if (text) return { text };
    } catch (err) {
      console.warn('OpenAI handwriting failed, trying Groq:', err.message);
    }
  }

  if (groq) {
    for (const model of VISION_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages,
          temperature: 0,
          max_tokens: 2048,
        });

        const content = response.choices[0]?.message?.content || '';
        const text = parseText(content);
        if (text) return { text };
      } catch {
        // continue
      }
    }
  }

  throw new Error('No vision model available for handwriting transcription');
};

module.exports = { chatWithAI, analyzeFoodImage, recognizeHandwriting };
