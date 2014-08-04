/**
 * Created by furier on 19/07/14.
 */
'use strict';

var path = require('path');
var fs = require('fs');

var gulp = require('gulp');
var gutil = require('gulp-util');
var watchify = require('watchify');
var cssmin = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var rimraf = require('gulp-rimraf');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var changed = require('gulp-changed');
var nodemon = require('gulp-nodemon');
var imagemin = require('gulp-imagemin');
var concatCss = require('gulp-concat-css');
var source = require('vinyl-source-stream');
var livereload = require('gulp-livereload');
var minifyHTML = require('gulp-minify-html');
var ngAnnotate = require('gulp-ng-annotate');

(function client() {

    (function html() {
        gulp.task('html', function () {
            gulp.src('app/views/**/*.html')
                .pipe(changed('dist/app/views'))
                //.pipe(minifyHTML())
                .pipe(gulp.dest('dist/app/views'));
        });
    }());

    (function images() {
        gulp.task('imagemin', function () {
            gulp.src('app/images/**')
                .pipe(changed('dist/app/images'))
                .pipe(imagemin())
                .pipe(gulp.dest('dist/app/images'));
        });
    }());

    (function styles() {
        gulp.task('css', function () {
            gulp.src('app/styles/**/*.css')
                //.pipe(concatCss('bundle.css'))
                .pipe(gulp.dest('dist/app/styles'))
                .pipe(cssmin())
                .pipe(rename({suffix: '.min'}))
                .pipe(gulp.dest('dist/app/styles'));
            gulp.src(['node_modules/alertifyjs/src/css/core.css',
                'node_modules/alertifyjs/src/css/themes/bootstrap/bootstrap.css'])
                .pipe(changed('dist/app/styles'))
                .pipe(concatCss('alertify.css'))
                .pipe(gulp.dest('dist/app/styles'))
                .pipe(cssmin())
                .pipe(rename({suffix: '.min'}))
                .pipe(gulp.dest('dist/app/styles'));
        });
        gulp.task('fonts', function () {
            gulp.src('app/fonts/**')
                .pipe(changed('dist/app/fonts'))
                .pipe(gulp.dest('dist/app/fonts'));
        });
    }());

    (function javaScript() {
        gulp.task('jshint', function () {
            gulp.src('app/scripts/**/*.js')
                .pipe(jshint('.jshintrc'))
                .pipe(jshint.reporter('default'));
        });
        gulp.task('uglify', function () {
            gulp.src('app/scripts/**/*.js')
                .pipe(changed('dist/app/scripts'))
                .pipe(gulp.dest('dist/app/scripts'))
                .pipe(ngAnnotate())
                .pipe(uglify())
                .pipe(rename({suffix: '.min'}))
                .pipe(gulp.dest('dist/app/scripts/min'));
        });
        gulp.task('watchify', function () {

            var bundler = watchify('./app/scripts/app.js');
            bundler.transform('brfs');
            bundler.on('update', rebundle);

            function rebundle() {
                return bundler.bundle()
                    // log errors if they happen
                    .on('error', function (e) {
                        gutil.log('Browserify Error', e);
                    })
                    .pipe(source('bundle.js'))
                    .pipe(gulp.dest('dist/app/scripts'))
            }

            return rebundle();
        });
        gulp.task('js', ['jshint', 'uglify']);
    }());

}());

(function server() {

    gulp.task('copy-server-to-dist', function () {
        if (!fs.existsSync('dist/wsdata.json')) {
            gulp.src('default.wsdata.json')
                .pipe(rename('wsdata.json'))
                .pipe(gulp.dest('dist'));
        }
        gulp.src('server.js')
            .pipe(gulp.dest('dist'));
        gulp.src('lib/**')
            .pipe(gulp.dest('dist/lib'));
        gulp.src('assets/**')
            .pipe(gulp.dest('dist/assets'));
    });
    gulp.task('server', ['copy-server-to-dist'], function () {
        gulp.watch(['server.js', 'lib/**'], ['copy-server-to-dist']);
        nodemon({ script: 'dist/server.js', ext: 'js', env: { 'NODE_ENV': 'development' }, watch: ['lib', 'assets', 'server.js'] })
            .on('restart', function () {
                console.log('restarted!')
            });
    });

}());

(function common() {
    gulp.task('livereload', function () {
        livereload.listen();
        gulp.watch([
            'dist/server.js',
            'dist/lib/**',
            'dist/assets/**',
            'dist/app/**'
        ]).on('change', livereload.changed);
    });
    gulp.task('clean', function () {
        gulp.src('dist/**', {
            read: false,
            ignore: ['hosts.json', 'tasks.json']
        }).pipe(rimraf());
    });
}());

gulp.task('build', ['watchify', 'html', 'css', 'fonts', 'imagemin'], function () {
    gulp.src(['app/.htaccess', 'app/favicon.ico', 'app/robots.txt'])
        .pipe(gulp.dest('dist/app'));
});

gulp.task('dist', ['clean'], function () {
    gulp.start(['copy-server-to-dist', 'build']);
});

gulp.task('default', ['server', 'livereload', 'build'], function () {
    gulp.watch('app/styles/**/*.css', ['css']);
    gulp.watch('app/views/**/*.html', ['html']);
    gulp.watch('app/fonts/**/*', ['fonts']);

    //watchify takes care of rebuilding JS when changes occurre
    //gulp.watch('app/scripts/**/*.js', ['js']);

    //websync currently doesn't use any images, so no need to run this task
    //gulp.watch('app/images/**/*.html', ['imagemin']);
});