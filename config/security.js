import helmet from "helmet";


/**
 * Helmet middleware for setting security-related HTTP headers.
 * Defaults: https://www.npmjs.com/package/helmet
 */
const SecurityHelmet = helmet({
    contentSecurityPolicy: false,
    /*contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "style-src": ["'self'", "https:", "'unsafe-inline'", "ka-f.webawesome.com"],
            "script-src": ["'self'", "ka-f.webawesome.com", "www.gstatic.com", "ajax.googleapis.com", "cdn.jsdelivr.net", "cdn.sheetjs.com", "'unsafe-inline'", "'unsafe-eval'"], // 'unsafe-eval' for Alpine
            "script-src-attr": ["'unsafe-inline'"],     // 'none' prevent scripts in html attributes (onclick, img onerror, etc.)
            "img-src": ["*", "data:"],      // without "data:", we get a Bootstrap svg error
            upgradeInsecureRequests: [],
        },
    },*/
    referrerPolicy: { policy: "same-origin" },    // strict-origin-when-cross-origin (default) |  same-origin
    xFrameOptions: { action: "deny" },               // X-Frame-Options, deny framing
    // crossOriginEmbedderPolicy: true,        // if true, everything on my page is CORS (crossorigin="anonymous")
    // crossOriginResourcePolicy: { policy: "same-site" },  // CORP: same-site (default) | same-origin | cross-origin
    // helmet also sets by default: Strict-Transport-Security, X-Content-Type-Options, X-XSS-Protection
});

/**
 * Custom middleware for additional security headers.
 */
const SecurityHeaders = (req, res, next) => {
    res.header('Permissions-Policy', "camera=(),microphone=(),fullscreen=*, clipboard-write=*");       // do not allow those with =()
    // res.header('Access-Control-Allow-Origin', "*");             // The * is safe, unless you run it on an intranet
    return next();
};

/**
 * Custom middleware to block non-GET requests from unauthorized origins.
 */
const SecurityOrigin = (req, res, next) => {
    // Allow safe, read-only requests to pass through
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // For state-changing requests, require an exact origin match
    const origin = req.get('Origin');
    const allowedOrigin = process.env.LISTENINGURL;

    if (origin === allowedOrigin) {
        return next();
    }

    // Block unauthorized non-GET requests
    return res.status(403).json({ error: 'Forbidden: Unauthorized origin' });
};

/**
 * Array of security middlewares to be used in Express app.
 * @type {Array<Function>}
 */
const Security = [SecurityHelmet, SecurityHeaders, SecurityOrigin];

export default Security;
