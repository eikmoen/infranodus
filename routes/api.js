/**
 * InfraNodus is a lightweight interface to graph databases.
 *
 * This open source, free software is available under MIT license.
 * It is provided as is, with no guarantees and no liabilities.
 * You are very welcome to reuse this code if you keep this notice.
 *
 * Written by Dmitry Paranyushkin | Nodus Labs and hopefully you also...
 * www.noduslabs.com | info AT noduslabs DOT com
 *
 * In some parts the code from the book "Node.js in Action" is used,
 * (c) 2014 Manning Publications Co.
 *
 */

var Entry = require('../lib/entry')
var express = require('express')
const basicAuth = require('express-basic-auth');
var User = require('../lib/user')

exports.entries = function (req, res, next) {
    basicAuth(User.authenticate)

    // This is for pagination, but not currently used
    var page = req.page

    // Define user
    res.locals.user = req.user

    // Define whose graph is seen (receiver) and who sees the graph (perceiver)
    var receiver = ''
    var perceiver = ''

    // Set that by default the one who sees can only see their own graph, if logged in
    // TODO implement viewing public data of others

    // Is there user in the URL and we know their ID already? Then the receiver will see their graph...
    if (req.params.user && res.locals.viewuser) {
        perceiver = res.locals.viewuser
    }

    // Otherwise they see their own
    else {
        if (res.locals.user) {
            receiver = res.locals.user.uid
            perceiver = res.locals.user.uid
        }
    }

    var contexts = []
    contexts.push(req.params.context)

    Entry.getRange(receiver, perceiver, contexts, function (err, entries) {
        if (err) return next(err)

        if (req.query.textonly) {
            var response = ''
            for (var key in entries) {
                response += entries[key].text + '\r\n\r\n'
            }
            res.format({
                json: function () {
                    res.send(response)
                },
            })
        } else {
            res.format({
                json: function () {
                    res.send(entries)
                },
            })
        }
    })
}

exports.entriesLDA = function (req, res, next) {
    // This is for pagination, but not currently used
    var page = req.page

    // Define user
    res.locals.user = req.user

    // Define whose graph is seen (receiver) and who sees the graph (perceiver)
    var receiver = ''
    var perceiver = ''

    // Is the user logged in? Then he is the receiver but ONLY when he's NOT requesting the public user view (even for himself)
    if (res.locals.user && !req.params.user) {
        receiver = res.locals.user.uid
    }

    // Is there user in the URL and we know their ID already? Then the receiver will see their graph...
    if (req.params.user && res.locals.viewuser) {
        perceiver = res.locals.viewuser
    }

    // Otherwise they see their own
    else {
        if (res.locals.user) {
            perceiver = res.locals.user.uid
        }
    }

    if (req.user) {
        receiver = req.user.uid
    }

    var contexts = []

    contexts.push(req.params.context)

    var LDA_type = req.params.type

    Entry.getLDA(receiver, perceiver, contexts, LDA_type, function (
        err,
        entries
    ) {
        if (err) return next(err)

        res.format({
            json: function () {
                res.send(entries)
            },
        })
    })
}

exports.connectedcontexts = function (req, res, next) {
    //    express.basicAuth(User.authenticate);

    // This is for pagination, but not currently used
    var page = req.page

    // Define user
    res.locals.user = req.user

    console.log('Query for UserConnectedContexts')

    // Define whose graph is seen (receiver) and who sees the graph (perceiver)
    var receiver = ''
    var perceiver = ''

    // Is the user logged in? Then he is the receiver but ONLY when he's NOT requesting the public user view (even for himself)
    if (res.locals.user && !req.params.user) {
        receiver = res.locals.user.uid
    }

    // Is there user in the URL and we know their ID already? Then the receiver will see their graph...
    if (req.params.user && res.locals.viewuser) {
        perceiver = res.locals.viewuser
    }

    // Otherwise they see their own
    else {
        if (res.locals.user) {
            perceiver = res.locals.user.uid
        }
    }

    if (req.user) {
        receiver = req.user.uid
    }
    var keywords = []

    keywords.push(req.query)

    Entry.getConnectedContexts(receiver, perceiver, keywords, function (
        err,
        contexts
    ) {
        if (err) return next(err)

        res.format({
            json: function () {
                res.send(contexts)
            },
        })
    })
}

exports.connectedcontextsoutside = function (req, res, next) {
    // This is for pagination, but not currently used
    var page = req.page

    console.log('Query for AllConnectedContexts')
    console.log(req.query)

    // Define whose graph is seen (receiver) and who sees the graph (perceiver)
    var receiver = ''
    var perceiver = ''

    res.locals.user = req.user

    // Set that by default the one who sees can only see their own graph, if logged in
    // TODO implement viewing public data of others

    // Is the user logged in? Then he is the receiver but ONLY when he's NOT requesting the public user view (even for himself)
    if (res.locals.user && !req.params.user) {
        receiver = res.locals.user.uid
    }

    // Is there user in the URL and we know their ID already? Then the receiver will see their graph...
    if (req.params.user && res.locals.viewuser) {
        perceiver = res.locals.viewuser
    }

    // Otherwise they see their own
    else {
        if (res.locals.user) {
            perceiver = res.locals.user.uid
        }
    }

    var keywords = []

    keywords.push(req.query)

    Entry.getConnectedContextsOut(receiver, perceiver, keywords, function (
        err,
        contexts
    ) {
        if (err) return next(err)

        res.format({
            json: function () {
                res.send(contexts)
            },
        })
    })
}

exports.nodes = function (req, res, next) {
    var page = req.page

    var contexts = []

    var showcontexts = ''

    // The one who sees the statements (hello Tengo @1Q84 #Murakami)
    var receiver = ''
    // The one who made the statements (hello Fuka-Eri @1Q84 #Murakami)
    var perceiver = ''

    // TODO think of how this is bypassed when API is functional
    // Give this user a variable
    res.locals.user = req.user

    // Do we want to see graphs that include "near" 4-word gap scan?

    if (res.locals.user) {
        var fullview = res.locals.user.fullview
        if (fullview != 1) {
            fullview = null
        }
    } else {
        fullview = 1
    }

    // Let's define the contexts from URL if exist
    contexts.push(req.params.context)

    // And is there one to compare with also?
    if (req.query.addcontext) contexts.push(req.query.addcontext)

    // Is the user logged in? Then he is the receiver but ONLY when he's NOT requesting the public user view (even for himself)
    if (res.locals.user && !req.params.user) {
        receiver = res.locals.user.uid
    }

    // Is there user in the URL and we know their ID already? Then the receiver will see their graph...
    if (req.params.user && res.locals.viewuser) {
        perceiver = res.locals.viewuser
    }

    // Otherwise they see their own
    else {
        if (res.locals.user) {
            perceiver = res.locals.user.uid
        }
    }

    // Shall we modify the Nodes query, so we can see the contexts?

    if (req.query.showcontexts) {
        showcontexts = req.query.showcontexts
    }

    Entry.getNodes(
        receiver,
        perceiver,
        contexts,
        fullview,
        showcontexts,
        res,
        req,
        function (err, graph) {
            if (err) return next(err)

            // Change the result we obtained into a nice json we need

            if (req.query.gexf) {
                res.render('entries/nodes', { graph: graph })
            } else if (req.query.csv) {
                res.render('entries/csv', { graph: graph })
            } else if (req.query.csvmatrix) {
                res.render('entries/csvmatrix', { graph: graph })
            } else if (req.query.csvdata) {
                res.render('entries/csvdata', { graph: graph })
            } else {
                res.format({
                    json: function () {
                        res.send(graph)
                    },
                })
            }
        }
    )
}

// Knowledge Expansion API endpoints
exports.startExpansion = function (req, res, next) {
    const userId = req.user.uid;
    const contextName = req.body.context;
    const options = {
        depth: parseInt(req.body.depth) || 2,
        factor: parseFloat(req.body.factor) || 1.5,
        model: req.body.model || 'balanced',
        focusNodes: req.body.focusNodes ? req.body.focusNodes.split(',') : []
    };

    try {
        // Check if memory is sufficient for this operation
        const memStatus = memoryProtection.checkMemoryUsage();
        if (memStatus.usageRatio > 0.8) {
            return res.status(503).json({
                error: 'Server is currently under high memory load. Please try again later.',
                memoryUsage: memStatus.usagePercent + '%'
            });
        }

        // Use preemptive GC if possible
        memoryProtection.schedulePreemptiveGC('knowledge expansion', 0.2);

        const jobId = knowledgeExpansion.startExpansion(userId, contextName, options);

        // Record momentum activity
        momentumEngine.recordActivity(userId, contextName, 'expansion_start', {
            jobId,
            options
        });

        res.json({
            success: true,
            jobId: jobId,
            status: knowledgeExpansion.getExpansionStatus(jobId)
        });
    }
    catch (err) {
        next(err);
    }
};

exports.getExpansionStatus = function (req, res, next) {
    const jobId = req.params.jobId;

    try {
        const status = knowledgeExpansion.getExpansionStatus(jobId);

        // Check if the requester is the job owner
        if (status.userId !== req.user.uid) {
            return res.status(403).json({
                error: 'You do not have permission to access this job'
            });
        }

        res.json({
            success: true,
            status: status
        });

        // If job is completed, record momentum activity
        if (status.status === 'completed' && status.generatedNodes > 0) {
            momentumEngine.recordActivity(status.userId, status.contextName, 'expansion_complete', {
                jobId,
                generatedNodes: status.generatedNodes,
                generatedConnections: status.generatedConnections
            });
        }
    }
    catch (err) {
        if (err.message.includes('not found')) {
            return res.status(404).json({
                error: 'Expansion job not found',
                jobId: jobId
            });
        }
        next(err);
    }
};

exports.cancelExpansion = function (req, res, next) {
    const jobId = req.params.jobId;

    try {
        // First check if job exists and user has permission
        const status = knowledgeExpansion.getExpansionStatus(jobId);

        if (status.userId !== req.user.uid) {
            return res.status(403).json({
                error: 'You do not have permission to cancel this job'
            });
        }

        const result = knowledgeExpansion.cancelExpansion(jobId);
        res.json({
            success: result,
            message: result ? 'Expansion job cancelled' : 'Unable to cancel job',
            jobId: jobId
        });
    }
    catch (err) {
        if (err.message.includes('not found')) {
            return res.status(404).json({
                error: 'Expansion job not found',
                jobId: jobId
            });
        }
        next(err);
    }
};

// Cosmic Symphony API endpoints
exports.analyzeSymphony = function (req, res, next) {
    const userId = req.user.uid;
    const contextName = req.params.context;

    // First fetch the graph
    const entry = new Entry();

    entry.getGraph(userId, contextName, function (err, graph) {
        if (err) return next(err);

        try {
            // Use preemptive GC if possible
            memoryProtection.schedulePreemptiveGC('cosmic symphony', 0.15);

            // Analyze the graph
            const results = cosmicSymphony.analyzeCosmicSymphony(userId, contextName, graph);

            // Record momentum activity
            momentumEngine.recordActivity(userId, contextName, 'symphony_analysis', {
                symphonyScore: results.symphonyScore.overall,
                resonanceCount: results.resonanceCount,
                patternCount: results.patternCount
            });

            res.json({
                success: true,
                results: results
            });
        }
        catch (err) {
            next(err);
        }
    });
};

// Veritas API endpoints
exports.revealVeritas = function (req, res, next) {
    const userId = req.user.uid;
    const contextName = req.params.context;

    // First fetch the graph
    const entry = new Entry();

    entry.getGraph(userId, contextName, function (err, graph) {
        if (err) return next(err);

        try {
            // Check memory status
            const memStatus = memoryProtection.checkMemoryUsage();

            // Use preemptive GC
            const gcPerformed = memoryProtection.schedulePreemptiveGC('celestial veritas', 0.25);

            // Get the appropriate instance
            const veritas = req.app.get('celestialVeritas') || new CelestialVeritas();

            // Analyze the graph
            const results = veritas.revealCelestialTruths(userId, contextName, graph);

            // Record momentum for this high-impact activity
            momentumEngine.recordActivity(userId, contextName, 'veritas_analysis', {
                truthCount: results.truthCount,
                contradictionCount: results.contradictionCount,
                coherence: results.coherenceMetrics.overall
            });

            res.json({
                success: true,
                results: results,
                memoryStatus: {
                    usagePercent: memStatus.usagePercent,
                    gcPerformed: gcPerformed
                }
            });
        }
        catch (err) {
            next(err);
        }
    });
};

// Momentum API endpoints
exports.recordMomentumActivity = function (req, res, next) {
    const userId = req.user.uid;
    const contextName = req.body.context;
    const activityType = req.body.activityType;
    const activityData = req.body.data || {};

    try {
        // Basic validation
        if (!activityType) {
            return res.status(400).json({
                error: 'Activity type is required'
            });
        }

        // Record the activity
        const momentumState = momentumEngine.recordActivity(userId, contextName, activityType, activityData);

        res.json({
            success: true,
            currentMomentum: momentumState.currentMomentum,
            lastActivity: momentumState.lastActivity
        });
    }
    catch (err) {
        next(err);
    }
};

exports.getMomentumStatus = function (req, res, next) {
    const userId = req.user.uid;
    const contextName = req.params.context;

    try {
        const momentumState = momentumEngine.getMomentum(userId, contextName);

        if (!momentumState) {
            return res.status(404).json({
                error: 'No momentum data found',
                context: contextName
            });
        }

        // Get acceleration strategies
        const strategies = momentumEngine.getAccelerationStrategies(userId, contextName);

        res.json({
            success: true,
            momentum: momentumState.currentMomentum,
            lastActivity: momentumState.lastActivity,
            growthRate: momentumState.growthRate,
            strategies: strategies
        });
    }
    catch (err) {
        next(err);
    }
};

exports.getHotspots = function (req, res, next) {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 5;

    try {
        const hotspots = momentumEngine.getHotSpots(userId, null, limit);

        res.json({
            success: true,
            hotspots: hotspots
        });
    }
    catch (err) {
        next(err);
    }
};

// Collaborative scaling endpoints
exports.createCollaboration = function (req, res, next) {
    const userId = req.user.uid;
    const name = req.body.name;
    const description = req.body.description || '';
    const contexts = req.body.contexts ? req.body.contexts.split(',') : [];

    try {
        // Basic validation
        if (!name) {
            return res.status(400).json({
                error: 'Collaboration name is required'
            });
        }

        // Create the collaboration
        const collaborationId = collaborativeScaling.createCollaboration(name, {
            description,
            contexts,
            createdBy: userId,
            userRoles: { [userId]: 'owner' }
        });

        // Auto-add the creator as owner
        collaborativeScaling.addMember(collaborationId, userId, 'owner');

        // Record momentum
        momentumEngine.recordActivity(userId, null, 'collaboration_created', {
            collaborationId,
            name,
            contexts
        });

        res.json({
            success: true,
            collaborationId: collaborationId,
            name: name,
            contexts: contexts
        });
    }
    catch (err) {
        next(err);
    }
};
