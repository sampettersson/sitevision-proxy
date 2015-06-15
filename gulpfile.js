'use strict';

// Dependencies
var argv = require('yargs').argv;
var browserify = require('browserify');
var transform = require('vinyl-transform');
var notifier = require('node-notifier');
var livereload = require('gulp-livereload');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var order = require('gulp-order');
var plumber = require('gulp-plumber');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minify = require('gulp-minify-css');
var rename = require('gulp-rename');
var prefix = require('gulp-autoprefixer');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var bower = require('gulp-bower');
var rimraf = require('rimraf');
var dev = !!(argv.dev);

// Set build folder path
var wp = false;

// Directories
var path = {
    src: {
        scss: 'assets/scss/',
        js: 'assets/js/',
        lib: 'lib/',
        img: 'assets/img/',
        fonts: 'assets/fonts/'
    },
    dest: {
        css: 'build/css/',
        js: 'build/js/',
        img: 'build/img/',
        fonts: 'build/fonts/'
    }
};

// Error handling
var onError = function (err) {
    console.log(err.toString());
    notifier.notify({ title: 'Gulp error', message: err.toString() });
    this.emit('end');
};

// Jshint
gulp.task('hint', function() {
    return gulp.src([path.src.js+'components/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
});

// Scripts
gulp.task('scripts', function() {

    var browserified = transform(function(filename) {
        return browserify(filename).bundle();
    });

    return gulp.src(path.src.js+'*.js')
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(browserified)
        .pipe(gulpif(!dev, uglify()))
        .pipe(gulp.dest(path.dest.js));
});

// Styles
gulp.task('sass', function() {
    return gulp.src(path.src.scss+'main.scss')
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sass({includePaths: ['./build/lib/']}))
        .pipe(prefix({
            browsers: ['ie 8', 'ie 9', 'last 2 versions'],
            cascade: false
        }))
        .pipe(gulpif(!dev, minify({keepSpecialComments: 1})))
        .pipe(gulpif(wp, rename('style.css')))
        .pipe(gulp.dest(path.dest.css))
        .pipe(livereload());
});

// Images
gulp.task('images', function() {
    return gulp.src(path.src.img+'**/*.*')
        .pipe(plumber())
        .pipe(gulpif(!dev, imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        })))
        .pipe(gulp.dest(path.dest.img));
});

// Fonts
gulp.task('fonts', function() {
    return gulp.src(path.src.fonts+'*')
        .pipe(gulp.dest(path.dest.fonts));
});

// Watch
gulp.task('watch', function() {
    livereload.listen();
    gulp.watch(path.src.js+'**/*', ['scripts', 'hint']);
    gulp.watch(path.src.js_misc+'*', ['scripts-misc']);
    gulp.watch(path.src.scss+'**/*', ['sass']);
    gulp.watch(path.src.img+'**/*', ['images']);
    gulp.watch(path.src.fonts+'**/*', ['fonts']);
});

gulp.task('proxy', function () {
    //SITEVISION-PROXY
    require("./proxy.js");
});

gulp.task('bower', function() {
    return bower('./build/bower_components').pipe(gulp.dest('./build/lib/'));
});

// Default
gulp.task('default', ['bower', 'scripts', 'sass', 'images', 'fonts', 'hint', 'proxy', 'watch']);