var browserSync = require("browser-sync").create();

browserSync.init({
    watch: true,
    server: "./public",
    injectChanges: false,
});