/**
 * PhotoPrism Neural Map Visualization
 * 
 * Specialized visualization for neural mind maps generated from PhotoPrism
 * images. Extends the base neural mind map with photo-specific features.
 */

class PhotoprismMapVis extends NeuralMindMapVis {
    constructor(container, options = {}) {
        // Add PhotoPrism-specific options to the base options
        const photoOptions = {
            showThumbnails: options.showThumbnails !== false,
            thumbnailSize: options.thumbnailSize || 40,
            photoNodeShape: options.photoNodeShape || 'rounded-rect',
            personNodeShape: options.personNodeShape || 'circle',
            locationNodeShape: options.locationNodeShape || 'diamond',
            labelNodeShape: options.labelNodeShape || 'tag',
            photoBaseUrl: options.photoBaseUrl || '',
            highlightFaces: options.highlightFaces || false,
            photoGrouping: options.photoGrouping || 'timeline',
            timelineView: options.timelineView || false,
            mapView: options.mapView || false,
            ...options
        };

        // Call parent constructor with enhanced options
        super(container, photoOptions);

        // PhotoPrism-specific state
        this.photoNodes = [];
        this.labelNodes = [];
        this.peopleNodes = [];
        this.locationNodes = [];
        this.selectedPhoto = null;
        this.photoDetails = new Map();
        this.timelineData = null;
        this.mapData = null;
    }

    /**
     * Render a PhotoPrism neural mind map
     * 
     * @param {Object} mindMap - Neural mind map data
     * @param {Object} options - Rendering options
     */
    render(mindMap, options = {}) {
        // Extract PhotoPrism-specific data
        this.photoNodes = mindMap.nodes.filter(n => n.type === 'photo');
        this.labelNodes = mindMap.nodes.filter(n => n.type === 'label');
        this.peopleNodes = mindMap.nodes.filter(n => n.type === 'person');
        this.locationNodes = mindMap.nodes.filter(n => n.type === 'location');

        // Create timeline data if enabled
        if (this.options.timelineView && this.photoNodes.some(p => p.timestamp)) {
            this._generateTimelineData();
        }

        // Create map data if enabled
        if (this.options.mapView && this.photoNodes.some(p => p.location)) {
            this._generateMapData();
        }

        // Call parent render method
        super.render(mindMap, options);

        // Set up additional interaction for photos
        this._setupPhotoInteractions();

        return this;
    }

    /**
     * Show timeline view
     * 
     * @param {Object} options - Timeline options
     */
    showTimeline(options = {}) {
        if (!this.timelineData) {
            this._generateTimelineData();
        }

        // Remove existing timeline
        d3.select(this.container).select('.photo-timeline').remove();

        // Create timeline container
        const timelineContainer = d3.select(this.container)
            .append('div')
            .attr('class', 'photo-timeline')
            .style('position', 'absolute')
            .style('bottom', '20px')
            .style('left', '20px')
            .style('right', '20px')
            .style('height', '120px')
            .style('background-color', this.options.theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)')
            .style('border-radius', '5px')
            .style('padding', '10px')
            .style('z-index', '100')
            .style('overflow', 'hidden');

        // Create timeline SVG
        const timeline = timelineContainer
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%');

        // Calculate timeline dimensions
        const timelineWidth = timelineContainer.node().clientWidth - 20;
        const timelineHeight = 100;

        // Create scales
        const timeScale = d3.scaleTime()
            .domain([this.timelineData.minDate, this.timelineData.maxDate])
            .range([0, timelineWidth]);

        // Create axis
        const axis = d3.axisBottom(timeScale);

        timeline.append('g')
            .attr('transform', `translate(10, ${timelineHeight - 20})`)
            .call(axis);

        // Add photo markers
        timeline.selectAll('.photo-marker')
            .data(this.timelineData.photos)
            .enter()
            .append('circle')
            .attr('class', 'photo-marker')
            .attr('cx', d => timeScale(d.date) + 10)
            .attr('cy', timelineHeight - 40)
            .attr('r', 4)
            .attr('fill', d => d.color || '#4285F4')
            .attr('stroke', this.options.theme === 'dark' ? '#fff' : '#000')
            .attr('stroke-width', 1)
            .attr('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                this._showPhotoTooltip(d, event.pageX, event.pageY);
            })
            .on('mouseout', () => {
                this._hidePhotoTooltip();
            })
            .on('click', (event, d) => {
                this.focusNode(d.id);
            });

        // Add time period highlights
        if (this.timelineData.periods && this.timelineData.periods.length > 0) {
            timeline.selectAll('.period-highlight')
                .data(this.timelineData.periods)
                .enter()
                .append('rect')
                .attr('class', 'period-highlight')
                .attr('x', d => timeScale(d.startDate) + 10)
                .attr('y', timelineHeight - 55)
                .attr('width', d => Math.max(2, timeScale(d.endDate) - timeScale(d.startDate)))
                .attr('height', 10)
                .attr('fill', d => d.color || 'rgba(66, 133, 244, 0.3)')
                .attr('rx', 2)
                .attr('ry', 2)
                .append('title')
                .text(d => d.label);
        }

        // Add close button
        timelineContainer.append('div')
            .attr('class', 'timeline-close')
            .style('position', 'absolute')
            .style('top', '5px')
            .style('right', '5px')
            .style('cursor', 'pointer')
            .style('font-size', '16px')
            .style('width', '20px')
            .style('height', '20px')
            .style('line-height', '20px')
            .style('text-align', 'center')
            .text('×')
            .on('click', () => {
                timelineContainer.remove();
            });

        return this;
    }

    /**
     * Show map view of photos with location data
     * 
     * @param {Object} options - Map options
     */
    showMap(options = {}) {
        if (!this.mapData) {
            this._generateMapData();
        }

        // In a real implementation, this would create a map using a library like Leaflet
        console.log('Map view would show', this.mapData.locations.length, 'photo locations');

        // For demonstration purposes, just log the data
        return this;
    }

    /**
     * Show photo details panel
     * 
     * @param {String} photoId - ID of the photo to show
     * @param {Object} options - Display options
     */
    showPhotoDetails(photoId, options = {}) {
        const photo = this.photoNodes.find(p => p.id === photoId);
        if (!photo) return;

        this.selectedPhoto = photo;

        // Remove existing photo panel
        d3.select(this.container).select('.photo-detail-panel').remove();

        // Create detail panel
        const panel = d3.select(this.container)
            .append('div')
            .attr('class', 'photo-detail-panel')
            .style('position', 'absolute')
            .style('top', '20px')
            .style('right', '20px')
            .style('width', '300px')
            .style('background-color', this.options.theme === 'dark' ? 'rgba(0,0,0,0.8)