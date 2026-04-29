/* ==========================================
   ENGINE 3: MAP & GEOMETRY
   ========================================== */
const MapEngine = {
    map: null, dragMarker: null, lotPoly: null, commPoly: null,
    gridLayer: null, setbackPoly: null, buildingPolys: [], buildingMarkers: [],
    dimLabels: [], showDims: true, setbackDimLabels: [],
    bldgDimLabels: [], showBldgDims: false,
    hiddenDimKeys: new Set(),  // persists across redraws; cleared on dim toggle
    mergedDimKeys: new Set(),  // segments merged into predecessor — draws one combined dim
    chainWOffset: 0, chainDOffset: 0,  // perpendicular offsets for chain dim repositioning
    _isDragging: false,        // true during any drag — suppresses dim rebuild and save
    _saveTimer:  null,         // debounce handle for ExportEngine.save()
    dimDragMode: false,        // when true, clicking dim lines activates drag handle
    dimMergeMode: false,       // when true, clicking dim segments merges them with neighbor
    _parcelEditCentroid: null, // centroid of parcelPolygon captured at PM edit start
    existingBuildingPoly: null,      // active EX polygon (for PM edit compat)
    existingBuildingLayers: [],      // array of {poly, marker} per existingBuildings[] entry
    _exBldgEditActive: false,        // true while PM vertex editor is active on existingBuildingPoly
    _frontPickLayers: [],      // markers shown during "set front edge" pick mode
    _frontPickOverlay: null,   // instruction overlay during pick mode
    _clearFrontPick: function() {
        (this._frontPickLayers || []).forEach(l => this.map && this.map.removeLayer(l));
        this._frontPickLayers = [];
        if (this._frontPickOverlay) { this._frontPickOverlay.remove(); this._frontPickOverlay = null; }
        if (this.map) if (this._panEnabled) this.map.dragging.enable();
    },
    // Vehicle overlay
    vehiclePolys: [], vehicleMarkers: [], vehicleLabels: [],
    VEHICLE_TYPES: {
        sedan:    { label: 'Sedan',       W: 6,   D: 15,   color: '#3b82f6' },
        suv:      { label: 'SUV',         W: 6.5, D: 17,   color: '#3b82f6' },
        pickup:   { label: 'Pickup',      W: 6.5, D: 20,   color: '#3b82f6' },
        van:      { label: 'Van',         W: 7,   D: 18,   color: '#3b82f6' },
        firetruck:{ label: 'Fire Truck',  W: 8.5, D: 35,   color: '#dc2626' },
        bus:      { label: 'Bus',         W: 8.5, D: 40,   color: '#f59e0b' },
        compact:  { label: 'Compact',     W: 5.5, D: 13.5, color: '#3b82f6' },
        trash:    { label: 'Trash Truck', W: 8,   D: 28,   color: '#65a30d' }
    },

    // Coordinate rotation for Frame B → geographic conversion.
    // Returns 0: setBearing(-state.rotation) handles ALL visual rotation of the map canvas.
    // With 0 here, transform() places features at unrotated geographic positions.
    // setBearing then rotates everything uniformly — lot polygon, setback zone, buildings,
    // and dim lines all rotate together, keeping dims parallel to lot edges.
    // Using state.rotation here was wrong — it pre-rotated geographic positions, which
    // setBearing then canceled, making dims axis-aligned while the polygon rotated freely.
    effectiveRotation: function() {
        return 0;
    },

    // ── Coordinate Frame Conversions (canonical — all engines must use these) ──
    // Converts local {x, y} (feet, lot-centered, rotated) to Leaflet [lat, lng].
    toLatLng: function(pt, state) {
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
        const rot = MapEngine.effectiveRotation();
        const rad = rot * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const rx = pt.x * cos - pt.y * sin;
        const ry = pt.x * sin + pt.y * cos;
        return [state.lat + ry / F_LAT, state.lng + rx / F_LNG];
    },
    // Converts Leaflet LatLng {lat, lng} to local {x, y} (feet, lot-centered, rotated).
    toLocal: function(ll, state) {
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
        const rot = MapEngine.effectiveRotation();
        const rad = rot * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const rx = (ll.lng - state.lng) * F_LNG;
        const ry = (ll.lat - state.lat) * F_LAT;
        return { x: rx * cos + ry * sin, y: -rx * sin + ry * cos };
    },

    init: function() {
        const street    = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 23, crossOrigin: true, attribution: 'Esri' });
        const sat       = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',    { maxNativeZoom: 19, maxZoom: 23, crossOrigin: true, attribution: 'Esri' });
        const topoEsri  = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',   { maxNativeZoom: 19, maxZoom: 23, crossOrigin: true, attribution: 'Esri' });
        const topoUSGS  = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',         { maxNativeZoom: 16, maxZoom: 23, crossOrigin: true, attribution: 'USGS' });

        this.map = L.map('map', {
            center: [ConfigEngine.state.lat, ConfigEngine.state.lng],
            zoom: 19, maxZoom: 23, layers: [sat],
            fullscreenControl: true, fullscreenControlOptions: { position: 'topleft' },
            rotate: true, bearing: 0,
            touchRotate: false, shiftKeyRotate: false,
            rotateControl: false,
            dragging: true,
            // Large SVG padding prevents polygon edges from being clipped when
            // the map pane is rotated by leaflet-rotate (noClip:true alone is insufficient)
            renderer: L.svg({ padding: 1.0 })
        });
        this.layerControl = L.control.layers({ "Satellite": sat, "Street Map": street, "Topo (Esri)": topoEsri, "Topo (USGS)": topoUSGS }).addTo(this.map);

        // Google Maps layers — added dynamically once Google Maps JS API loads
        if (window.__GOOGLE_MAPS_KEY__) {
            const self2 = this;
            document.addEventListener('googlemapsready', function() {
                if (L.gridLayer && L.gridLayer.googleMutant) {
                    const gRoad = L.gridLayer.googleMutant({ type: 'roadmap',   maxZoom: 23, maxNativeZoom: 21 });
                    const gSat  = L.gridLayer.googleMutant({ type: 'satellite', maxZoom: 23, maxNativeZoom: 21 });
                    self2.layerControl.addBaseLayer(gRoad, 'Google Streets');
                    self2.layerControl.addBaseLayer(gSat,  'Google Satellite');
                }
            }, { once: true });
        }

        const GridOverlay = L.GridLayer.extend({
            createTile: function() {
                var t = L.DomUtil.create('canvas', 'leaflet-tile');
                var s = this.getTileSize();
                t.width = s.x; t.height = s.y;
                var ctx = t.getContext('2d');
                ctx.strokeStyle = 'rgba(15,76,129,0.15)';
                ctx.strokeRect(0, 0, s.x, s.y);
                return t;
            }
        });
        this.gridLayer = new GridOverlay();

        this.buildNorthArrow();
        this.buildHelpControl();
        this.buildDimDragToggle();
        this.buildRecenterControl();
        this._baseLayers = { "Satellite": sat, "Street Map": street, "Topo (Esri)": topoEsri, "Topo (USGS)": topoUSGS };
        this._activeBase = sat;
        this.map.on('baselayerchange', (e) => { this._activeBase = e.layer; e.layer.setOpacity(ConfigEngine.state.mapOpacity / 100); });
        this.buildOpacityPanel();
        this.buildParcelEditControl();

        this.lotPoly     = L.polygon([], { color: '#d9381e', weight: 3, fillOpacity: 0, noClip: true }).addTo(this.map);
        this.commPoly    = L.polygon([], { color: '#0f4c81', weight: 1, fillColor: '#0f4c81', fillOpacity: 0.3, noClip: true }).addTo(this.map);
        this.setbackPoly = L.polygon([], { color: '#f6c90e', weight: 2, fillOpacity: 0,   dashArray: '7 4', noClip: true }).addTo(this.map);
        this.dragMarker  = L.marker([ConfigEngine.state.lat, ConfigEngine.state.lng], { draggable: true }).addTo(this.map);
        // dragMarker is disabled by default — only enabled inside _startParcelEdit()
        this.dragMarker.dragging.disable();
        this.dragMarker.setOpacity(0.0);
        L.Util.requestAnimFrame(() => {
            const el = this.dragMarker.getElement();
            if (el) el.style.pointerEvents = 'none';
        });

        this.attachEvents();
        this.render();

        // If we have a GIS parcel polygon, fit map to its bounds
        if (ConfigEngine.data.parcelPolygon && ConfigEngine.data.parcelPolygon.length > 2) {
            this.map.fitBounds(this.lotPoly.getBounds(), { padding: [40, 40] });
        }

        L.Util.requestAnimFrame(() => this.map.invalidateSize());
    },

    createBuildingMarker: function(idx) {
        const m = L.marker([ConfigEngine.state.lat, ConfigEngine.state.lng], {
            draggable: true,
            icon: L.divIcon({
                className: '',
                html: '<div class="bldg-drag-pin">' + (idx + 1) + '</div>',
                iconAnchor: [9, 9]
            })
        }).addTo(this.map);

        // Prevent map from panning while building pin is dragged.
        // Use requestAnimFrame — getElement() returns null synchronously inside 'add'.
        // Attach on mousedown (not dragstart) so map.dragging.disable() fires BEFORE
        // Map.Drag._onDown processes the same event and adds its mousemove listener.
        m.on('add', () => {
            const self = this;
            L.Util.requestAnimFrame(() => {
                const el = m.getElement();
                if (!el) return;
                L.DomEvent.on(el, 'mousedown touchstart pointerdown', function(e) {
                    L.DomEvent.stopPropagation(e);
                    self.map.dragging.disable();
                    // Re-enable if user just clicks without dragging
                    const reEnable = () => { if (self._panEnabled) self.map.dragging.enable(); };
                    document.addEventListener('mouseup',  reEnable, { once: true });
                    document.addEventListener('touchend', reEnable, { once: true });
                    document.addEventListener('pointerup', reEnable, { once: true });
                });
            });
        });
        m.on('dragstart', () => { this._isDragging = true; });
        m.on('drag', () => {
            const raw   = m.getLatLng();
            const state = ConfigEngine.state;
            const bldg  = state.buildings[idx];
            if (!bldg) return;
            const F_LAT = 364566;
            const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
            const ry    = (raw.lat - state.lat) * F_LAT;
            const rx    = (raw.lng - state.lng) * F_LNG;
            const rad   = MapEngine.effectiveRotation() * Math.PI / 180;
            const cos   = Math.cos(rad), sin = Math.sin(rad);
            const lx    = rx * cos + ry * sin;
            const ly    = -rx * sin + ry * cos;
            const { front, rear, sideL, sideR } = state.setbacks;
            let newOffsetX = lx - (front - rear) / 2;
            bldg.offsetY   = ly - (sideR - sideL) / 2;
            // Enforce non-overlap: cannot drag past previous building (min gap = 0)
            // Skip if free drag mode is active
            if (idx > 0 && !state.freeDrag) {
                const prev       = state.buildings[idx - 1];
                const prevExt    = SetbackEngine.buildingExtents(prev);
                const thisExt    = SetbackEngine.buildingExtents(bldg);
                const minOffsetX = prev.offsetX + prevExt.halfDepth + thisExt.halfDepth;
                newOffsetX       = Math.max(minOffsetX, newOffsetX);
                bldg.spacing     = newOffsetX - prev.offsetX - prevExt.halfDepth - thisExt.halfDepth;
            }
            bldg.offsetX = newOffsetX;
            // Always clamp to lot boundary — buildings cannot leave the lot
            if (typeof SetbackEngine.clampToLot === 'function') {
                const { front: f, rear: r, sideL: sl, sideR: sr } = state.setbacks;
                const clamped = SetbackEngine.clampToLot(
                    bldg.offsetX + (f - r) / 2,
                    bldg.offsetY + (sr - sl) / 2,
                    bldg
                );
                bldg.offsetX = clamped.cx - (f - r) / 2;
                bldg.offsetY = clamped.cy - (sr - sl) / 2;
            }
            // Magnetic snap during drag
            if (state.snapEdge) {
                const snapped = this._applySnap(idx, bldg.offsetX, bldg.offsetY);
                bldg.offsetX = snapped.x;
                bldg.offsetY = snapped.y;
                // Re-clamp after snap — snap can push a building past the lot edge
                if (typeof SetbackEngine.clampToLot === 'function') {
                    const { front: f2, rear: r2, sideL: sl2, sideR: sr2 } = state.setbacks;
                    const cl2 = SetbackEngine.clampToLot(bldg.offsetX + (f2-r2)/2, bldg.offsetY + (sr2-sl2)/2, bldg);
                    bldg.offsetX = cl2.cx - (f2-r2)/2;
                    bldg.offsetY = cl2.cy - (sr2-sl2)/2;
                }
                // Move drag pin to actual snapped center so pin follows building
                const { front: sf, rear: sr3, sideL: sl3, sideR: ss3 } = state.setbacks;
                m.setLatLng(MapEngine.toLatLng({ x: bldg.offsetX + (sf - sr3) / 2, y: bldg.offsetY + (ss3 - sl3) / 2 }, state));
            }
            if (state.activeBuilding === idx) {
                const ox   = document.getElementById('bldgOffsetX');
                const oy   = document.getElementById('bldgOffsetY');
                const spEl = document.getElementById('bldgSpacing');
                if (ox)   ox.value   = bldg.offsetX.toFixed(1);
                if (oy)   oy.value   = bldg.offsetY.toFixed(1);
                if (spEl && idx > 0) spEl.value = bldg.spacing.toFixed(1);
            }
            SetbackEngine.drawBuilding(true);
        });
        m.on('dragend', () => {
            this._isDragging = false;
            if (this._panEnabled) this.map.dragging.enable();
            const state = ConfigEngine.state;
            // Apply snap on release (not during drag — avoids sticky-snap when touching other buildings)
            if (state.snapEdge) {
                const bldg = state.buildings[idx];
                if (bldg) {
                    const snapped = this._applySnap(idx, bldg.offsetX, bldg.offsetY);
                    bldg.offsetX = snapped.x;
                    bldg.offsetY = snapped.y;
                    // Re-clamp after snap — snap can push past lot edge
                    if (typeof SetbackEngine.clampToLot === 'function') {
                        const { front: f2, rear: r2, sideL: sl2, sideR: sr2 } = state.setbacks;
                        const cl2 = SetbackEngine.clampToLot(bldg.offsetX + (f2-r2)/2, bldg.offsetY + (sr2-sl2)/2, bldg);
                        bldg.offsetX = cl2.cx - (f2-r2)/2;
                        bldg.offsetY = cl2.cy - (sr2-sl2)/2;
                    }
                }
            }
            SetbackEngine.drawBuilding();
            ExportEngine.save();
        });
        return m;
    },

    // ── Free Drag & Snap ──────────────────────────────────────────────────
    toggleFreeDrag: function() {
        const state = ConfigEngine.state;
        state.freeDrag = !state.freeDrag;
        const btn = document.getElementById('freeDragBtn');
        if (state.freeDrag) {
            btn.style.background = '#d97706'; btn.style.color = '#fff';
            btn.textContent = 'Free Drag ON';
        } else {
            btn.style.background = ''; btn.style.color = '';
            btn.textContent = 'Free Drag';
        }
        ExportEngine.save();
    },

    toggleSnapEdge: function() {
        const state = ConfigEngine.state;
        state.snapEdge = !state.snapEdge;
        const btn = document.getElementById('snapEdgeBtn');
        if (state.snapEdge) {
            btn.style.background = '#16a34a'; btn.style.color = '#fff'; btn.style.border = '2px solid #4ade80';
            btn.textContent = 'Snap ON';
        } else {
            btn.style.background = ''; btn.style.color = ''; btn.style.border = '';
            btn.textContent = 'Snap Edge';
        }
        ExportEngine.save();
    },

    _applySnap: function(idx, offsetX, offsetY) {
        const state = ConfigEngine.state;
        const bldg = state.buildings[idx];
        const THRESHOLD = 15; // snap within 15 feet
        const thisExt = SetbackEngine.buildingExtents(bldg);
        let snappedX = offsetX, snappedY = offsetY;
        let bestDistY = THRESHOLD, bestDistX = THRESHOLD;

        // This building's edges
        const thisTop    = offsetY + thisExt.halfWidth;
        const thisBot    = offsetY - thisExt.halfWidth;
        const thisRight  = offsetX + thisExt.halfDepth;
        const thisLeft   = offsetX - thisExt.halfDepth;

        const parcelPolygon = ConfigEngine.data.parcelPolygon;
        if (parcelPolygon && parcelPolygon.length > 2) {
            // Polygon lot snapping: corner-to-vertex and corner-to-edge perpendicular projection.
            var ppn = parcelPolygon.length;
            if (parcelPolygon[ppn - 1][0] === parcelPolygon[0][0] && parcelPolygon[ppn - 1][1] === parcelPolygon[0][1]) ppn--;
            var cLat = 0, cLng = 0;
            for (var pi = 0; pi < ppn; pi++) { cLat += parcelPolygon[pi][0]; cLng += parcelPolygon[pi][1]; }
            cLat /= ppn; cLng /= ppn;

            const F_LAT = 364566;
            const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
            const rad = MapEngine.effectiveRotation() * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);

            var lotVerts = [];
            for (var vi = 0; vi < ppn; vi++) {
                var ry = (parcelPolygon[vi][0] - cLat) * F_LAT;
                var rx = (parcelPolygon[vi][1] - cLng) * F_LNG;
                lotVerts.push({ x: rx * cos + ry * sin, y: ry * cos - rx * sin });
            }

            // Use actual rotated corners so snap and clamp are consistent.
            // cx/cy = building center in Frame B (same origin as lotVerts).
            const { front: sbF, rear: sbR, sideL: sbL, sideR: sbS } = state.setbacks;
            const cx = offsetX + (sbF - sbR) / 2, cy = offsetY + (sbS - sbL) / 2;
            const bRad = bldg.orientation * Math.PI / 180;
            const bC = Math.cos(bRad), bS = Math.sin(bRad);
            const hh = bldg.D / 2, hw = bldg.W / 2;
            const corners = [
                { x: cx + hh*bC - hw*bS, y: cy + hh*bS + hw*bC },
                { x: cx + hh*bC + hw*bS, y: cy + hh*bS - hw*bC },
                { x: cx - hh*bC + hw*bS, y: cy - hh*bS - hw*bC },
                { x: cx - hh*bC - hw*bS, y: cy - hh*bS + hw*bC },
            ];

            var bestPolyDist = THRESHOLD;
            var bestPoly = null;
            var consider = function(targetCenterX, targetCenterY) {
                // targetCenter* is the new cx/cy in Frame B — convert back to offsetX/Y
                var newOffX = targetCenterX - (sbF - sbR) / 2;
                var newOffY = targetCenterY - (sbS - sbL) / 2;
                var dx = newOffX - offsetX;
                var dy = newOffY - offsetY;
                var d = Math.hypot(dx, dy);
                if (d < bestPolyDist) {
                    bestPolyDist = d;
                    bestPoly = { x: newOffX, y: newOffY };
                }
            };

            // Snap corner to nearest polygon vertex.
            for (const corner of corners) {
                for (const v of lotVerts) {
                    // Move center so this corner lands on v
                    consider(cx + (v.x - corner.x), cy + (v.y - corner.y));
                }
            }

            // Snap corner perpendicularly to polygon edges.
            for (var ei = 0; ei < lotVerts.length; ei++) {
                var a = lotVerts[ei], b = lotVerts[(ei + 1) % lotVerts.length];
                var ex = b.x - a.x, ey = b.y - a.y;
                var len2 = ex * ex + ey * ey;
                if (len2 < 1e-6) continue;
                for (const corner of corners) {
                    var t = ((corner.x - a.x) * ex + (corner.y - a.y) * ey) / len2;
                    if (t <= 0 || t >= 1) continue; // perpendicular snap only on segment interior
                    var px = a.x + t * ex, py = a.y + t * ey;
                    // Move center so this corner lands on the projected point
                    consider(cx + (px - corner.x), cy + (py - corner.y));
                }
            }

            if (bestPoly) {
                snappedX = bestPoly.x;
                snappedY = bestPoly.y;
                bestDistX = 0;
                bestDistY = 0;
            }
        } else {
            // Rectangular lot snapping fallback.
            const { front, rear, sideL, sideR } = state.setbacks;
            const lotW = ConfigEngine.data.width;
            const lotD = ConfigEngine.data.depth;
            const lotHalfD = lotD / 2;
            const lotHalfW = lotW / 2;
            // offsetX = lx - (front-rear)/2, offsetY = ly - (sideR-sideL)/2
            // so lot edges must be expressed in offsetX/Y space (subtract the same shift)
            const xShift = (front - rear) / 2;
            const yShift = (sideR - sideL) / 2;
            const lotFront  = lotHalfD  - front  - xShift;
            const lotRear   = -lotHalfD + rear   - xShift;
            const lotLeft   = lotHalfW  - sideL  - yShift;
            const lotRight  = -lotHalfW + sideR  - yShift;

            // Snap building edges to lot boundary edges (one snap per axis per side)
            const lotYSnaps = [
                { from: thisTop, to: lotLeft,  adj: lotLeft  - thisExt.halfWidth },
                { from: thisBot, to: lotRight, adj: lotRight + thisExt.halfWidth },
            ];
            for (const s of lotYSnaps) {
                const d = Math.abs(s.from - s.to);
                if (d < bestDistY) { bestDistY = d; snappedY = s.adj; }
            }
            const lotXSnaps = [
                { from: thisRight, to: lotFront, adj: lotFront - thisExt.halfDepth },
                { from: thisLeft,  to: lotRear,  adj: lotRear  + thisExt.halfDepth },
            ];
            for (const s of lotXSnaps) {
                const d = Math.abs(s.from - s.to);
                if (d < bestDistX) { bestDistX = d; snappedX = s.adj; }
            }
        }

        // Snap to other buildings
        state.buildings.forEach((other, i) => {
            if (i === idx) return;
            const otherExt = SetbackEngine.buildingExtents(other);
            const oTop   = other.offsetY + otherExt.halfWidth;
            const oBot   = other.offsetY - otherExt.halfWidth;
            const oRight = other.offsetX + otherExt.halfDepth;
            const oLeft  = other.offsetX - otherExt.halfDepth;

            // Y snaps: edge-to-edge (wall touch), edge-to-edge (align), center
            const ySnaps = [
                { from: thisBot, to: oBot,   adj: oBot + thisExt.halfWidth },     // bottom-to-bottom
                { from: thisTop, to: oTop,   adj: oTop - thisExt.halfWidth },     // top-to-top
                { from: thisBot, to: oTop,   adj: oTop + thisExt.halfWidth },     // my bottom to their top (stack)
                { from: thisTop, to: oBot,   adj: oBot - thisExt.halfWidth },     // my top to their bottom (stack)
                { from: offsetY, to: other.offsetY, adj: other.offsetY },          // center align
            ];
            for (const s of ySnaps) {
                const d = Math.abs(s.from - s.to);
                if (d < bestDistY) { bestDistY = d; snappedY = s.adj; }
            }

            // X snaps: edge-to-edge, center
            const xSnaps = [
                { from: thisLeft,  to: oLeft,  adj: oLeft + thisExt.halfDepth },   // left-to-left
                { from: thisRight, to: oRight, adj: oRight - thisExt.halfDepth },  // right-to-right
                { from: thisLeft,  to: oRight, adj: oRight + thisExt.halfDepth },  // my left to their right (abut)
                { from: thisRight, to: oLeft,  adj: oLeft - thisExt.halfDepth },   // my right to their left (abut)
                { from: offsetX, to: other.offsetX, adj: other.offsetX },           // center align
            ];
            for (const s of xSnaps) {
                const d = Math.abs(s.from - s.to);
                if (d < bestDistX) { bestDistX = d; snappedX = s.adj; }
            }
        });
        return { x: parseFloat(snappedX.toFixed(1)), y: parseFloat(snappedY.toFixed(1)) };
    },

    // ── Vehicle Placement ─────────────────────────────────────────────────
    addVehicle: function() {
        const state = ConfigEngine.state;
        if (!state.vehicles) state.vehicles = [];
        state.vehicles.push({ type: 'sedan', offsetX: 0, offsetY: 0, orientation: 0 });
        state.activeVehicle = state.vehicles.length - 1;
        this.drawVehicles();
        this._rebuildVehicleTabs();
        this._seedVehicleInputs(state.activeVehicle);
        ExportEngine.save();
    },

    removeVehicle: function() {
        const state = ConfigEngine.state;
        if (!state.vehicles || state.vehicles.length === 0) return;
        const idx = state.activeVehicle || 0;
        // Remove marker + poly
        if (this.vehicleMarkers[idx]) { this.map.removeLayer(this.vehicleMarkers[idx]); }
        if (this.vehiclePolys[idx])   { this.map.removeLayer(this.vehiclePolys[idx]); }
        state.vehicles.splice(idx, 1);
        this.vehicleMarkers.splice(idx, 1);
        this.vehiclePolys.splice(idx, 1);
        state.activeVehicle = Math.min(idx, state.vehicles.length - 1);
        if (state.vehicles.length === 0) state.activeVehicle = -1;
        this.drawVehicles();
        this._rebuildVehicleTabs();
        if (state.vehicles.length > 0) this._seedVehicleInputs(state.activeVehicle);
        ExportEngine.save();
    },

    setActiveVehicle: function(idx) {
        ConfigEngine.state.activeVehicle = idx;
        this._rebuildVehicleTabs();
        this._seedVehicleInputs(idx);
        ExportEngine.save();
    },

    _rebuildVehicleTabs: function() {
        const sel = document.getElementById('vehSelector');
        if (!sel) return;
        const vehicles = ConfigEngine.state.vehicles || [];
        [...sel.querySelectorAll('.veh-tab')].forEach(b => b.remove());
        const addBtn = sel.querySelector('.veh-tab-add');
        vehicles.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.className = 'bldg-tab veh-tab' + (i === ConfigEngine.state.activeVehicle ? ' active' : '');
            btn.textContent = 'V' + (i + 1);
            btn.addEventListener('click', () => this.setActiveVehicle(i));
            sel.insertBefore(btn, addBtn);
        });
    },

    _seedVehicleInputs: function(idx) {
        const v = (ConfigEngine.state.vehicles || [])[idx];
        if (!v) return;
        const typeEl = document.getElementById('vehType');
        const oriEl  = document.getElementById('vehOrient');
        if (typeEl) typeEl.value = v.type;
        if (oriEl)  oriEl.value  = (v.orientation || 0).toFixed(1);
        // Update size display
        const spec = this.VEHICLE_TYPES[v.type] || this.VEHICLE_TYPES.sedan;
        const szEl = document.getElementById('vehSizeLabel');
        if (szEl) szEl.textContent = spec.W + "' x " + spec.D + "'";
    },

    createVehicleMarker: function(idx) {
        const m = L.marker([ConfigEngine.state.lat, ConfigEngine.state.lng], {
            draggable: true,
            icon: L.divIcon({
                className: '',
                html: '<div class="veh-drag-pin">V' + (idx + 1) + '</div>',
                iconAnchor: [9, 9]
            })
        }).addTo(this.map);

        // Prevent map from panning while vehicle pin is dragged
        m.on('add', () => {
            const self = this;
            L.Util.requestAnimFrame(() => {
                const el = m.getElement();
                if (!el) return;
                L.DomEvent.on(el, 'mousedown touchstart pointerdown', function(e) {
                    L.DomEvent.stopPropagation(e);
                    self.map.dragging.disable();
                    const reEnable = () => { if (self._panEnabled) self.map.dragging.enable(); };
                    document.addEventListener('mouseup',   reEnable, { once: true });
                    document.addEventListener('touchend',  reEnable, { once: true });
                    document.addEventListener('pointerup', reEnable, { once: true });
                });
            });
        });
        m.on('dragstart', () => {
            this._isDragging = true;
        });
        m.on('drag', () => {
            const raw   = m.getLatLng();
            const state = ConfigEngine.state;
            const veh   = state.vehicles[idx];
            if (!veh) return;
            const F_LAT = 364566;
            const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
            const ry    = (raw.lat - state.lat) * F_LAT;
            const rx    = (raw.lng - state.lng) * F_LNG;
            const rad   = MapEngine.effectiveRotation() * Math.PI / 180;
            const cos   = Math.cos(rad), sin = Math.sin(rad);
            veh.offsetX = rx * cos + ry * sin;
            veh.offsetY = -rx * sin + ry * cos;
            this.drawVehicles();
        });
        m.on('dragend', () => {
            this._isDragging = false;
            if (this._panEnabled) this.map.dragging.enable();
            this.drawVehicles();
            ExportEngine.save();
        });
        return m;
    },

    drawVehicles: function() {
        const state    = ConfigEngine.state;
        const vehicles = state.vehicles || [];
        const lRad = MapEngine.effectiveRotation() * Math.PI / 180;
        const lCos = Math.cos(lRad), lSin = Math.sin(lRad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
        const toLL = pt => {
            const rx = pt.x * lCos - pt.y * lSin;
            const ry = pt.x * lSin + pt.y * lCos;
            return [state.lat + ry / F_LAT, state.lng + rx / F_LNG];
        };

        // Sync poly/marker arrays
        while (this.vehiclePolys.length < vehicles.length) {
            this.vehiclePolys.push(L.polygon([], { weight: 2, fillOpacity: 0.35, noClip: true }).addTo(this.map));
            this.vehicleMarkers.push(this.createVehicleMarker(this.vehiclePolys.length - 1));
        }
        while (this.vehiclePolys.length > vehicles.length) {
            this.map.removeLayer(this.vehiclePolys.pop());
            this.map.removeLayer(this.vehicleMarkers.pop());
        }

        // Remove old labels
        this.vehicleLabels.forEach(l => this.map.removeLayer(l));
        this.vehicleLabels = [];

        vehicles.forEach((veh, i) => {
            const spec = this.VEHICLE_TYPES[veh.type] || this.VEHICLE_TYPES.sedan;
            const hw = spec.W / 2, hh = spec.D / 2;
            const vRad = (veh.orientation || 0) * Math.PI / 180;
            const vCos = Math.cos(vRad), vSin = Math.sin(vRad);
            const cx = veh.offsetX || 0, cy = veh.offsetY || 0;

            const raw = [
                { x: cx - hh, y: cy + hw }, { x: cx + hh, y: cy + hw },
                { x: cx + hh, y: cy - hw }, { x: cx - hh, y: cy - hw }
            ];
            const oriented = raw.map(pt => {
                const dx = pt.x - cx, dy = pt.y - cy;
                return { x: cx + dx * vCos - dy * vSin, y: cy + dx * vSin + dy * vCos };
            });

            this.vehiclePolys[i].setLatLngs(oriented.map(toLL));
            this.vehiclePolys[i].setStyle({ color: spec.color, fillColor: spec.color });

            // Position the drag marker at vehicle center
            this.vehicleMarkers[i].setLatLng(toLL({ x: cx, y: cy }));

            // Label
            const lbl = L.marker(toLL({ x: cx, y: cy }), {
                icon: L.divIcon({
                    className: '',
                    html: '<div class="veh-label">' + spec.label + '</div>',
                    iconSize: [0, 0], iconAnchor: [0, -12]
                }),
                interactive: false
            }).addTo(this.map);
            this.vehicleLabels.push(lbl);
        });
    },

    buildNorthArrow: function() {
        const NorthControl = L.Control.extend({
            options: { position: 'bottomleft' },
            onAdd: function() {
                var div = L.DomUtil.create('div', 'north-compass-wrap');
                div.innerHTML =
                    '<div style="text-align:center;color:#9ca3af;font-size:9px;font-family:Segoe UI,Arial,sans-serif;' +
                    'letter-spacing:0.04em;margin-bottom:2px;text-transform:uppercase;">True North &#x2191;</div>' +
                    '<svg id="compassSvg" width="94" height="125" viewBox="-50 -50 100 132" style="display:block">' +
                    // Background circles
                    '<circle r="48" fill="rgba(8,8,16,.72)" stroke="rgba(255,255,255,.30)" stroke-width="1.5"/>' +
                    '<circle r="41" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1"/>' +
                    // 8-point compass rose — True North (fixed, white)
                    '<g id="compassRose">' +
                    '  <polygon points="0,-38 5,-6 0,-19 -5,-6"  fill="#ffffff"/>' +
                    '  <polygon points="0,38 5,6 0,19 -5,6"     fill="rgba(255,255,255,.28)" stroke="rgba(255,255,255,.50)" stroke-width="0.8"/>' +
                    '  <polygon points="38,0 6,5 19,0 6,-5"     fill="#ffffff"/>' +
                    '  <polygon points="-38,0 -6,5 -19,0 -6,-5" fill="#ffffff"/>' +
                    '  <g transform="rotate(45)">' +
                    '    <polygon points="0,-27 3,-5 0,-13 -3,-5" fill="rgba(255,255,255,.50)"/>' +
                    '    <polygon points="0,27 3,5 0,13 -3,5"    fill="rgba(255,255,255,.22)"/>' +
                    '    <polygon points="27,0 5,3 13,0 5,-3"    fill="rgba(255,255,255,.50)"/>' +
                    '    <polygon points="-27,0 -5,3 -13,0 -5,-3" fill="rgba(255,255,255,.50)"/>' +
                    '  </g>' +
                    '  <circle r="4" fill="rgba(255,255,255,.9)" stroke="rgba(0,0,0,.4)" stroke-width="0.8"/>' +
                    '  <circle r="2" fill="rgba(8,8,16,.9)"/>' +
                    '</g>' +
                    // Cardinal labels
                    '<text x="0"   y="-42" text-anchor="middle" fill="#ffffff" stroke="rgba(0,0,0,.85)" stroke-width="4" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="11" font-weight="bold">N</text>' +
                    '<text x="44"  y="4"   text-anchor="middle" fill="#ffffff" stroke="rgba(0,0,0,.85)" stroke-width="3" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="8">E</text>' +
                    '<text x="0"   y="50"  text-anchor="middle" fill="#ffffff" stroke="rgba(0,0,0,.85)" stroke-width="3" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="8">S</text>' +
                    '<text x="-44" y="4"   text-anchor="middle" fill="#ffffff" stroke="rgba(0,0,0,.85)" stroke-width="3" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="8">W</text>' +
                    // Arc from TN to SN — red, thicker
                    '<path id="compassArc" d="" fill="none" stroke="#d9381e" stroke-width="3" stroke-dasharray="3,2" opacity="0.9"/>' +
                    // Site North arm — red, draggable to set siteNorthDeg
                    '<g id="siteNorthArm" style="cursor:grab">' +
                    '  <title>Site North \u2014 drag to set bearing</title>' +
                    '  <line x1="0" y1="0" x2="0" y2="-28" stroke="#d9381e" stroke-width="4" stroke-linecap="round"/>' +
                    '  <polygon points="0,-36 -5,-22 5,-22" fill="#d9381e"/>' +
                    '  <circle r="20" fill="transparent" stroke="none"/>' +
                    '</g>' +
                    // Angle label — red, larger, white outline, pushed below circle
                    '<text id="compassDeg" x="0" y="74" text-anchor="middle" fill="#d9381e" stroke="rgba(255,255,255,.9)" stroke-width="3" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="9" font-weight="bold">Site North 0.0\u00b0</text>' +
                    '</svg>';
                L.DomEvent.disableClickPropagation(div);
                return div;
            }
        });
        this.map.addControl(new NorthControl());

        // Wire SN arm drag — clock-hand style, sets siteNorthDeg independent of lot rotation
        L.Util.requestAnimFrame(function() {
            var compassSvg = document.getElementById('compassSvg');
            var snArm      = document.getElementById('siteNorthArm');
            if (!compassSvg || !snArm) return;
            var dragging = false;

            function getAngle(clientX, clientY) {
                var rect = compassSvg.getBoundingClientRect();
                // ViewBox origin (0,0) is at (50/100)*width from left, (50/132)*height from top
                var cx = rect.left + (50 / 100) * rect.width;
                var cy = rect.top  + (50 / 132) * rect.height;
                var dx = clientX - cx, dy = clientY - cy;
                var a = Math.atan2(dx, -dy) * 180 / Math.PI;
                return ((a % 360) + 360) % 360;
            }

            snArm.addEventListener('mousedown', function(e) {
                dragging = true;
                snArm.style.cursor = 'grabbing';
                if (MapEngine.map) MapEngine.map.dragging.disable();
                e.preventDefault();
                e.stopPropagation();
            });
            document.addEventListener('mousemove', function(e) {
                if (!dragging) return;
                ConfigEngine.state.siteNorthDeg = getAngle(e.clientX, e.clientY);
                MapEngine.updateNorthArrow();
            });
            document.addEventListener('mouseup', function() {
                if (!dragging) return;
                dragging = false;
                snArm.style.cursor = 'grab';
                if (MapEngine.map && MapEngine._panEnabled) MapEngine.map.dragging.enable();
                ExportEngine.save();
            });
        });
    },

    buildOpacityPanel: function() {
        const self = this;
        const OpCtrl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function() {
                var div = L.DomUtil.create('div', 'em-oc-ctrl leaflet-control');
                const pct = ConfigEngine.state.mapOpacity;
                div.innerHTML =
                    '<h4>Basemap Opacity</h4>' +
                    '<div class="em-oc-row">' +
                    '  <label>Active Layer</label>' +
                    '  <input type="range" id="satOpacitySlider" min="0" max="100" value="' + pct + '">' +
                    '  <span id="satOpacityVal">' + pct + '%</span>' +
                    '</div>' +
                    '';
                L.DomEvent.disableClickPropagation(div);
                L.DomEvent.disableScrollPropagation(div);
                return div;
            }
        });
        this.map.addControl(new OpCtrl());

        // Wire slider after control is added to DOM
        L.Util.requestAnimFrame(() => {
            const slider = document.getElementById('satOpacitySlider');
            const label  = document.getElementById('satOpacityVal');
            if (!slider) return;
            // Apply saved opacity to current active basemap
            if (self._activeBase) self._activeBase.setOpacity(ConfigEngine.state.mapOpacity / 100);
            slider.addEventListener('input', () => {
                const v = parseInt(slider.value);
                if (self._activeBase) self._activeBase.setOpacity(v / 100);
                label.textContent = v + '%';
                ConfigEngine.state.mapOpacity = v;
            });
            // Persist only on release (not every pixel of drag)
            slider.addEventListener('change', () => { ExportEngine.save(); });
        });
    },

    buildHelpControl: function() {
        const HelpControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function() {
                var c = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-helper');
                c.innerHTML = `?<div class="helper-popup"><strong>How to Align:</strong><ul>
                    <li>Drag the blue pin to reposition the lot.</li>
                    <li>Toggle <em>Snap to Grid</em> to lock to a 5 m coordinate grid.</li>
                    <li>Use the slider or type an angle to match the street right-of-way.</li>
                    <li>Click <em>Export LISP</em> to generate AutoCAD boundary code in CA Zone VI coords.</li>
                    <li>Click <em>Export Image</em> to save a PNG of the map view.</li>
                    <li>Click <em>Reset</em> to restore the default position and rotation.</li>
                </ul></div>`;
                L.DomEvent.disableClickPropagation(c);
                return c;
            }
        });
        this.map.addControl(new HelpControl());
    },

    buildDimDragToggle: function() {
        const self = this;
        const DimDragCtrl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function() {
                var c = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-dim-drag');
                c.innerHTML = '<a href="#" title="Toggle dimension drag mode — when active, click any dimension line to reveal a drag handle. Drag the handle to reposition the chain, then click it again to lock in place." role="button" aria-label="Toggle dimension drag">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<line x1="4" y1="12" x2="20" y2="12"/>' +
                    '<polyline points="8 8 4 12 8 16"/>' +
                    '<polyline points="16 8 20 12 16 16"/>' +
                    '<line x1="12" y1="4" x2="12" y2="8"/>' +
                    '<line x1="12" y1="16" x2="12" y2="20"/>' +
                    '</svg></a>';
                L.DomEvent.disableClickPropagation(c);
                c.querySelector('a').addEventListener('click', function(e) {
                    e.preventDefault();
                    self.dimDragMode = !self.dimDragMode;
                    c.classList.toggle('dim-drag-active', self.dimDragMode);
                    self.map.getContainer().classList.toggle('dim-drag-mode-on', self.dimDragMode);
                    if (self.dimDragMode && !self.showBldgDims) {
                        self.showBldgDims = true;
                        self.showDims = true;
                        const dimBtn = document.getElementById('bldgDimBtn');
                        if (dimBtn) { dimBtn.classList.add('active'); dimBtn.textContent = 'Hide Dims'; }
                    }
                    if (typeof SetbackEngine !== 'undefined') SetbackEngine.updateBldgDimLabels();
                });
                return c;
            }
        });
        this.map.addControl(new DimDragCtrl());

        // Merge dims toggle — click segments to combine adjacent ones
        const DimMergeCtrl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function() {
                var c = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-dim-merge');
                c.innerHTML = '<a href="#" title="Merge dimensions — click adjacent dim segments to combine them into one measurement. Click again to unmerge." role="button" aria-label="Toggle dimension merge">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<line x1="3" y1="12" x2="21" y2="12"/>' +
                    '<line x1="3" y1="6" x2="3" y2="18"/>' +
                    '<line x1="21" y1="6" x2="21" y2="18"/>' +
                    '<line x1="12" y1="9" x2="12" y2="15" stroke-dasharray="2 2" opacity="0.5"/>' +
                    '<path d="M8 9l4 3-4 3" fill="none"/>' +
                    '</svg></a>';
                L.DomEvent.disableClickPropagation(c);
                c.querySelector('a').addEventListener('click', function(e) {
                    e.preventDefault();
                    self.dimMergeMode = !self.dimMergeMode;
                    c.classList.toggle('dim-merge-active', self.dimMergeMode);
                    self.map.getContainer().classList.toggle('dim-merge-mode-on', self.dimMergeMode);
                    if (self.dimMergeMode && !self.showBldgDims) {
                        self.showBldgDims = true;
                        self.showDims = true;
                        const dimBtn = document.getElementById('bldgDimBtn');
                        if (dimBtn) { dimBtn.classList.add('active'); dimBtn.textContent = 'Hide Dims'; }
                    }
                    if (typeof SetbackEngine !== 'undefined') SetbackEngine.updateBldgDimLabels();
                });
                return c;
            }
        });
        this.map.addControl(new DimMergeCtrl());
    },

    buildParcelEditControl: function() {
        const self = this;
        if (!window.L || !L.PM) {
            console.warn('[PARCEL EDIT] Leaflet.PM not loaded — parcel editor disabled.');
            return;
        }
        if (!ConfigEngine.data.parcelPolygon || ConfigEngine.data.parcelPolygon.length < 3) return;

        const ParcelEditCtrl = L.Control.extend({
            options: { position: 'bottomright' },
            onAdd: function() {
                var c = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-parcel-edit');
                c.style.cssText = 'display:flex;flex-direction:row;';
                // Edit Parcel button
                var editA = document.createElement('a');
                editA.href = '#'; editA.title = 'Edit parcel boundary vertices';
                editA.setAttribute('role', 'button'); editA.setAttribute('aria-label', 'Edit parcel boundary');
                editA.style.cssText = 'font-size:12px;padding:0 8px;min-width:80px;display:flex;align-items:center;gap:5px;white-space:nowrap;border-right:1px solid #ccc;';
                editA.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit Parcel';
                editA.addEventListener('click', function(e) { e.preventDefault(); self._startParcelEdit(); });
                self._editParcelBtn = editA;
                c.appendChild(editA);
                // Restore GIS button — only if site has original GIS polygon
                var siteGis = (window.__SITE_DEFAULTS__ && window.__SITE_DEFAULTS__.site && window.__SITE_DEFAULTS__.site.parcelPolygon) || null;
                if (siteGis && siteGis.length > 2) {
                    var restoreA = document.createElement('a');
                    restoreA.href = '#'; restoreA.title = 'Restore parcel to original GIS position';
                    restoreA.setAttribute('role', 'button'); restoreA.setAttribute('aria-label', 'Restore parcel to GIS');
                    restoreA.style.cssText = 'font-size:12px;padding:0 8px;min-width:70px;display:flex;align-items:center;gap:4px;white-space:nowrap;color:#2563eb;';
                    restoreA.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>GIS';
                    restoreA.addEventListener('click', function(e) { e.preventDefault(); self._restoreParcelGIS(); });
                    c.appendChild(restoreA);
                }
                L.DomEvent.disableClickPropagation(c);
                return c;
            }
        });
        this.map.addControl(new ParcelEditCtrl());

        // EX building edit control — only shown when existingBuildingPoly exists
        this._buildExBldgEditControl();
    },

    _buildExBldgEditControl: function() {
        const self = this;
        if (!window.L || !L.PM) return;
        if (this._exEditCtrl) { this.map.removeControl(this._exEditCtrl); this._exEditCtrl = null; }
        var exBlds = ConfigEngine.state.existingBuildings;
        var activeIdx = ConfigEngine.state.activeExBuilding;
        if (!exBlds || !exBlds.length) return;
        var activeEx = exBlds[activeIdx];
        if (!activeEx || activeEx.locked) return;
        const ExEditCtrl = L.Control.extend({
            options: { position: 'bottomright' },
            onAdd: function() {
                var c = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-ex-edit');
                c.innerHTML = '<a href="#" title="Edit existing building vertices" role="button" style="font-size:12px;padding:0 8px;min-width:90px;display:flex;align-items:center;gap:5px;white-space:nowrap;color:#6b7280;">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                    'Edit EX Bldg</a>';
                L.DomEvent.disableClickPropagation(c);
                c.querySelector('a').addEventListener('click', function(e) { e.preventDefault(); self._startExBldgEdit(); });
                return c;
            }
        });
        this._exEditCtrl = new ExEditCtrl();
        this.map.addControl(this._exEditCtrl);
    },

    _restoreParcelGIS: function() {
        var siteGis = (window.__SITE_DEFAULTS__ && window.__SITE_DEFAULTS__.site && window.__SITE_DEFAULTS__.site.parcelPolygon) || null;
        if (!siteGis || siteGis.length < 3) return;
        // Compute GIS centroid and restore lat/lng + polygon
        var n = siteGis.length;
        if (siteGis[n-1][0] === siteGis[0][0] && siteGis[n-1][1] === siteGis[0][1]) n--;
        var cLat = 0, cLng = 0;
        for (var i = 0; i < n; i++) { cLat += siteGis[i][0]; cLng += siteGis[i][1]; }
        cLat /= n; cLng /= n;
        ConfigEngine.state.lat = cLat;
        ConfigEngine.state.lng = cLng;
        ConfigEngine.data.parcelPolygon = JSON.parse(JSON.stringify(siteGis));
        if (this.dragMarker) this.dragMarker.setLatLng([cLat, cLng]);
        ExportEngine.save();
        this.render();
    },

    _startParcelEdit: function() {
        var pp = ConfigEngine.data.parcelPolygon;
        if (!pp || pp.length < 3 || !L.PM) return;

        // Compute and store centroid for inverse transform at save time
        var n = pp.length;
        if (pp[n - 1][0] === pp[0][0] && pp[n - 1][1] === pp[0][1]) n--;
        var cLat = 0, cLng = 0;
        for (var i = 0; i < n; i++) { cLat += pp[i][0]; cLng += pp[i][1]; }
        this._parcelEditCentroid = { lat: cLat / n, lng: cLng / n };

        this.lotPoly.pm.enable({
            allowSelfIntersection: false,
            draggable: false,
            removeLayerBelowMinVertices: false,
            preventVertexRemoval: false
        });
        // Enable lot drag while in edit mode
        this.dragMarker.dragging.enable();
        this.dragMarker.setOpacity(1);
        const dmEl = this.dragMarker.getElement();
        if (dmEl) dmEl.style.pointerEvents = '';
        if (this._editParcelBtn) {
            this._editParcelBtn.style.background = '#2563eb';
            this._editParcelBtn.style.color = '#fff';
        }
        this._showParcelEditBar();
    },

    _saveParcelEdit: function() {
        var state = ConfigEngine.state;

        // Extract dragged vertex positions from PM-edited polygon.
        // Polygon is displayed at raw geographic coordinates, so store directly.
        var latLngs = this.lotPoly.getLatLngs()[0];
        if (!latLngs || !latLngs.length) return;
        var newPoly = latLngs.map(function(ll) {
            return [ll.lat, ll.lng];
        });

        this.lotPoly.pm.disable();
        ConfigEngine.data.parcelPolygon = newPoly;
        this._parcelEditCentroid = null;
        this.dragMarker.dragging.disable();
        this.dragMarker.setOpacity(0.0);
        const dmElS = this.dragMarker.getElement();
        if (dmElS) dmElS.style.pointerEvents = 'none';
        if (this._editParcelBtn) {
            this._editParcelBtn.style.background = '';
            this._editParcelBtn.style.color = '';
        }
        this._hideParcelEditBar();
        ExportEngine.save();
        this.render();
    },

    _cancelParcelEdit: function() {
        this.lotPoly.pm.disable();
        this._parcelEditCentroid = null;
        this.dragMarker.dragging.disable();
        this.dragMarker.setOpacity(0.0);
        const dmElC = this.dragMarker.getElement();
        if (dmElC) dmElC.style.pointerEvents = 'none';
        if (this._editParcelBtn) {
            this._editParcelBtn.style.background = '';
            this._editParcelBtn.style.color = '';
        }
        this._hideParcelEditBar();
        this.render(); // re-render restores original polygon from ConfigEngine.data
    },

    _showParcelEditBar: function() {
        var existing = document.getElementById('parcel-edit-bar');
        if (existing) existing.remove();
        var self = this;
        var bar = document.createElement('div');
        bar.id = 'parcel-edit-bar';
        bar.style.cssText = 'position:absolute;bottom:70px;right:10px;z-index:1001;display:flex;' +
            'gap:6px;background:rgba(255,255,255,0.97);border:1px solid #ccc;border-radius:6px;' +
            'padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:13px;align-items:center;';
        bar.innerHTML = '<span style="margin-right:6px;color:#555;">Drag vertices to reshape parcel</span>' +
            '<button id="parcel-edit-save" style="background:#2563eb;color:#fff;border:none;border-radius:4px;' +
            'padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600;">Save</button>' +
            '<button id="parcel-edit-cancel" style="background:#e5e7eb;color:#333;border:none;border-radius:4px;' +
            'padding:4px 10px;cursor:pointer;font-size:12px;">Cancel</button>';
        this.map.getContainer().appendChild(bar);
        document.getElementById('parcel-edit-save').addEventListener('click', function() { self._saveParcelEdit(); });
        document.getElementById('parcel-edit-cancel').addEventListener('click', function() { self._cancelParcelEdit(); });
    },

    _hideParcelEditBar: function() {
        var bar = document.getElementById('parcel-edit-bar');
        if (bar) bar.remove();
    },

    // ── Existing Building overlay ──────────────────────────────────────────────

    // Keep old name as alias so any legacy caller doesn't break
    drawExistingBuilding: function() { this.drawExistingBuildings(); },

    drawExistingBuildings: function() {
        var self = this;
        // Remove all existing layers
        (this.existingBuildingLayers || []).forEach(function(layer) {
            if (layer.poly)   self.map.removeLayer(layer.poly);
            if (layer.marker) self.map.removeLayer(layer.marker);
        });
        this.existingBuildingLayers = [];
        this.existingBuildingPoly   = null;
        this._exBldgMarker          = null;

        var exBuildings = ConfigEngine.state.existingBuildings || [];
        var activeIdx   = ConfigEngine.state.activeExBuilding;
        if (!exBuildings.length) return;

        exBuildings.forEach(function(ex, i) {
            if (!ex || !ex.polygon || ex.polygon.length < 3) {
                self.existingBuildingLayers.push({ poly: null, marker: null });
                return;
            }
            var isActive = (i === activeIdx);
            var latLngs  = ex.polygon.map(function(p) { return L.latLng(p[0], p[1]); });
            var poly = L.polygon(latLngs, {
                color:       isActive ? '#374151' : '#9ca3af',
                weight:      isActive ? 2.5       : 2,
                fillColor:   '#6b7280',
                fillOpacity: isActive ? 0.35      : 0.15,
                dashArray: '6 4', noClip: true
            }).addTo(self.map);

            // Track active poly for PM edit
            if (isActive) { self.existingBuildingPoly = poly; }

            var marker = null;
            if (!ex.locked) {
                var cLat = 0, cLng = 0;
                for (var k = 0; k < latLngs.length; k++) { cLat += latLngs[k].lat; cLng += latLngs[k].lng; }
                cLat /= latLngs.length; cLng /= latLngs.length;
                var capturedI    = i;
                var capturedEx   = ex;
                var capturedCLat = cLat;
                var capturedCLng = cLng;
                var capturedPoly = poly;
                marker = L.marker([cLat, cLng], {
                    draggable: true,
                    icon: L.divIcon({
                        className: '',
                        html: '<div class="ex-bldg-drag-pin">EX' + (i + 1) + '</div>',
                        iconAnchor: [11, 9]
                    })
                }).addTo(self.map);
                if (isActive) { self._exBldgMarker = marker; }
                marker.on('add', function() {
                    var m = marker;
                    L.Util.requestAnimFrame(function() {
                        var el = m.getElement();
                        if (!el) return;
                        L.DomEvent.on(el, 'mousedown touchstart pointerdown', function(e) {
                            L.DomEvent.stopPropagation(e);
                            self.map.dragging.disable();
                            var re = function() { if (self._panEnabled) self.map.dragging.enable(); };
                            document.addEventListener('mouseup',    re, { once: true });
                            document.addEventListener('touchend',   re, { once: true });
                            document.addEventListener('pointerup',  re, { once: true });
                        });
                    });
                });
                marker.on('drag', function() {
                    var raw  = marker.getLatLng();
                    var dLat = raw.lat - capturedCLat, dLng = raw.lng - capturedCLng;
                    capturedPoly.setLatLngs(capturedEx.polygon.map(function(p) {
                        return L.latLng(p[0] + dLat, p[1] + dLng);
                    }));
                });
                marker.on('dragend', function() {
                    var raw  = marker.getLatLng();
                    var dLat = raw.lat - capturedCLat, dLng = raw.lng - capturedCLng;
                    capturedEx.polygon = capturedEx.polygon.map(function(p) {
                        return [p[0] + dLat, p[1] + dLng];
                    });
                    ConfigEngine.state.activeExBuilding = capturedI;
                    ExportEngine.save();
                    self.drawExistingBuildings();
                    SetbackEngine.drawBuilding();
                });
            }
            self.existingBuildingLayers.push({ poly: poly, marker: marker });
        });

        this._buildExBldgEditControl();
    },

    _startExBldgEdit: function() {
        var activeIdx = ConfigEngine.state.activeExBuilding;
        var ex = (ConfigEngine.state.existingBuildings || [])[activeIdx];
        if (!ex || !this.existingBuildingPoly || !L.PM) return;
        this._exBldgEditActive = true;
        this.existingBuildingPoly.pm.enable({
            allowSelfIntersection: false,
            draggable: true,
            removeLayerBelowMinVertices: false,
            preventVertexRemoval: false
        });
        this._showExBldgEditBar();
    },

    _saveExBldgEdit: function() {
        if (!this.existingBuildingPoly) return;
        var latLngs = this.existingBuildingPoly.getLatLngs()[0];
        var newPoly = latLngs.map(function(ll) { return [ll.lat, ll.lng]; });
        this.existingBuildingPoly.pm.disable();
        this._exBldgEditActive = false;
        var activeIdx = ConfigEngine.state.activeExBuilding;
        var exArr = ConfigEngine.state.existingBuildings;
        if (activeIdx >= 0 && exArr && exArr[activeIdx]) {
            exArr[activeIdx] = { polygon: newPoly, locked: exArr[activeIdx].locked || false };
        }
        this._hideExBldgEditBar();
        ExportEngine.save();
        this.drawExistingBuildings();
        SetbackEngine.rebuildSelector();
    },

    _cancelExBldgEdit: function() {
        if (this.existingBuildingPoly) this.existingBuildingPoly.pm.disable();
        this._exBldgEditActive = false;
        this._hideExBldgEditBar();
        this.drawExistingBuildings(); // re-render restores saved polygon
    },

    _showExBldgEditBar: function() {
        var existing = document.getElementById('ex-bldg-edit-bar');
        if (existing) existing.remove();
        var self = this;
        var bar = document.createElement('div');
        bar.id = 'ex-bldg-edit-bar';
        bar.style.cssText = 'position:absolute;bottom:100px;right:10px;z-index:1001;display:flex;' +
            'gap:6px;background:rgba(255,255,255,0.97);border:1px solid #ccc;border-radius:6px;' +
            'padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:13px;align-items:center;';
        bar.innerHTML = '<span style="margin-right:6px;color:#555;">Drag vertices to reshape existing building</span>' +
            '<button id="ex-edit-save" style="background:#6b7280;color:#fff;border:none;border-radius:4px;' +
            'padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600;">Save EX</button>' +
            '<button id="ex-edit-cancel" style="background:#e5e7eb;color:#333;border:none;border-radius:4px;' +
            'padding:4px 10px;cursor:pointer;font-size:12px;">Cancel</button>';
        this.map.getContainer().appendChild(bar);
        document.getElementById('ex-edit-save').addEventListener('click', function() { self._saveExBldgEdit(); });
        document.getElementById('ex-edit-cancel').addEventListener('click', function() { self._cancelExBldgEdit(); });
    },

    _hideExBldgEditBar: function() {
        var bar = document.getElementById('ex-bldg-edit-bar');
        if (bar) bar.remove();
    },

    buildRecenterControl: function() {
        const self = this;
        const RecenterCtrl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function() {
                var c = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-recenter');
                c.title = 'Recenter map to site';
                c.innerHTML = '<a href="#" role="button" aria-label="Recenter to site" style="font-size:16px;line-height:30px;font-weight:bold;">&#8853;</a>';
                L.DomEvent.on(c, 'click', function(e) {
                    L.DomEvent.preventDefault(e);
                    const state = ConfigEngine.state;
                    if (self.lotPoly && self.lotPoly.getBounds().isValid()) {
                        self.map.fitBounds(self.lotPoly.getBounds(), { padding: [40, 40] });
                    } else {
                        self.map.setView([state.lat, state.lng], 19);
                    }
                });
                L.DomEvent.disableClickPropagation(c);
                return c;
            }
        });
        this.map.addControl(new RecenterCtrl());
    },

    updateNorthArrow: function() {
        const arm  = document.getElementById('siteNorthArm');
        const deg  = document.getElementById('compassDeg');
        const arc  = document.getElementById('compassArc');
        if (!arm) return;
        // SN tracks siteNorthDeg (set by compass drag or rotation slider)
        const snDeg = ConfigEngine.state.siteNorthDeg ?? ConfigEngine.state.rotation ?? 0;
        arm.setAttribute('transform', 'rotate(' + snDeg.toFixed(2) + ')');
        if (deg) deg.textContent = 'Site North ' + snDeg.toFixed(1) + '\u00b0';
        // Arc from TN (0°) to SN arm position at r=22
        const normSnDeg = ((snDeg % 360) + 360) % 360;
        if (arc && normSnDeg >= 0.5) {
            const r = 22, aRad = snDeg * Math.PI / 180;
            arc.setAttribute('d', 'M 0 -' + r + ' A ' + r + ' ' + r + ' 0 ' + (normSnDeg > 180 ? 1 : 0) + ' 1 ' +
                (r * Math.sin(aRad)).toFixed(2) + ' ' + (-r * Math.cos(aRad)).toFixed(2));
        } else if (arc) {
            arc.setAttribute('d', '');
        }
    },

    render: function() {
        const { width: w, depth: h, commercialDepth: cD, parcelPolygon } = ConfigEngine.data;
        // Normalize rotation to 0-360
        var rawRot = ConfigEngine.state.rotation % 360;
        if (rawRot < 0) rawRot += 360;
        ConfigEngine.state.rotation = rawRot;
        const rad    = this.effectiveRotation() * Math.PI / 180;
        const cos    = Math.cos(rad), sin = Math.sin(rad);
        const F_LAT  = 364566;
        const F_LNG  = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);

        const transform = (pt) => {
            let rx = pt.x * cos - pt.y * sin;
            let ry = pt.x * sin + pt.y * cos;
            return [ConfigEngine.state.lat + ry / F_LAT, ConfigEngine.state.lng + rx / F_LNG];
        };

        // Lot boundary: use actual GIS parcel polygon if available, else rectangle
        if (parcelPolygon && parcelPolygon.length > 2) {
            // Convert polygon to local offsets from centroid, then render relative
            // to state.lat/lng — same coordinate system as buildings and rectangle
            var ppn = parcelPolygon.length;
            var pp  = parcelPolygon;
            if (pp[ppn-1][0]===pp[0][0] && pp[ppn-1][1]===pp[0][1]) ppn--;
            // Display at raw geographic coordinates.
            // updateDimLabels and drawSetbacks both convert polygon vertices using
            // state.lat/lng as origin → their round-trip produces raw geographic positions.
            // Using raw coords here keeps all three systems consistent.
            this.lotPoly.setLatLngs(pp.slice(0, ppn));
        } else {
            // Base rectangle: front-right → rear-right → rear-left → front-left
            // c1={x:-h/2,y:w/2}, c2={x:h/2,y:w/2}, c3={x:h/2,y:-w/2}, c0={x:-h/2,y:-w/2}
            var baseLot = [{x:-h/2,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2},{x:-h/2,y:-w/2}];
            // Corner visibility triangle chamfer (cuts a 45-deg corner at the street intersection)
            var sd = window.__SITE_DEFAULTS__ || {};
            var cvt = sd.cornerVisTriSize || 0;
            if (cvt > 0 && sd.cornerVisibilityTriangle) {
                var corner = sd.cornerVisCorner || 'front-left';
                // Resolve compass direction (SW/SE/NW/NE) to local corner based on rotation
                if (/^[NSEW]{2}$/i.test(corner)) {
                    var localCorners = [
                        {name:'front-left',  x:-h/2, y:-w/2},
                        {name:'front-right', x:-h/2, y: w/2},
                        {name:'rear-right',  x: h/2, y: w/2},
                        {name:'rear-left',   x: h/2, y:-w/2}
                    ];
                    var cu = corner.toUpperCase();
                    var targetX = (cu.indexOf('W') >= 0) ? -1 : 1; // west=-1, east=+1
                    var targetY = (cu.indexOf('S') >= 0) ? -1 : 1; // south=-1, north=+1
                    var best = null, bestScore = Infinity;
                    localCorners.forEach(function(c) {
                        var rx = c.x * cos - c.y * sin;
                        var ry = c.x * sin + c.y * cos;
                        var score = (rx - targetX * 999) * (rx - targetX * 999) + (ry - targetY * 999) * (ry - targetY * 999);
                        if (score < bestScore) { bestScore = score; best = c.name; }
                    });
                    corner = best;
                }
                if (corner === 'front-left') {
                    baseLot = [{x:-h/2,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2},{x:-h/2+cvt,y:-w/2},{x:-h/2,y:-w/2+cvt}];
                } else if (corner === 'front-right') {
                    baseLot = [{x:-h/2,y:w/2-cvt},{x:-h/2+cvt,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2},{x:-h/2,y:-w/2}];
                } else if (corner === 'rear-left') {
                    baseLot = [{x:-h/2,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2+cvt},{x:h/2-cvt,y:-w/2},{x:-h/2,y:-w/2}];
                } else if (corner === 'rear-right') {
                    baseLot = [{x:-h/2,y:w/2},{x:h/2-cvt,y:w/2},{x:h/2,y:w/2-cvt},{x:h/2,y:-w/2},{x:-h/2,y:-w/2}];
                }
            }
            this._lotLocalPts = baseLot;  // store for updateDimLabels
            this.lotPoly.setLatLngs(baseLot.map(transform));
        }

        // Commercial zone: only draw when site has commercial depth > 0
        if (cD > 0) {
            var commPts;
            if (parcelPolygon && parcelPolygon.length > 2) {
                // Polygon lot: clip parcel to the front commercialDepth strip using Sutherland-Hodgman
                var ppn2 = parcelPolygon.length;
                var pp2  = parcelPolygon;
                if (pp2[ppn2-1][0]===pp2[0][0] && pp2[ppn2-1][1]===pp2[0][1]) ppn2--;
                var cLat2 = 0, cLng2 = 0;
                for (var pi2 = 0; pi2 < ppn2; pi2++) { cLat2 += pp2[pi2][0]; cLng2 += pp2[pi2][1]; }
                cLat2 /= ppn2; cLng2 /= ppn2;
                // Convert to local ft (no software rotation — leaflet-rotate handles visual rotation)
                var lv2 = [];
                for (var pi2 = 0; pi2 < ppn2; pi2++) {
                    var ry2 = (pp2[pi2][0] - cLat2) * F_LAT;
                    var rx2 = (pp2[pi2][1] - cLng2) * F_LNG;
                    lv2.push({ x: rx2, y: ry2 }); // effectiveRotation=0, so no rotation
                }
                // Front = minX side; clip plane = x <= minX + cD
                var minX2 = lv2.reduce(function(m,v){ return Math.min(m,v.x); }, Infinity);
                var clipX2 = minX2 + cD;
                // SH clip against x <= clipX2
                var poly2 = lv2;
                var out2 = [];
                for (var ci = 0; ci < poly2.length; ci++) {
                    var ca = poly2[ci], cb = poly2[(ci + poly2.length - 1) % poly2.length];
                    var caIn = ca.x <= clipX2, cbIn = cb.x <= clipX2;
                    if (caIn) {
                        if (!cbIn) {
                            var ct = (clipX2 - cb.x) / (ca.x - cb.x);
                            out2.push({ x: clipX2, y: cb.y + ct * (ca.y - cb.y) });
                        }
                        out2.push(ca);
                    } else if (cbIn) {
                        var ct = (clipX2 - cb.x) / (ca.x - cb.x);
                        out2.push({ x: clipX2, y: cb.y + ct * (ca.y - cb.y) });
                    }
                }
                // Convert back to lat/lng using polygon centroid as origin
                if (out2.length >= 3) {
                    commPts = out2.map(function(pt) {
                        return [cLat2 + pt.y / F_LAT, cLng2 + pt.x / F_LNG];
                    });
                }
            }
            if (!commPts) {
                // Rectangle fallback: front cD strip
                commPts = [{x:-h/2,y:w/2},{x:-h/2+cD,y:w/2},{x:-h/2+cD,y:-w/2},{x:-h/2,y:-w/2}].map(transform);
            }
            this.commPoly.setLatLngs(commPts);
            if (ConfigEngine.state.commFront) {
                this.commPoly.setStyle({ fillOpacity: 0, fillColor: '#0f4c81', weight: 2, dashArray: '8 5', color: '#0f4c81' });
            } else {
                this.commPoly.setStyle({ fillOpacity: 0.15, fillColor: '#0f4c81', weight: 1, dashArray: null, color: '#0f4c81' });
            }
        } else {
            this.commPoly.setLatLngs([]);
        }
        this.updateNorthArrow();
        if (!this._isDragging) this.updateDimLabels();

        if (ConfigEngine.state.setbacksApplied) SetbackEngine.drawSetbacks();
        SetbackEngine.drawBuilding(this._isDragging);
        if (!this._exBldgEditActive && !this._isDragging) this.drawExistingBuildings();
        this.drawVehicles();

        // Debounced save — max once per 400ms, never during active drag
        if (!this._isDragging) {
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => ExportEngine.save(), 400);
        }
    },

    updateDimLabels: function() {
        this.dimLabels.forEach(m => this.map.removeLayer(m));
        this.dimLabels = [];
        if (!this.showDims) return;

        const { width: w, depth: h, parcelPolygon } = ConfigEngine.data;
        const rot = MapEngine.effectiveRotation();  // = state.rotation (see effectiveRotation comment)
        const rad = rot * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);

        const toLL = (pt) => {
            const rx = pt.x * cos - pt.y * sin;
            const ry = pt.x * sin + pt.y * cos;
            return [ConfigEngine.state.lat + ry / F_LAT, ConfigEngine.state.lng + rx / F_LNG];
        };

        const OFF = 7;   // ft: dim line offset outward from lot edge
        const EX2 = 2;   // ft: witness line overshoot past dim line
        const TK  = 1.2; // ft: half-length of 45deg tick
        // Annotative text gap + zoom-scaled font
        const mapZoom   = this.map.getZoom();
        const fontScale = Math.max(1.0, 0.5 + mapZoom * 0.04); // grows with zoom: ~1.26 at z19, ~1.38 at z22
        const mPerPx    = 40075016.686 * Math.cos(ConfigEngine.state.lat * Math.PI / 180) / Math.pow(2, mapZoom + 8);
        const ftPerPx   = mPerPx * 3.28084;
        const TO        = 10 * ftPerPx;

        const push = layer => { this.dimLabels.push(layer); return layer; };
        const line = (pts) => push(L.polyline(pts.map(toLL), {
            color: '#b91c1c', weight: 1.8, interactive: false, noClip: true
        }).addTo(this.map));

        // Label rotation: normalized to upright [-90, 90)
        const normalize = (a) => { a = ((a % 180) + 180) % 180; return a >= 90 ? a - 180 : a; };

        // ── Unified edge computation: polygon OR rectangle (incl. chamfer) ──
        var lotVerts;
        if (parcelPolygon && parcelPolygon.length > 2) {
            // Convert polygon vertices to local rotated coordinates.
            // Use state.lat/lng as origin (same as toLL) so lot-boundary dim endpoints
            // are in the same frame as building positions — prevents diagonal dim lines.
            var ppn = parcelPolygon.length;
            var pp = parcelPolygon;
            if (pp[ppn-1][0]===pp[0][0] && pp[ppn-1][1]===pp[0][1]) ppn--;
            lotVerts = [];
            for (var pi = 0; pi < ppn; pi++) {
                var ry_v = (pp[pi][0] - ConfigEngine.state.lat) * F_LAT;
                var rx_v = (pp[pi][1] - ConfigEngine.state.lng) * F_LNG;
                lotVerts.push({ x: rx_v * cos + ry_v * sin, y: ry_v * cos - rx_v * sin });
            }
        } else {
            // Use stored lot points from render() (includes corner chamfer)
            lotVerts = this._lotLocalPts || [{x:-h/2,y:-w/2},{x:-h/2,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2}];
        }
        // Signed area → winding direction (outward normal)
        var N = lotVerts.length;
        var signedArea = 0;
        for (var i = 0; i < N; i++) {
            var j = (i + 1) % N;
            signedArea += lotVerts[i].x * lotVerts[j].y - lotVerts[j].x * lotVerts[i].y;
        }
        var outSign = signedArea > 0 ? 1 : -1;
        // ── Arc detection: group consecutive short polygon segments into arc runs ──
        // GIS parcel data approximates curved lot lines with many tiny segments.
        // Without grouping, each segment gets its own dim label → stacked garbled text.
        var ARC_DEGEN    = 0.1;  // ft — truly degenerate/zero-length segment threshold
        var ARC_MAX_SEG  = 6;    // ft — segments shorter than this are arc candidates
        var ARC_MIN_RUN  = 4;    // minimum consecutive short segs to classify as an arc
        var ARC_LEN_RATIO = 2.0; // max length ratio between adjacent segs in the same arc

        // Pass 1: raw segments
        var rawSegs = [];
        for (var i = 0; i < N; i++) {
            var j = (i + 1) % N;
            var p1 = lotVerts[i], p2 = lotVerts[j];
            var dx = p2.x - p1.x, dy = p2.y - p1.y;
            var len = Math.sqrt(dx*dx + dy*dy);
            rawSegs.push({ idx: i, p1: p1, p2: p2, dx: dx, dy: dy, len: len });
        }

        // Pass 2: group into straight edges and arc runs.
        // Length-ratio check splits runs where two different-radius arcs meet
        // (e.g. a 1 ft/seg arc followed by a 2 ft/seg arc are separate physical curves).
        var groups = [];
        var si = 0;
        while (si < rawSegs.length) {
            var s = rawSegs[si];
            if (s.len < ARC_DEGEN) { si++; continue; }
            if (s.len < ARC_MAX_SEG) {
                var run = [s], sj = si + 1;
                while (sj < rawSegs.length && rawSegs[sj].len >= ARC_DEGEN && rawSegs[sj].len < ARC_MAX_SEG) {
                    var ratio = rawSegs[sj].len / run[run.length - 1].len;
                    if (ratio > ARC_LEN_RATIO || ratio < 1 / ARC_LEN_RATIO) break;
                    run.push(rawSegs[sj++]);
                }
                if (run.length >= ARC_MIN_RUN) {
                    groups.push({ type: 'arc', segs: run });
                    si = sj; continue;
                }
            }
            if (s.len >= ARC_DEGEN) groups.push({ type: 'seg', segs: [s] });
            si++;
        }

        // Pass 3: wrap-around merge — if first and last groups are both arcs with
        // compatible segment lengths (same physical arc split by the polygon seam), merge.
        if (groups.length >= 2 && groups[0].type === 'arc' && groups[groups.length - 1].type === 'arc') {
            var _g0 = groups[0], _gL = groups[groups.length - 1];
            var _avg0 = _g0.segs.reduce(function(s,e){return s+e.len;},0) / _g0.segs.length;
            var _avgL = _gL.segs.reduce(function(s,e){return s+e.len;},0) / _gL.segs.length;
            var _r = _avg0 > _avgL ? _avg0 / _avgL : _avgL / _avg0;
            if (_r <= ARC_LEN_RATIO) {
                var lastGrp = groups.pop();
                groups[0].segs = lastGrp.segs.concat(groups[0].segs);
            }
        }

        // Pass 4: build edges from groups
        var edges = [];
        groups.forEach(function(g, gi) {
            if (g.type === 'seg') {
                var s = g.segs[0];
                var ux = s.dx / s.len, uy = s.dy / s.len;
                var nx = uy * outSign;
                // Label angle: edge direction kept parallel to lot edge on rotated map.
                var labelAngle = normalize(-Math.atan2(uy, ux) * 180 / Math.PI);
                edges.push({ p1: s.p1, p2: s.p2, px: nx, py: -ux * outSign, ux: ux, uy: uy,
                    text: s.len.toFixed(1) + ' FT', rotA: labelAngle,
                    key: 'lot_' + gi, isPoly: true, isArc: false });
            } else {
                // Arc: total arc length = sum of all segment chord lengths.
                var arcLen = g.segs.reduce(function(sum, s) { return sum + s.len; }, 0);
                var ap1 = g.segs[0].p1;
                var ap2 = g.segs[g.segs.length - 1].p2;
                // Chord direction for label angle
                var cdx = ap2.x - ap1.x, cdy = ap2.y - ap1.y;
                var chordLen = Math.sqrt(cdx*cdx + cdy*cdy) || 1;
                var ux = cdx / chordLen, uy = cdy / chordLen;
                // Average outward normal across all arc segments
                var sumNx = 0, sumNy = 0;
                g.segs.forEach(function(s) {
                    sumNx += (s.dy / s.len) * outSign;
                    sumNy += (-s.dx / s.len) * outSign;
                });
                var nLen = Math.sqrt(sumNx*sumNx + sumNy*sumNy) || 1;
                var labelAngle = normalize(-Math.atan2(uy, ux) * 180 / Math.PI);
                // Arc midpoint vertex — label anchored here (at the arc's widest point)
                var midSeg = g.segs[Math.floor(g.segs.length / 2)];
                edges.push({ p1: ap1, p2: ap2, px: sumNx / nLen, py: sumNy / nLen, ux: ux, uy: uy,
                    arcMidPt: midSeg.p1,
                    text: arcLen.toFixed(1) + ' FT \u2312', rotA: labelAngle,
                    key: 'lot_' + gi, isPoly: true, isArc: true });
            }
        });

        edges.forEach((e) => {
            if (this.hiddenDimKeys.has(e.key)) return;
            const layers = [];
            const pLine = pts => { const l = line(pts); layers.push(l); return l; };

            // Per-edge offset (draggable) or default
            const edgeOff = (this._propDimOffsets && this._propDimOffsets[e.key]) || OFF;
            // Dim line endpoints (offset outward from edge)
            const d1 = { x: e.p1.x + edgeOff*e.px, y: e.p1.y + edgeOff*e.py };
            const d2 = { x: e.p2.x + edgeOff*e.px, y: e.p2.y + edgeOff*e.py };
            // Extension (witness) lines from corners past dim line
            pLine([e.p1, { x: e.p1.x + (edgeOff+EX2)*e.px, y: e.p1.y + (edgeOff+EX2)*e.py }]);
            pLine([e.p2, { x: e.p2.x + (edgeOff+EX2)*e.px, y: e.p2.y + (edgeOff+EX2)*e.py }]);
            // For arcs: label at arc midpoint vertex (widest point of curve);
            // dim line chord splits around chord midpoint.
            const chordMid = { x: (d1.x+d2.x)/2, y: (d1.y+d2.y)/2 };
            const mid = (e.isArc && e.arcMidPt)
                ? { x: e.arcMidPt.x + edgeOff*e.px, y: e.arcMidPt.y + edgeOff*e.py }
                : chordMid;
            // Dim line split around text — clamp gap to 30% of edge so dims stay visible when zoomed out
            const edgeLen = Math.sqrt((d2.x-d1.x)*(d2.x-d1.x)+(d2.y-d1.y)*(d2.y-d1.y));
            const gap = Math.min(TO, edgeLen * 0.3);
            pLine([d1, { x: chordMid.x - gap*e.ux, y: chordMid.y - gap*e.uy }]);
            pLine([{ x: chordMid.x + gap*e.ux, y: chordMid.y + gap*e.uy }, d2]);
            // 45-deg ticks
            const tkX = (e.ux + e.px) * 0.7071 * TK;
            const tkY = (e.uy + e.py) * 0.7071 * TK;
            pLine([{ x: d1.x - tkX, y: d1.y - tkY }, { x: d1.x + tkX, y: d1.y + tkY }]);
            pLine([{ x: d2.x - tkX, y: d2.y - tkY }, { x: d2.x + tkX, y: d2.y + tkY }]);

            // Property dim label — click dim line to drag (uses dimDragMode toggle)
            const m = L.marker(toLL(mid), {
                icon: L.divIcon({
                    className: '',
                    html: '<div style="position:relative"><div class="prop-dim-label" style="font-size:' + fontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + normalize(e.rotA - ConfigEngine.state.rotation).toFixed(1) + 'deg)">' + e.text + '</div></div>',
                    iconSize: [0, 0], iconAnchor: [0, 0]
                }),
                interactive: true
            }).addTo(this.map);
            layers.push(m);
            push(m);

            // Click line/label → drag handle for repositioning (same UX as chain dims)
            const self = this;
            const clickTarget = [m].concat(layers.filter(l => l instanceof L.Polyline));
            clickTarget.forEach(target => {
                target.options.interactive = true;
                target.on('click', (ev) => {
                    L.DomEvent.stop(ev.originalEvent || ev);
                    if (self._propDimHandle) { self.map.removeLayer(self._propDimHandle); self._propDimHandle = null; if (self._panEnabled) self.map.dragging.enable(); return; }
                    // Show drag handle at dim line midpoint
                    self.map.dragging.disable();
                    layers.forEach(ll => { if (ll._path) ll._path.classList.add('chain-dim-active'); });
                    self._propDimHandle = L.marker(toLL(mid), {
                        draggable: true,
                        icon: L.divIcon({ className: '', html: '<div class="chain-drag-handle"></div>', iconSize: [20,20], iconAnchor: [10,10] })
                    }).addTo(self.map);
                    self._propDimHandle.on('drag', () => {
                        // Move entire dim group: compute new perpendicular offset
                        var loc = self._propDimHandle.getLatLng();
                        var rlat = (loc.lat - ConfigEngine.state.lat) * F_LAT;
                        var rlng = (loc.lng - ConfigEngine.state.lng) * F_LNG;
                        var lx = rlng * cos + rlat * sin;
                        var ly = rlat * cos - rlng * sin;
                        // Project onto perpendicular axis to get new offset
                        var proj = (lx - (e.p1.x+e.p2.x)/2) * e.px + (ly - (e.p1.y+e.p2.y)/2) * e.py;
                        // Store per-edge offset
                        if (!self._propDimOffsets) self._propDimOffsets = {};
                        self._propDimOffsets[e.key] = Math.max(3, proj);
                        self.updateDimLabels();
                    });
                    self._propDimHandle.on('click', (e2) => {
                        L.DomEvent.stop(e2.originalEvent);
                        if (self._propDimHandle) { self.map.removeLayer(self._propDimHandle); self._propDimHandle = null; }
                        if (self._panEnabled) self.map.dragging.enable();
                        layers.forEach(ll => { if (ll._path) ll._path.classList.remove('chain-dim-active'); });
                        ExportEngine.save();
                    });
                });
            });
        });
    },

    attachEvents: function() {
        this._panEnabled = true;
        const self = this;

        // Zoom: clear dims immediately on zoom start (avoids stale layers during animation),
        // then rebuild once 100ms after zoom settles (debounce handles rapid scroll-wheel).
        // bldgFontScale and TO (label gap) are zoom-dependent so a rebuild IS needed,
        // but only ONCE per zoom gesture, not on every intermediate zoomend event.
        this.map.on('zoomstart', () => {
            this._isZooming = true;
            this.dimLabels.forEach(m => this.map.removeLayer(m));
            this.dimLabels = [];
            this.bldgDimLabels.forEach(m => this.map.removeLayer(m));
            this.bldgDimLabels = [];
        });
        this.map.on('zoomend', () => {
            this._isZooming = false;
            clearTimeout(this._zoomDimTimer);
            this._zoomDimTimer = setTimeout(() => {
                this.updateDimLabels();
                if (this.showBldgDims) SetbackEngine.updateBldgDimLabels();
            }, 100);
        });
        this.dragMarker.on('dragstart', () => { this._isDragging = true; });
        this.dragMarker.on('drag', () => {
            const raw = this.dragMarker.getLatLng();
            ConfigEngine.state.lat = raw.lat;
            ConfigEngine.state.lng = raw.lng;
            this.render();
        });
        this.dragMarker.on('dragend', () => {
            this._isDragging = false;
            this.render();  // final render with dims restored
            ExportEngine.save();
        });

        const sldr = document.getElementById('rotationSlider');
        const inp  = document.getElementById('degInput');

        sldr.value = ConfigEngine.state.rotation;
        inp.value  = ConfigEngine.state.rotation.toFixed(1);

        // Helper: setBearing then re-enforce pan lock (leaflet-rotate re-enables dragging)
        const _applyBearing = (deg) => {
            if (this.map.setBearing) this.map.setBearing(deg);
            if (!this._panEnabled) this.map.dragging.disable();
        };

        sldr.addEventListener('input', (e) => {
            ConfigEngine.state.rotation = parseFloat(e.target.value);
            ConfigEngine.state.siteNorthDeg = ConfigEngine.state.rotation;
            inp.value = ConfigEngine.state.rotation.toFixed(1);
            _applyBearing(-ConfigEngine.state.rotation);
            this.render();
        });
        inp.addEventListener('change', (e) => {
            let v = parseFloat(e.target.value);
            if (isNaN(v)) v = 0;
            v = ((v % 360) + 360) % 360;
            ConfigEngine.state.rotation = v;
            ConfigEngine.state.siteNorthDeg = v;
            inp.value = v.toFixed(1); sldr.value = v;
            _applyBearing(-v);
            this.render();
        });
        // Apply initial bearing from saved rotation
        _applyBearing(-ConfigEngine.state.rotation);
        document.getElementById('snapToggle').addEventListener('change', (e) => {
            ConfigEngine.state.isSnapping = e.target.checked;
            if (ConfigEngine.state.isSnapping) {
                this.map.addLayer(this.gridLayer); sldr.step = "5";
                const step = 0.00005;
                ConfigEngine.state.lat = Math.round(ConfigEngine.state.lat / step) * step;
                ConfigEngine.state.lng = Math.round(ConfigEngine.state.lng / step) * step;
                this.dragMarker.setLatLng([ConfigEngine.state.lat, ConfigEngine.state.lng]);
                ConfigEngine.state.rotation = Math.round(ConfigEngine.state.rotation / 5) * 5;
                sldr.value = ConfigEngine.state.rotation;
                inp.value  = ConfigEngine.state.rotation.toFixed(1);
                this.render();
            } else {
                this.map.removeLayer(this.gridLayer); sldr.step = "0.1";
            }
        });
        document.getElementById('resetBtn').addEventListener('click', () => {
            ConfigEngine.reset();
            const st = ConfigEngine.state;

            // Sync map position + rotation inputs
            this.dragMarker.setLatLng([st.lat, st.lng]);
            this.map.setView([st.lat, st.lng]);
            sldr.value = st.rotation;
            inp.value  = st.rotation.toFixed(1);

            // Sync lock state from site defaults
            const lockBtn = document.getElementById('lockPositionBtn');
            if (st.locked) {
                sldr.disabled = true;
                inp.disabled  = true;
                lockBtn.textContent = 'Locked';
                lockBtn.classList.add('locked');
            } else {
                sldr.disabled = false;
                inp.disabled  = false;
                lockBtn.textContent = 'Lock Position';
                lockBtn.classList.remove('locked');
            }
            // dragMarker always stays disabled outside Edit Parcel mode
            this.dragMarker.dragging.disable();
            this.dragMarker.setOpacity(0.0);
            const dmElR = this.dragMarker.getElement();
            if (dmElR) dmElR.style.pointerEvents = 'none';

            // Sync dim state from site defaults
            this.showBldgDims = st.showBldgDims;
            this.showDims     = st.showBldgDims;
            this.hiddenDimKeys.clear();
            (st.hiddenDimKeys || []).forEach(k => this.hiddenDimKeys.add(k));
            this.chainWOffset = st.chainWOffset;
            this.chainDOffset = st.chainDOffset;
            this.dimDragMode  = false;
            this.map.getContainer().classList.remove('dim-drag-mode-on');
            const ddCtrl = document.querySelector('.leaflet-control-dim-drag');
            if (ddCtrl) ddCtrl.classList.remove('dim-drag-active');
            const dimBtn = document.getElementById('bldgDimBtn');
            if (dimBtn) {
                if (st.showBldgDims) { dimBtn.classList.add('active'); dimBtn.textContent = 'Hide Dims'; }
                else { dimBtn.classList.remove('active'); dimBtn.textContent = 'Show Dims'; }
            }

            // Reset sidebar inputs from site defaults
            const sb = st.setbacks;
            document.getElementById('sb-front').value   = sb.front;
            document.getElementById('sb-rear').value    = sb.rear;
            document.getElementById('sb-side-l').value  = sb.sideL;
            document.getElementById('sb-side-r').value  = sb.sideR;
            const chk = document.getElementById('commFrontCheck');
            if (chk) chk.checked = st.commFront;

            // Reseed building inputs from site defaults
            SetbackEngine.rebuildSelector();
            SetbackEngine._seedInputsFromBuilding(st.activeBuilding);

            this.render();

            // Save AFTER all MapEngine state is cleaned up so _payload() captures the full reset
            ExportEngine.save();
        });
        document.getElementById('recordBtn').addEventListener('click', () => ExportEngine.generateLISP());
        document.getElementById('imageExportBtn').addEventListener('click', () => ExportEngine.exportImage());
        document.getElementById('saveBoundaryBtn').addEventListener('click', () => {
            ExportEngine.save();
            const btn = document.getElementById('saveBoundaryBtn');
            btn.textContent = 'Saved!'; btn.style.background = '#38a169';
            setTimeout(() => { btn.textContent = 'Save Boundary'; btn.style.removeProperty('background'); }, 1500);
        });

        document.getElementById('lockPositionBtn').addEventListener('click', () => {
            ConfigEngine.state.locked = !ConfigEngine.state.locked;
            const locked = ConfigEngine.state.locked;
            const btn = document.getElementById('lockPositionBtn');
            btn.textContent = locked ? 'Locked' : 'Lock Position';
            btn.classList.toggle('locked', locked);
            // Lock Position locks the rotation slider only (not lot drag — that requires Edit Parcel)
            const degInput = document.getElementById('degInput');
            const rotSlider = document.getElementById('rotationSlider');
            if (degInput) degInput.disabled = locked;
            if (rotSlider) rotSlider.disabled = locked;
            ExportEngine.save();
        });

        // Restore lock visual state on load
        if (ConfigEngine.state.locked) {
            const btn = document.getElementById('lockPositionBtn');
            btn.textContent = 'Locked';
            btn.classList.add('locked');
            const degInput = document.getElementById('degInput');
            const rotSlider = document.getElementById('rotationSlider');
            if (degInput) degInput.disabled = true;
            if (rotSlider) rotSlider.disabled = true;
        }
    }
};
