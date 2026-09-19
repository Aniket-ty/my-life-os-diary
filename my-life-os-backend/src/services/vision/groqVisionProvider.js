const VisionProvider = require('./visionProvider');
const Groq = require('groq-sdk');

const DEFAULT_VISION_MODELS = [
  'qwen/qwen3.8-27b',
  'llama-3.2-11b-vision-preview',
  'llama-3.2-90b-vision-preview'
];

const SYSTEM_PROMPT = `You are an expert fitness gym equipment identification engine.
Your task is to analyze photographs of gym machines, equipment, benches, and free weights, and identify the exact gym equipment.

Common Gym Equipment to recognize:
- Lat Pulldown Machine
- Cable Crossover / Functional Trainer
- Seated Cable Row
- Chest Press Machine
- Pec Deck / Butterfly Machine
- Shoulder Press Machine
- Leg Press / 45 Degree Leg Press
- Leg Extension Machine
- Leg Curl / Lying Hamstring Curl
- Smith Machine
- Squat Rack / Power Cage
- Olympic Barbell / Barbell
- Dumbbells
- Adjustable Bench
- Preacher Curl Machine
- Assisted Pull-Up / Dip Machine
- Hip Abduction Machine
- Hip Adduction Machine
- Calf Raise Machine
- Hack Squat Machine

RULES:
1. Return ONLY a valid JSON object matching the schema below. No markdown explanations outside JSON.
2. If the photo is blurry, dark, obstructed, or does not clearly show a gym machine, set "confidence" < 0.60 and "isUncertain": true.
3. If multiple pieces of equipment are clearly visible in the foreground/midground, set "detectedMultiple": true and list their names in "multipleEquipment".
4. "confidence" must be a float between 0.00 and 1.00.

JSON SCHEMA:
{
  "equipmentName": "Lat Pulldown Machine",
  "possibleAlternatives": ["Cable Pulldown", "High Lat Pull"],
  "confidence": 0.94,
  "reasoning": "Visible overhead pulley bar, thigh hold-down pads, and selectorized weight stack.",
  "isUncertain": false,
  "detectedMultiple": false,
  "multipleEquipment": []
}`;

class GroqVisionProvider extends VisionProvider {
  constructor(apiKey) {
    super();
    this.groq = new Groq({ apiKey: apiKey || process.env.GROQ_API_KEY });
  }

  async identifyEquipment(imageBuffer, mimeType = 'image/jpeg') {
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    const models = process.env.GROQ_VISION_MODEL
      ? [process.env.GROQ_VISION_MODEL, ...DEFAULT_VISION_MODELS]
      : DEFAULT_VISION_MODELS;

    let lastError = null;

    for (const model of models) {
      try {
        const response = await this.groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Identify the primary gym machine or equipment in this image. Return valid JSON only.',
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUri },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 512,
        });

        const content = response.choices[0]?.message?.content || '';
        const parsed = this._parseJson(content);

        if (parsed && parsed.equipmentName) {
          return {
            equipmentName: String(parsed.equipmentName).trim(),
            possibleAlternatives: Array.isArray(parsed.possibleAlternatives)
              ? parsed.possibleAlternatives.map(String)
              : [],
            confidence: typeof parsed.confidence === 'number'
              ? Math.max(0, Math.min(1, parsed.confidence))
              : 0.85,
            reasoning: parsed.reasoning || '',
            isUncertain: Boolean(parsed.isUncertain || (parsed.confidence && parsed.confidence < 0.65)),
            detectedMultiple: Boolean(parsed.detectedMultiple),
            multipleEquipment: Array.isArray(parsed.multipleEquipment)
              ? parsed.multipleEquipment.map(String)
              : [],
          };
        }
      } catch (err) {
        lastError = err;
        // Try next fallback model
      }
    }

    if (lastError) throw lastError;
    throw new Error('Groq Vision models failed to identify the equipment.');
  }

  _parseJson(text) {
    try {
      const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return null;
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

module.exports = GroqVisionProvider;
