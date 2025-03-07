/**
 * Test graph fixtures for various testing scenarios
 */

/**
 * Basic test graph with common network patterns
 */
exports.basicGraph = {
    nodes: [
        { id: 'node1', name: 'Knowledge', weight: 5 },
        { id: 'node2', name: 'Graph', weight: 4 },
        { id: 'node3', name: 'Analysis', weight: 4 },
        { id: 'node4', name: 'Insight', weight: 3 },
        { id: 'node5', name: 'Pattern', weight: 3 },
        { id: 'node6', name: 'Data', weight: 3 },
        { id: 'node7', name: 'Structure', weight: 2 },
        { id: 'node8', name: 'Relationship', weight: 2 },
        { id: 'node9', name: 'Concept', weight: 2 },
        { id: 'node10', name: 'Understanding', weight: 1 },
    ],
    edges: [
        { source: 'node1', target: 'node2', weight: 3 },
        { source: 'node1', target: 'node3', weight: 2 },
        { source: 'node1', target: 'node4', weight: 1 },
        { source: 'node2', target: 'node5', weight: 2 },
        { source: 'node2', target: 'node6', weight: 1 },
        { source: 'node3', target: 'node4', weight: 3 },
        { source: 'node3', target: 'node7', weight: 2 },
        { source: 'node4', target: 'node10', weight: 1 },
        { source: 'node5', target: 'node7', weight: 2 },
        { source: 'node6', target: 'node7', weight: 1 },
        { source: 'node6', target: 'node8', weight: 1 },
        { source: 'node7', target: 'node9', weight: 1 },
        { source: 'node8', target: 'node9', weight: 2 },
        { source: 'node9', target: 'node10', weight: 1 },
    ]
};

/**
 * Graph with distinct communities
 */
exports.communitiesGraph = {
    nodes: [
        // Community 1: Science
        { id: 'science1', name: 'Physics', weight: 4, community: 1 },
        { id: 'science2', name: 'Chemistry', weight: 3, community: 1 },
        { id: 'science3', name: 'Biology', weight: 3, community: 1 },
        { id: 'science4', name: 'Experiment', weight: 2, community: 1 },
        { id: 'science5', name: 'Theory', weight: 2, community: 1 },

        // Community 2: Art
        { id: 'art1', name: 'Painting', weight: 4, community: 2 },
        { id: 'art2', name: 'Sculpture', weight: 3, community: 2 },
        { id: 'art3', name: 'Music', weight: 3, community: 2 },
        { id: 'art4', name: 'Expression', weight: 2, community: 2 },
        { id: 'art5', name: 'Creativity', weight: 2, community: 2 },

        // Community 3: Philosophy
        { id: 'phil1', name: 'Ethics', weight: 4, community: 3 },
        { id: 'phil2', name: 'Logic', weight: 3, community: 3 },
        { id: 'phil3', name: 'Metaphysics', weight: 3, community: 3 },
        { id: 'phil4', name: 'Epistemology', weight: 2, community: 3 },
        { id: 'phil5', name: 'Reasoning', weight: 2, community: 3 },

        // Bridge nodes between communities
        { id: 'bridge1', name: 'Beauty', weight: 3, community: 0 },
        { id: 'bridge2', name: 'Knowledge', weight: 3, community: 0 },
        { id: 'bridge3', name: 'Nature', weight: 3, community: 0 }
    ],
    edges: [
        // Science community connections
        { source: 'science1', target: 'science2', weight: 3 },
        { source: 'science1', target: 'science3', weight: 2 },
        { source: 'science1', target: 'science4', weight: 3 },
        { source: 'science1', target: 'science5', weight: 3 },
        { source: 'science2', target: 'science3', weight: 3 },
        { source: 'science2', target: 'science4', weight: 2 },
        { source: 'science3', target: 'science4', weight: 3 },
        { source: 'science3', target: 'science5', weight: 2 },
        { source: 'science4', target: 'science5', weight: 2 },

        // Art community connections
        { source: 'art1', target: 'art2', weight: 3 },
        { source: 'art1', target: 'art3', weight: 2 },
        { source: 'art1', target: 'art4', weight: 3 },
        { source: 'art1', target: 'art5', weight: 3 },
        { source: 'art2', target: 'art3', weight: 2 },
        { source: 'art2', target: 'art4', weight: 3 },
        { source: 'art3', target: 'art5', weight: 3 },
        { source: 'art4', target: 'art5', weight: 3 },

        // Philosophy community connections
        { source: 'phil1', target: 'phil2', weight: 3 },
        { source: 'phil1', target: 'phil3', weight: 3 },
        { source: 'phil2', target: 'phil3', weight: 2 },
        { source: 'phil2', target: 'phil4', weight: 3 },
        { source: 'phil2', target: 'phil5', weight: 3 },
        { source: 'phil3', target: 'phil4', weight: 2 },
        { source: 'phil4', target: 'phil5', weight: 3 },

        // Bridge connections (fewer but important)
        { source: 'bridge1', target: 'art1', weight: 2 },
        { source: 'bridge1', target: 'art3', weight: 2 },
        { source: 'bridge1', target: 'phil1', weight: 2 },

        { source: 'bridge2', target: 'science1', weight: 2 },
        { source: 'bridge2', target: 'phil2', weight: 2 },
        { source: 'bridge2', target: 'phil4', weight: 2 },

        { source: 'bridge3', target: 'science3', weight: 2 },
        { source: 'bridge3', target: 'art5', weight: 2 },
        { source: 'bridge3', target: 'phil3', weight: 2 },

        // A few cross-community direct connections
        { source: 'science5', target: 'phil5', weight: 1 }, // Theory connects to Reasoning
        { source: 'art4', target: 'phil1', weight: 1 },     // Expression connects to Ethics
    ]
};

/**
 * Graph with contradictions (opposite concepts directly connected)
 */
exports.contradictionsGraph = {
    nodes: [
        { id: 'node1', name: 'Freedom', weight: 4 },
        { id: 'node2', name: 'Security', weight: 4 },
        { id: 'node3', name: 'Innovation', weight: 3 },
        { id: 'node4', name: 'Tradition', weight: 3 },
        { id: 'node5', name: 'Individual', weight: 3 },
        { id: 'node6', name: 'Community', weight: 3 },
        { id: 'node7', name: 'Change', weight: 2 },
        { id: 'node8', name: 'Stability', weight: 2 },
        { id: 'node9', name: 'Competition', weight: 2 },
        { id: 'node10', name: 'Cooperation', weight: 2 },
        { id: 'node11', name: 'Society', weight: 4 },
        { id: 'node12', name: 'Balance', weight: 3 }
    ],
    edges: [
        // Direct contradiction connections
        { source: 'node1', target: 'node2', weight: 2 