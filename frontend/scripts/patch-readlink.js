const fs = require("fs");

const originalReadlink = fs.readlink.bind(fs);
const originalReadlinkSync = fs.readlinkSync.bind(fs);
const originalPromisesReadlink = fs.promises.readlink.bind(fs.promises);

function normalizeCallback(callback) {
  return typeof callback === "function" ? callback : () => undefined;
}

fs.readlink = function patchedReadlink(path, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }
  const wrapped = normalizeCallback(callback);
  originalReadlink(path, options, (error, target) => {
    if (error && error.code === "EISDIR") {
      wrapped(null, null);
      return;
    }
    wrapped(error, target);
  });
};

fs.readlinkSync = function patchedReadlinkSync(path, options) {
  try {
    return originalReadlinkSync(path, options);
  } catch (error) {
    if (error && error.code === "EISDIR") {
      return null;
    }
    throw error;
  }
};

fs.promises.readlink = async function patchedPromisesReadlink(path, options) {
  try {
    return await originalPromisesReadlink(path, options);
  } catch (error) {
    if (error && error.code === "EISDIR") {
      return null;
    }
    throw error;
  }
};
