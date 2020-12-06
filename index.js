const path = require('path');
const through = require('through2');
const fsx = require('fs-extra');
const replaceExt = require('replace-ext');
const PluginError = require('plugin-error');

const manifestDir = '.gulp-remove';

// 载入上一次编译生成的 manifest
function loadManifest(filepath) {
  try {
    return fsx.readJSONSync(filepath);
  } catch (error) {
    return {};
  }
}

// 写入本次编译生成的 manifest
function writeManifest(filepath, manifest) {
  try {
    const dirname = path.dirname(filepath);
    if (!fsx.existsSync(dirname)) {
      fsx.mkdirSync(dirname);
    }
    fsx.writeJSONSync(filepath, manifest, { spaces: 2 });
  } catch (error) {}
}

// 在内存中删除上一次编译的 manifest 里的键值对
function deleteRecordFromManifest(manifest, key) {
  try {
    delete manifest[key];
  } catch (error) {}
}

module.exports = function (name, destination, options = {}) {
  options = {
    cwd: process.cwd(),
    ...options,
  };

  // 用于生成 manifest 名字
  if (!name) {
    throw new PluginError('gulp-remove', '`name` required');
  }

  // 用于删除构建文件
  if (!destination) {
    throw new PluginError('gulp-remove', '`destination` required');
  }

  const manifestPath = path.resolve(options.cwd, manifestDir, `${name}-manifest.json`);
  const oldManifest = loadManifest(manifestPath);
  const newManifest = {};

  // 记录本次编译的 manifest，并在旧的 manifest 中删除仍然存在的文件的键值对
  function manifest() {
    return through.obj(function (file, _, cb) {
      let filepath = file.relative;
      const dirPath = path.dirname(filepath);
      if (options.extension) {
        filepath = replaceExt(filepath, options.extension);
      }

      newManifest[filepath] = file.stat && Math.floor(file.stat.mtimeMs);
      newManifest[dirPath] = true;

      deleteRecordFromManifest(oldManifest, filepath);
      deleteRecordFromManifest(oldManifest, dirPath);

      cb(null, file);
    });
  }

  // 删除旧的 manifest 中存在的键值对对应的构建文件
  function remove() {
    const removeList = Object.keys(oldManifest);

    removeList.forEach((filepath) => {
      fsx.remove(path.join(options.cwd, destination, filepath));
    });

    writeManifest(manifestPath, newManifest);
  }

  return {
    manifest,
    remove,
  };
};
