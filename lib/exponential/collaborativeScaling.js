/**
 * CollaborativeScaling - Enable exponential growth through collaboration
 * 
 * This module provides mechanisms for scaling knowledge through multi-user
 * collaboration, team structures, and graph federation.
 */

const EventEmitter = require('events');
const logger = require('../log/logger');

class CollaborativeScaling {
    constructor(options = {}) {
        this.options = {
            maxTeamSize: options.maxTeamSize || 50,
            defaultMergeStrategy: options.defaultMergeStrategy || 'consensus',
            federationEnabled: options.federationEnabled !== undefined ? options.federationEnabled : true,
            suggestThreshold: options.suggestThreshold || 0.6, // Similarity threshold for suggesting connections
            ...options
        };

        this.events = new EventEmitter();
        this.activeCollaborations = new Map();
        this.teamGraphs = new Map();
        this.federatedSources = new Map();
    }

    /**
     * Create a new collaborative space
     * 
     * @param {string} name - Collaboration name
     * @param {object} options - Collaboration options
     * @returns {string} - Collaboration ID
     */
    createCollaboration(name, options = {}) {
        const collaborationId = `collab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const collaborationOptions = {
            name,
            description: options.description || '',
            mergeStrategy: options.mergeStrategy || this.options.defaultMergeStrategy,
            autoSuggest: options.autoSuggest !== undefined ? options.autoSuggest : true,
            requireApproval: options.requireApproval !== undefined ? options.requireApproval : true,
            federationLevel: options.federationLevel || 'none', // none, read, write, full
            notificationsEnabled: options.notificationsEnabled !== undefined ? options.notificationsEnabled : true,
            userRoles: options.userRoles || {},
            contexts: options.contexts || [],
            createdBy: options.createdBy || 'system',
            createdAt: new Date().toISOString()
        };

        this.activeCollaborations.set(collaborationId, {
            id: collaborationId,
            options: collaborationOptions,
            members: new Map(),
            pendingInvites: new Map(),
            pendingApprovals: new Map(),
            changeHistory: [],
            suggestionPool: []
        });

        logger.info(`Created collaboration: ${name} (${collaborationId})`);
        this.events.emit('collaborationCreated', { collaborationId, name });

        return collaborationId;
    }

    /**
     * Add a member to a collaboration
     * 
     * @param {string} collaborationId - Collaboration ID
     * @param {string} userId - User to add
     * @param {string} role - User's role (admin, contributor, viewer)
     * @returns {boolean} - Success status
     */
    addMember(collaborationId, userId, role = 'contributor') {
        const collaboration = this.activeCollaborations.get(collaborationId);
        if (!collaboration) {
            throw new Error(`Collaboration not found: ${collaborationId}`);
        }

        // Check if user is already a member
        if (collaboration.members.has(userId)) {
            return false;
        }

        // Check if we've reached max team size
        if (collaboration.members.size >= this.options.maxTeamSize) {
            throw new Error(`Maximum team size reached for collaboration: ${collaborationId}`);
        }

        // Add member
        collaboration.members.set(userId, {
            role,
            joinedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            contributions: {
                nodes: 0,
                connections: 0,
                suggestions: 0,
                approvals: 0
            }
        });

        // If user had a pending invite, remove it
        if (collaboration.pendingInvites.has(userId)) {
            collaboration.pendingInvites.delete(userId);
        }

        logger.info(`Added member ${userId} to collaboration ${collaborationId} as ${role}`);
        this.events.emit('memberAdded', { collaborationId, userId, role });

        return true;
    }

    /**
     * Invite a user to join a collaboration
     * 
     * @param {string} collaborationId - Collaboration ID
     * @param {string} invitedBy - User ID sending the invite
     * @param {string} userToInvite - User ID to invite
     * @param {string} role - Proposed role for the user
     * @returns {string} - Invite ID
     */
    inviteUser(collaborationId, invitedBy, userToInvite, role = 'contributor') {
        const collaboration = this.activeCollaborations.get(collaborationId);
        if (!collaboration) {
            throw new Error(`Collaboration not found: ${collaborationId}`);
        }

        // Check if inviter has permission
        const inviterMember = collaboration.members.get(invitedBy);
        if (!inviterMember || !['admin', 'owner'].includes(inviterMember.role)) {
            throw new Error(`User ${invitedBy} does not have permission to invite users`);
        }

        // Generate invite ID
        const inviteId = `invite-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Store invite
        collaboration.pendingInvites.set(userToInvite, {
            inviteId,
            role,
            invitedBy,
            invitedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
        });

        logger.info(`Invited user ${userToInvite} to collaboration ${collaborationId} as ${role}`);
        this.events.emit('userInvited', { collaborationId, inviteId, userToInvite, invitedBy, role });

        return inviteId;
    }

    /**
     * Accept a collaboration invitation
     * 
     * @param {string} collaborationId - Collaboration ID
     * @param {string} userId - User accepting the invite
     * @returns {boolean} - Success status
     */
    acceptInvite(collaborationId, userId) {
        const collaboration = this.activeCollaborations.get(collaborationId);
        if (!collaboration) {
            throw new Error(`Collaboration not found: ${collaborationId}`);
        }

        // Check if invite exists
        const invite = collaboration.pendingInvites.get(userId);
        if (!invite) {
            throw new Error(`No pending invite for user ${userId} in collaboration ${collaborationId}`);
        }

        // Check if invite expired
        const now = new Date();
        if (new Date(invite.expiresAt) < now) {
            collaboration.pendingInvites.delete(userId);
            throw new Error(`Invite for user ${userId} has expired`);
        }

        // Add member with invited role
        return this.addMember(collaborationId, userId, invite.role);
    }

    /**
     * Submit a node or connection to the collaborative graph
     * 
     * @param {string} collaborationId - Collaboration ID
     * @param {string} userId - User submitting
     * @param {string} type - Type of submission ('node' or 'connection')
     * @param {object} data - Submission data
     * @returns {string} - Submission ID or approval status
     */
    submit(collaborationId, userId, type, data) {
        const collaboration = this.activeCollaborations.get(collaborationId);
        if (!collaboration) {
            throw new Error(`Collaboration not found: ${collaborationId}`);
        }

        // Check if user is a member
        const member = collaboration.members.get(userId);
        if (!member) {
            throw new Error(`User ${userId} is not a member of collaboration ${collaborationId}`);
        }

        // Check permission
        if (member.role === 'viewer') {
            throw new Error(`User ${userId} does not have permission to submit to collaboration ${collaborationId}`);
        }

        // If submissions require approval, add to pending approvals
        if (collaboration.options.requireApproval && member.role !== 'admin' && member.role !== 'owner') {
            const submissionId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            collaboration.pendingApprovals.set(submissionId, {
                type,
                data,
                submittedBy: userId,
                submittedAt: new Date().toISOString(),
                status: 'pending',
                approvals: [],
                rejections: []
            });

            this.events.emit('submissionPending', { collaborationId, submissionId, type, userId });
            return submissionId;
        } else {
            // Auto-approve and add to the graph
            this._addToCollaborativeGraph(collaborationId, type, data, userId);

            // Update contribution stats
            member.contributions[type === 'node' ? 'nodes' : 'connections']++;
            member.lastActive = new Date().toISOString();

            this.events.emit('submissionApproved', { collaborationId, type, userId });
            return 'auto-approved';
        }
    }

    /**
     * Approve a pending submission
     * 
     * @param {string} collaborationId - Collaboration ID
     * @param {string} submissionId - Submission ID
     * @param {string} approvedBy - User approving
     * @param {string} comment - Optional comment
     * @returns {boolean} - Success status
     */
    approveSubmission(collaborationId, submissionId, approvedBy, comment = '') {
        const collaboration = this.activeCollaborations.get(collaborationId);
        if (!collaboration) {
            throw new Error(`Collaboration not found: ${collaborationId}`);
        }

        // Check if submission exists
        const submission = collaboration.pendingApprovals.get(submissionId);
        if (!submission) {
            throw new Error(`Submission not found: ${submissionId}`);
        }

        // Check if user has permission to approve
        const member = collaboration.members.get(approvedBy);
        if (!member || !['admin', 'owner'].includes(member.role)) {
            throw new Error(`User ${approvedBy} does not have permission to approve submissions`);
        }

        // Add approval
        submission.approvals.push({
            userId: approvedBy,
            timestamp: new Date().toISOString(),
            comment
        });

        // Check approval threshold (simple majority of admins)
        const adminCount = Array.from(collaboration.members.values()).filter(m => ['admin', 'owner'].includes(m.role)).length;

        if (submission.approvals.length > adminCount / 2) {
            // Mark as approved
            submission.status = 'approved';

            // Add to graph
            this._addToCollaborativeGraph(collaborationId, submission.type, submission.data, submission.submittedBy);

            // Update contribution stats for submitter
            const submitter = collaboration.members.get(submission.submittedBy);
            if (submitter) {
                submitter.contributions[submission.type === 'node' ? 'nodes' : 'connections']++;
            }

            // Update approver stats
            member.contributions.approvals++;
            member.lastActive = new Date().toISOString();

            // Remove from pending approvals
            collaboration.pendingApprovals.delete(submissionId);

            this.events.emit('submissionApproved', {
                collaborationId,
                submissionId,
                type: submission.type,
                submittedBy: submission.submittedBy,
                approvedBy
            });

            return true;
        }

        return false; // Not enough approvals yet
    }

    /**
     * Get suggested connections between nodes from different contributors
     * 
     * @param {string} collaborationId - Collaboration ID
     * @returns {Array} - List of suggested connections
     */
    getSuggestions(collaborationId) {
        const collaboration = this.activeCollaborations.get(collaborationId);
        if (!collaboration) {
            throw new Error(`Collaboration not found: ${collaborationId}`);
        }

// Return suggestion pool