import path from "path";
import through from "through2";
import fsx from "fs-extra";
import replaceExt from "replace-ext";
import PluginError from "plugin-error";

type Require<T, K extends keyof T> = T & Required<Pick<T, K>>;
type Options = {
  cwd?: string;
  extension?: string | string[];
};

type Manifest = Record<string, number | boolean>;

const manifestDir = "node_modules/.cache/gulp-remove";

// 载入上一次编译生成的 manifest
function loadManifest(filepath: string): Manifest {
  try {
    return fsx.readJSONSync(filepath);
  } catch (error) {
    return {};
  }
}

// 写入本次编译生成的 manifest
function writeManifest(filepath: string, manifest: Manifest) {
  try {
    const dirname = path.dirname(filepath);
    if (!fsx.existsSync(dirname)) {
      fsx.mkdirSync(dirname);
    }
    fsx.writeJSONSync(filepath, manifest, { spaces: 2 });
  } catch (error) {}
}

// 在内存中删除上一次编译的 manifest 里的键值对
function deleteRecordFromManifest(manifest: Manifest, key: string) {
  try {
    delete manifest[key];
  } catch (error) {}
}

function gulpRemove (name: string, destination: string, options: Options = {}) {
  const _options: Require<Options, "cwd"> = {
    cwd: process.cwd(),
    extension: "",
    ...options,
  };

  // 用于生成 manifest 名字
  if (!name) {
    throw new PluginError("gulp-remove", "`name` required");
  }

  // 用于删除构建文件
  if (!destination) {
    throw new PluginError("gulp-remove", "`destination` required");
  }

  const manifestPath = path.resolve(_options.cwd, manifestDir, `${name}-manifest.json`);
  const oldManifest = loadManifest(manifestPath);
  const newManifest: Manifest = {};

  // 记录本次编译的 manifest，并在旧的 manifest 中删除仍然存在的文件的键值对
  function manifest() {
    return through.obj(function (file, _, cb) {
      const filepath = file.relative;
      const fileList = [];
      const dirPath = path.dirname(file.relative);

      if (typeof _options.extension === "string") {
        fileList.push(replaceExt(filepath, _options.extension));
      }

      // 支持一对多映射
      if (_options.extension instanceof Array) {
        _options.extension.forEach((ext) => {
          fileList.push(replaceExt(filepath, ext));
        });
      }

      fileList.forEach((f) => {
        newManifest[f] = file.stat && Math.floor(file.stat.mtimeMs);
        deleteRecordFromManifest(oldManifest, f);
      });

      newManifest[dirPath] = true;
      deleteRecordFromManifest(oldManifest, dirPath);

      cb(null, file);
    });
  }

  // 删除旧的 manifest 中存在的键值对对应的构建文件
  function remove() {
    const removeList = Object.keys(oldManifest);

    removeList.forEach((filepath) => {
      if (fsx.existsSync(filepath)) {
        // 文件夹不为空时不处理
        if (fsx.statSync(filepath).isDirectory() && fsx.readdirSync(filepath).length) {
          return;
        }
      }
      fsx.remove(path.join(_options.cwd, destination, filepath));
    });

    writeManifest(manifestPath, newManifest);
  }

  return {
    manifest,
    remove,
  };
}

export = gulpRemove;
