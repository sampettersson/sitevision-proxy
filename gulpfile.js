var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('sass', function () {
    gulp.src('./files/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./files/dist/css'));
});

gulp.task('watch', function () {
    require('./proxy.js');
    gulp.watch('./files/**/*.scss', ['sass']);
});