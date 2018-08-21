import gulp from "gulp";
import {spawn} from "child_process";
import hugoBin from "hugo-bin";
import sass from "gulp-sass";
import autoprefixer from "gulp-autoprefixer";
import log from "fancy-log";
import PluginError from "plugin-error"
import flatten from "gulp-flatten";
import BrowserSync from "browser-sync";
import webpack from "webpack";
import webpackConfig from "./webpack.conf";

const browserSync = BrowserSync.create();

// Hugo arguments
const hugoArgsDefault = ["-d", "../dist", "-s", "site", "-v"];
const hugoArgsPreview = ["--buildDrafts", "--buildFuture"];

// Development tasks
gulp.task("hugo", (cb) => buildSite(cb));

// Run server tasks
gulp.task("server", ["hugo", "sass", "js", "fonts"], (cb) => runServer(cb));

// Build/production tasks
gulp.task("build", ["sass", "js", "fonts"], (cb) => buildSite(cb, ["--baseURL","http://viveapp.com/"], "production"));


//Compile Sass with Gulp-Sass
gulp.task("sass", () => (
  gulp.src("./src/scss/*.scss")
  .pipe(sass({
    syntax: 'scss',
    outputStyle: 'compressed'
  }).on('error', sass.logError))
  .pipe(autoprefixer({
    browsers: ['last 2 versions'],
    cascade: false
  }))
  .pipe(gulp.dest("./dist/css"))
  .pipe(browserSync.stream())
));

// Compile Javascript
gulp.task("js", (cb) => {
  const myConfig = Object.assign({}, webpackConfig);

  webpack(myConfig, (err, stats) => {
    if (err) throw new PluginError("webpack", err);
    log("[webpack]", stats.toString({
      colors: true,
      progress: true
    }));
    browserSync.reload();
    cb();
  });
});

// Move all fonts in a flattened directory
gulp.task('fonts', () => (
  gulp.src("./src/fonts/**/*")
  .pipe(flatten())
  .pipe(gulp.dest("./dist/fonts"))
  .pipe(browserSync.stream())
));

// Development server with browsersync
function runServer() {
  browserSync.init({
    server: {
      baseDir: "./dist"
    }
  });
  gulp.watch("./src/js/**/*.js", ["js"]);
  gulp.watch("./src/scss/**/*.scss", ["sass"]);
  gulp.watch("./src/fonts/**/*", ["fonts"]);
  gulp.watch("./site/**/*", ["hugo"]);
};

/**
 * Run hugo and build the site
 */
function buildSite(cb, options, environment = "development") {
  const args = options ? hugoArgsDefault.concat(options) : hugoArgsDefault;

  process.env.NODE_ENV = environment;

  return spawn(hugoBin, args, {
    stdio: "inherit"
  }).on("close", (code) => {
    if (code === 0) {
      browserSync.reload();
      cb();
    } else {
      browserSync.notify("Hugo build failed :(");
      cb("Hugo build failed");
    }
  });
}