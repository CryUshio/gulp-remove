# gulp-remove ![build](https://img.shields.io/badge/build-passing-green)
未运行 `gulp` 时删除的文件无法通过 `unlink` 同步删除，本插件支持删除多余的构建产物（仅一对一删除）。

## Install

```
$ npm install --save-dev gulp-remove
```

## Usage

```js
const gulp = require('gulp');
const gulpRemove = require('gulp-remove');

const DIST = 'dist';

const { manifest, remove } = gulpRemove('js', DIST);

exports.default = () => (
  gulp.src('src/*.js')
    .pipe(manifest())
    .pipe(gulp.dest(DIST))
    .on('end', function () {
      // 所有文件都编译完了
      remove();
    })
  );
```

## API
### gulpRemove(name, destination, options?)
#### name
Type: `string`  
作为 `manifest` 文件名，每一个 `task` 都应该有一个唯一的 `name`。
#### destination
Type: `string`  
构建相对目录，用于删除源码未跟踪的已经删除的文件对应的构建结果。
#### options
Type: `object`

##### cwd
Type: `string`  
Default: `process.cwd()`

#### Return
Type: `object`
##### manifest
Type: `function`  
Return: `NodeJS.ReadWriteStream`
对比前一次构建的 `manifest`，生成本次构建的 `manifest`。

##### remove
Type: `function`  
Return: `void`
删除文件并将新的 `manifest` 写入文件。
