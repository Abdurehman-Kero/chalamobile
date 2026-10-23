const { v2: cloudinary } = require('cloudinary');

// Product photos live at Cloudinary: the host's own disk is wiped on every redeploy.
const isConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const configure = () => cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Uploads one image from memory. Large photos are scaled down to 1600px wide.
function uploadImage(buffer) {
  configure();
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'chala/products', resource_type: 'image', transformation: [{ width: 1600, crop: 'limit' }] },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id })),
    ).end(buffer);
  });
}

function deleteImage(publicId) {
  if (!publicId || !isConfigured()) return Promise.resolve();
  configure();
  return cloudinary.uploader.destroy(publicId).catch((e) => console.error('[images.delete]', e.message));
}

module.exports = { isConfigured, uploadImage, deleteImage };
