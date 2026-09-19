const GroqVisionProvider = require('./groqVisionProvider');
const OpenAiVisionProvider = require('./openAiVisionProvider');
const MockVisionProvider = require('./mockVisionProvider');

/**
 * Returns an instance of the configured Vision Provider based on AI_VISION_PROVIDER.
 * Supported values: 'groq' (default), 'openai', 'mock'.
 */
function getVisionProvider(overrideProvider) {
  const providerName = (
    overrideProvider ||
    process.env.AI_VISION_PROVIDER ||
    (process.env.OPENAI_API_KEY ? 'openai' : process.env.GROQ_API_KEY ? 'groq' : 'mock')
  ).toLowerCase();

  switch (providerName) {
    case 'openai':
      return new OpenAiVisionProvider();

    case 'mock':
      return new MockVisionProvider();

    case 'groq':
      if (process.env.GROQ_API_KEY) {
        return new GroqVisionProvider();
      }
      if (process.env.OPENAI_API_KEY) {
        return new OpenAiVisionProvider();
      }
      return new MockVisionProvider();

    default:
      if (process.env.OPENAI_API_KEY) {
        return new OpenAiVisionProvider();
      }
      if (process.env.GROQ_API_KEY) {
        return new GroqVisionProvider();
      }
      return new MockVisionProvider();
  }
}

module.exports = {
  getVisionProvider,
  GroqVisionProvider,
  OpenAiVisionProvider,
  MockVisionProvider,
};
