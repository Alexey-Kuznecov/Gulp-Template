let project_folder = require("path").basename(__dirname);
let source_folder = "app";
let fs = require('fs');

let path = {
    build: {
        html: project_folder + "/",
        css: project_folder + "/css/",
        js: project_folder + "/js/",
        img: project_folder + "/img/",
        fonts: project_folder + "/fonts/"
    },
    src: {
        html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
        css: source_folder + "/scss/style.scss",
        js: source_folder + "/js/script.js",
        img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
        fonts: source_folder + "/fonts/*.ttf",
        libs: source_folder + "/libs/**/dist/*"
    },
    watch: {
        html: source_folder + "/**/*.html",
        css: source_folder + "/scss/**/*.scss",
        js: source_folder + "/js/**/*.js",
        img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
        fonts: source_folder + "/fonts/*.ttf"
    },
    clean: "./" + project_folder + "/"
}

let { src, dest } = require('gulp'),
gulp = require('gulp'), // Подключаем Gulp
browsersync = require('browser-sync').create(),  // Подключаем Browser Sync
fileinclude = require('gulp-file-include'), // Подключаем библиотеку для объединения всех частичных html файлов в один index.html файл
del = require('del'), // Подключаем библиотеку для удаления файлов и папок
scss = require('gulp-sass'), //Подключаем Sass пакет,
autoprefixer = require('gulp-autoprefixer'), // Подключаем библиотеку для автоматического добавления префиксов
group_media = require('gulp-group-css-media-queries'), // Подключаем библиотеку для объединения всх медиа запросов в один
clean_css = require('gulp-clean-css'),
rename = require('gulp-rename'), // Подключаем библиотеку для переименования файлов
uglify = require('gulp-uglify-es').default, // Подключаем gulp-uglifyjs (для сжатия JS)
imagemin = require('gulp-imagemin'), // Подключаем библиотеку для работы с изображениями
webp = require('gulp-webp'), // Подключаем библиотеку для оптимизации картинок без потери качества
webphtml = require('gulp-webp-html'),
webpcss = require("gulp-webpcss"),
svgSprite = require('gulp-svg-sprite'), // Подключаем библиотеку для создания единого файла для всех svg иконок
ttf2woff = require('gulp-ttf2woff'), // Подключаем библиотеку для конвертации шрифтов из ttf2 в woff
ttf2woff2 = require('gulp-ttf2woff2'), // Подключаем библиотеку для конвертации шрифтов из ttf2 в woff2
fonter = require('gulp-fonter'), // Подключаем библиотеку для конвертации шрифтов из otf в ttf
cache = require('gulp-cache'), // Подключаем библиотеку кеширования
concat = require('gulp-concat'); // Подключаем gulp-concat (для конкатенации файлов)

function browserSync() {
    browsersync.init({
        server: {
            baseDir: "./" + project_folder + "/"
        },
        port: 3000,
        notify: false
    })
}

function html() {
    return src(path.src.html)
        .pipe(fileinclude())
        .pipe(webphtml())
        .pipe(dest(path.build.html))
        .pipe(browsersync.stream())
}

function css() {
    return src(path.src.css)
        .pipe(scss({
            outputStyle: "expanded"
        }))
        .pipe(group_media())
        .pipe(autoprefixer({
            overrideBrowserslist: ['last 15 versions','> 1%','ie 7','ie 8'],
            cascade: false
        }))
        .pipe(webpcss())
        .pipe(dest(path.build.css))
        .pipe(clean_css())
        .pipe(rename({
            extname: ".min.css"
        }))
        .pipe(dest(path.build.css))
        .pipe(browsersync.stream())
}

function js() {
    return src(path.src.js)
        .pipe(fileinclude())
        .pipe(dest(path.build.js))
        .pipe(uglify())
        .pipe(rename({
            extname: ".min.js"
        }))
        .pipe(dest(path.build.js))
        .pipe(browsersync.stream())
}

function images() {
    return src(path.src.img)
        .pipe(webp({
            quality: 70
        }))
        .pipe(dest(path.build.img))
        .pipe(src(path.src.img))
        .pipe(cache(imagemin({
            progressive: true,
            svgoPlugins: [{ removeViewBox: false }],
            interlaced: true,
            optimizationLevel: 3 // 0 to 7
        })))
        .pipe(dest(path.build.img))
        .pipe(browsersync.stream())
}

// Includes all fonts in the font file.
function fontsStyle(params) {

    let file_content = fs.readFileSync(source_folder + '/scss/fonts.scss');
    if (file_content == '') {
        fs.writeFile(source_folder + '/scss/fonts.scss', '', cb);
        return fs.readdir(path.build.fonts, function (err, items) {
            if (items) {
                let c_fontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split('.');
                    fontname = fontname[0];
                    if (c_fontname != fontname) {
                        fs.appendFile(source_folder + '/scss/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
                    }
                    c_fontname = fontname;
                }
            }
        })
    }
}

function cb() { }

function watchFiles() {
    gulp.watch([path.watch.html], html);
    gulp.watch([path.watch.css], css);
    gulp.watch([path.watch.js], js);
    gulp.watch([path.watch.img], images);
}


function clean() {
    return del(path.clean);
}

gulp.task('merge_libs_scripts', function() {
    return gulp.src(path.src.libs + '*.min.js')
      .pipe(concat('libs.min.js'))
      .pipe(uglify())
      .pipe(gulp.dest(path.build.js));
});


gulp.task('clear', function() {
    return cache.clearAll();
});
 
// Create a WOFF font from a TTF one with Gulp.
function fonts() {
    src(path.src.fonts)
        .pipe(ttf2woff())
        .pipe(dest(path.build.fonts))
    return src(path.src.fonts)
        .pipe(ttf2woff2())
        .pipe(dest(path.build.fonts))
}

// This plugin is basically gulp wrapper for fonteditor-core with ability to save in multiple formats at once.
gulp.task('otf2ttf', function name() {
    return src([source_folder + '/fonts/*.otf'])
        .pipe(fonter({
            formats: ['ttf']
        }))
        .pipe(dest(source_folder + '/fonts/'))
})

// Gulp plugin wrapping around svg-sprite which takes a bunch of SVG files, optimizes them.
gulp.task('svgSprite', function name() {
    return gulp.src([source_folder + '/img/svg/*.svg'])
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: "../icons/icons.svg",
                    example: true
                }
            }
        }))
        .pipe(dest(path.build.img))
})

let build = gulp.series(clean, gulp.parallel(js, css, html, images), fonts, fontsStyle);
let watch = gulp.parallel(build, watchFiles, browserSync);

exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.css = css;
exports.js = js;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;