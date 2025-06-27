/**
 * InfraNodus - Neural Mind Map Application
 * 
 * Main application entry point
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const compression = require('compression');

const { memoryProtection } = require('./lib/utils/memoryProtection');
const { neuralIntegrationsConfig } = require('./lib/config/neuralIntegrations');

// Import routes
const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');
const integrationsRouter = require('./routes/integrations');
const neuralFileApiRouter = require('./routes/api/neuralFileApi');
const cosmicRouter = require('./routes/cosmic');
const advancedIntegrationsRouter = require('./routes/advancedIntegrations');
const upgradesRouter = require('./routes/upgrades');

const app = express();

// Initialize neural integrations configuration
neuralIntegrationsConfig.initialize().catch(err => {
    console.error('Failed to initialize neural integrations:', err);
});

// Register app with memory protection
memoryProtection.registerComponent('express-app', {
    onMemoryPressure: (level) => {
        if (level === 'critical') {
            // Clear response cache in critical situations
            if (app.locals.responseCache) {
                app.locals.responseCache.clear();
                console.log('Cleared response cache due to memory pressure');
            }
        }
    }
});

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Apply security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com', 'd3js.org'],
            styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'", 'api.openai.com', 'api.cohere.ai']
        }
    }
}));

// Enable response compression
app.use(compression());

// Middleware
app.use(logger('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'infranodus-neural-mind',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 86400000 // 1 day
    }
}));

// Initialize Passport authentication
app.use(passport.initialize());
app.use(passport.session());

// Add neural availability check middleware
app.use((req, res, next) => {
    res.locals.neuralIntegrations = {
        enabled: true,
        photoprismConnected: req.user ? !!neuralIntegrationsConfig.getPhotoprismConfig(req.user.id) : false
    };
    next();
});

// Route setup
app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/integrations', integrationsRouter);
app.use('/api/neural-files', neuralFileApiRouter);
app.use('/cosmic', cosmicRouter);
app.use('/advanced-integrations', advancedIntegrationsRouter);
app.use('/upgrades', upgradesRouter);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error handler
app.use((err, req, res, next) => {
    // Set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // Render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
