const VisionProvider = require('./visionProvider');

class OpenAiVisionProvider extends VisionProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  async identifyEquipment(imageBuffer, mimeType = 'image/jpeg') {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    const fetch = global.fetch || require('node-fetch');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a gym machine identification expert. Identify the gym equipment and return ONLY valid JSON: {"equipmentName": string, "possibleAlternatives": string[], "confidence": number, "reasoning": string, "isUncertain": boolean, "detectedMultiple": boolean, "multipleEquipment": string[]}',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify the gym equipment in this photo.' },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI Vision request failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      equipmentName: String(parsed.equipmentName || 'Unknown Equipment').trim(),
      possibleAlternatives: Array.isArray(parsed.possibleAlternatives) ? parsed.possibleAlternatives : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      reasoning: parsed.reasoning || '',
      isUncertain: Boolean(parsed.isUncertain || (parsed.confidence && parsed.confidence < 0.65)),
      detectedMultiple: Boolean(parsed.detectedMultiple),
      multipleEquipment: Array.isArray(parsed.multipleEquipment) ? parsed.multipleEquipment : [],
    };
  }
}

module.exports = OpenAiVisionProvider;
