/**
 * Base abstract class for Gym Equipment Vision Providers.
 * Ensures all vision providers adhere to the same contract.
 */
class VisionProvider {
  /**
   * Identifies gym equipment from an image buffer.
   * @param {Buffer} imageBuffer - Raw image buffer
   * @param {string} mimeType - Image mime type, e.g. 'image/jpeg' or 'image/png'
   * @returns {Promise<{
   *   equipmentName: string,
   *   possibleAlternatives: string[],
   *   confidence: number,
   *   reasoning: string,
   *   isUncertain: boolean,
   *   detectedMultiple: boolean,
   *   multipleEquipment: string[]
   * }>}
   */
  async identifyEquipment(imageBuffer, mimeType = 'image/jpeg') {
    throw new Error('identifyEquipment() must be implemented by subclass');
  }
}

module.exports = VisionProvider;
