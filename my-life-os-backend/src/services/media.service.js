const cloudinary = require('../config/cloudinary');

const FOLDER_MAP = {
  photo: 'my-life-os/diary/photos',
  audio: 'my-life-os/diary/audio',
  video: 'my-life-os/diary/videos',
};

const RESOURCE_TYPE_MAP = {
  photo: 'image',
  audio: 'video',  // Cloudinary uses 'video' resource type for audio too
  video: 'video',
};

// Upload file buffer to Cloudinary
const uploadMedia = (file, mediaType) => {
  return new Promise((resolve, reject) => {
    const folder = FOLDER_MAP[mediaType];
    const resourceType = RESOURCE_TYPE_MAP[mediaType];

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        // For audio: extract duration metadata
        eager: mediaType === 'audio' ? [{ format: 'mp3' }] : [],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });
};

// Delete file from Cloudinary
const deleteMedia = async (cloudinaryId, mediaType) => {
  try {
    const resourceType = RESOURCE_TYPE_MAP[mediaType] || 'image';
    await cloudinary.uploader.destroy(cloudinaryId, { resource_type: resourceType });
  } catch (error) {
    // Log but don't throw — entry deletion should still proceed
    console.error('Cloudinary delete error:', error.message);
  }
};

module.exports = { uploadMedia, deleteMedia };
