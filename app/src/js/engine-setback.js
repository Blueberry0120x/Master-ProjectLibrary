/* ==========================================
   ENGINE 4: SETBACK & CONCEPT MODE
   ========================================== */
const SetbackEngine = {
    applySetbacks: function() {
        const front = Math.max(0, parseFloat(document.getElementById('sb-front').value)  || 0);
        const rear  = Math.max(0, parseFloat(document.getElementById('sb-rear').value)   || 0);
        const sideL = Math.max(0, parseFloat(document.getElementById('sb-side-l').value) || 0);
        const sideR = Math.max(0, parseFloat(document.getElementById('sb-side-r').value) || 0);

        const { width: w, depth: h } = ConfigEngine.data;
        const _applyPP = ConfigEngine.data.parcelPolygon;
        const _isPolyLot = _applyPP && _applyPP.length > 2;
        if (!_isPolyLot && (front + rear >= h || sideL + sideR >= w)) {
            alert("Setbacks exceed lot dimensions — please reduce values.");
            return;
        }
        ConfigEngine.state.setbacks        = { front, rear, sideL, sideR };
        ConfigEngine.state.setbacksApplied = true;
        this.drawSetbacks();
    },

    saveSetbacks: function() {
        ExportEngine.save();
        const btn = document.getElementById('saveSetbackBtn');
        btn.textContent = 'Saved!'; btn.style.background = '#2f855a';
        setTimeout(() => { btn.textContent = 'Save Setbacks'; btn.style.background = ''; }, 1800);
    },

    _bearingCardinal: function(b) {
        const dirs = ['N','NE','E','SE','S','SW','W','NW','N'];
        return dirs[Math.round(((b % 360) + 360) % 360 / 45)] || 'W';
    },

    _updateFrontBearingDisplay: function(bearing) {
        const lbl = document.getElementById('frontBearingCardinal');
        const inp = document.getElementById('frontBearingInput');
        if (lbl) lbl.textContent = this._bearingCardinal(bearing);
        if (inp) inp.value = bearing;
    },

    // Activates front-edge pick mode: place clickable markers at each lot edge midpoint
    _activateFrontEdgePick: function() {
        const state  = ConfigEngine.state;
        const pp     = ConfigEngine.data.parcelPolygon;
        const F_LAT  = 364566;
        const F_LNG  = 365228 * Math.cos(state.lat * Math.PI / 180);

        // Build edge vertices from polygon or rectangle
        var verts = [], cLat, cLng;
        if (pp && pp.length > 2) {
            var n = pp.length;
            if (pp[n-1][0] === pp[0][0] && pp[n-1][1] === pp[0][1]) n--;
            cLat = 0; cLng = 0;
            for (var i = 0; i < n; i++) { cLat += pp[i][0]; cLng += pp[i][1]; }
            cLat /= n; cLng /= n;
            for (var i = 0; i < n; i++) verts.push(pp[i]);
        } else {
            // Rectangle: 4 edges in geographic frame (effectiveRotation=0)
            var hd = ConfigEngine.data.depth / 2, hw = ConfigEngine.data.width / 2;
            cLat = state.lat; cLng = state.lng;
            verts = [
                [state.lat - hd / F_LAT, state.lng - hw / F_LNG],
                [state.lat + hd / F_LAT, state.lng - hw / F_LNG],
                [state.lat + hd / F_LAT, state.lng + hw / F_LNG],
                [state.lat - hd / F_LAT, state.lng + hw / F_LNG]
            ];
        }

        var n = verts.length;
        MapEngine._clearFrontPick();
        MapEngine.map.dragging.disable();   // prevent map pan while picking an edge

        // Instruction overlay
        var inst = document.createElement('div');
        inst.id = 'front-pick-overlay';
        inst.style.cssText = 'position:absolute;top:56px;left:50%;transform:translateX(-50%);' +
            'z-index:1001;background:rgba(255,255,255,.97);border:2px solid #0f4c81;' +
            'border-radius:8px;padding:6px 16px;font-size:13px;font-weight:700;color:#0f4c81;' +
            'box-shadow:0 4px 12px rgba(0,0,0,.2);pointer-events:none;white-space:nowrap;';
        inst.textContent = 'Click the front (street-facing) edge';
        MapEngine.map.getContainer().appendChild(inst);
        MapEngine._frontPickOverlay = inst;

        for (var i = 0; i < n; i++) {
            var j = (i + 1) % n;
            var lat_i = verts[i][0], lng_i = verts[i][1];
            var lat_j = verts[j][0], lng_j = verts[j][1];
            var midLat = (lat_i + lat_j) / 2;
            var midLng = (lng_i + lng_j) / 2;

            // Outward normal → compass bearing
            var dx = (lng_j - lng_i) * F_LNG, dy = (lat_j - lat_i) * F_LAT;
            var len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.1) continue;
            var ux = dx / len, uy = dy / len;
            // Normal candidates: left (-uy, ux) and right (uy, -ux) of travel
            var nx1 = -uy, ny1 = ux;
            var toCentX = (cLng - midLng) * F_LNG;
            var toCentY = (cLat - midLat) * F_LAT;
            var dot1 = nx1 * toCentX + ny1 * toCentY;
            // Outward normal points away from centroid (negative dot with toCent)
            var outNx = dot1 < 0 ? nx1 : uy;
            var outNy = dot1 < 0 ? ny1 : -ux;
            var bearing = ((Math.atan2(outNx, outNy) * 180 / Math.PI) % 360 + 360) % 360;
            bearing = Math.round(bearing * 100) / 100;  // 2 decimal places for sub-degree precision

            (function(bear, mLat, mLng) {
                var m = L.marker([mLat, mLng], {
                    icon: L.divIcon({
                        className: '',
                        html: '<div class="front-pick-dot">&#x25BA; Front?</div>',
                        iconSize: [64, 24], iconAnchor: [32, 12]
                    }),
                    interactive: true, zIndexOffset: 1000,
                    pane: 'popupPane',          // render above all other layers
                    bubblingMouseEvents: false   // don't let clicks pass through
                }).addTo(MapEngine.map);
                // Block pointer events from reaching the map drag handler
                m.on('add', function() {
                    L.Util.requestAnimFrame(function() {
                        var el = m.getElement();
                        if (!el) return;
                        L.DomEvent.on(el, 'pointerdown mousedown touchstart', function(e) {
                            L.DomEvent.stopPropagation(e);
                            L.DomEvent.preventDefault(e);
                        });
                    });
                });
                m.on('click', function(ev) {
                    if (ev.originalEvent) L.DomEvent.stop(ev.originalEvent);
                    SetbackEngine._setFrontBearing(bear);
                    MapEngine._clearFrontPick();
                    const btn = document.getElementById('setFrontEdgeBtn');
                    if (btn) btn.classList.remove('active');
                });
                MapEngine._frontPickLayers.push(m);
            })(bearing, midLat, midLng);
        }
    },

    _setFrontBearing: function(bearing) {
        const state = ConfigEngine.state;
        state.frontBearing = bearing;
        this._updateFrontBearingDisplay(bearing);
        if (state.setbacksApplied) this.drawSetbacks();
        ExportEngine.save();
    },

    // Returns the building's axis-aligned bounding half-extents at a given orientation
    buildingExtents: function(bldg) {
        const hw   = bldg.W / 2, hh = bldg.D / 2;
        const bRad = bldg.orientation * Math.PI / 180;
        const aC   = Math.abs(Math.cos(bRad)), aS = Math.abs(Math.sin(bRad));
        return {
            halfDepth: hh * aC + hw * aS,
            halfWidth: hh * aS + hw * aC
        };
    },

    // Clamp a building's base center so its full stack stays within the lot
    clampToLot: function(cx, cy, bldg) {
        const { width: lotW, depth: lotD, parcelPolygon: pp } = ConfigEngine.data;
        const count        = bldg.count        || 1;
        const stackSpacing = bldg.stackSpacing || 0;
        const stackAngle   = bldg.stackAngle   || 0;
        const anchor       = bldg.anchor       || 'center';
        const hw   = bldg.W / 2, hh = bldg.D / 2;
        const bRad = bldg.orientation * Math.PI / 180;
        const bCos = Math.cos(bRad), bSin = Math.sin(bRad);
        const { halfDepth, halfWidth } = this.buildingExtents(bldg);

        const sAngRad   = stackAngle * Math.PI / 180;
        const sDirX     = Math.cos(sAngRad);
        const sDirY     = Math.sin(sAngRad);
        const halfInDir = Math.abs(hh * (bCos * sDirX + bSin * sDirY)) +
                          Math.abs(hw * (-bSin * sDirX + bCos * sDirY));
        const step = halfInDir * 2 + stackSpacing;
        const aOff = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;

        // Compute bounding box of ALL copies relative to anchor (cx,cy)
        const jOff0 = -aOff * step, jOffN = (count - 1 - aOff) * step;
        const arrXMin = Math.min(jOff0 * sDirX, jOffN * sDirX) - halfDepth;
        const arrXMax = Math.max(jOff0 * sDirX, jOffN * sDirX) + halfDepth;
        const arrYMin = Math.min(jOff0 * sDirY, jOffN * sDirY) - halfWidth;
        const arrYMax = Math.max(jOff0 * sDirY, jOffN * sDirY) + halfWidth;

        // For polygon sites — enforce hard boundary via per-corner polygon containment.
        // AABB is too loose for irregular/rotated polygons; corners can escape.
        if (pp && pp.length > 2) {
            var pn = pp.length;
            if (pp[pn-1][0]===pp[0][0] && pp[pn-1][1]===pp[0][1]) pn--;
            // MUST use state.lat/lng as origin (same as toLatLng/drawBuilding) so
            // polygon vertices and building (cx, cy) are in the same Frame B.
            var cLat = ConfigEngine.state.lat, cLng = ConfigEngine.state.lng;
            var F_LAT = 364566, F_LNG = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);
            var rad = MapEngine.effectiveRotation() * Math.PI / 180;
            var lc = Math.cos(rad), ls = Math.sin(rad);

            // Convert polygon vertices to Frame B
            var poly = [];
            for (var i = 0; i < pn; i++) {
                var ry = (pp[i][0] - cLat) * F_LAT, rx = (pp[i][1] - cLng) * F_LNG;
                poly.push({ x: rx * lc + ry * ls, y: ry * lc - rx * ls });
            }

            // Winding direction — shoelace signed area
            // area2 > 0: CCW (standard math); area2 < 0: CW
            var area2 = 0;
            for (var i = 0; i < pn; i++) {
                var j = (i + 1) % pn;
                area2 += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
            }
            var windSign = area2 > 0 ? 1 : -1; // outward = windSign*(edy, -edx)

            // All 4 corners of every stack copy at anchor (cx, cy)
            var stackCorners = function(acx, acy) {
                var cs = [];
                for (var c = 0; c < count; c++) {
                    var jOff = (-aOff + c) * step;
                    var bcx = acx + jOff * sDirX, bcy = acy + jOff * sDirY;
                    cs.push(
                        { x: bcx + hh*bCos - hw*bSin, y: bcy + hh*bSin + hw*bCos },
                        { x: bcx + hh*bCos + hw*bSin, y: bcy + hh*bSin - hw*bCos },
                        { x: bcx - hh*bCos + hw*bSin, y: bcy - hh*bSin - hw*bCos },
                        { x: bcx - hh*bCos - hw*bSin, y: bcy - hh*bSin + hw*bCos }
                    );
                }
                return cs;
            };

            // Iteratively push center inward for each violated polygon edge
            for (var iter = 0; iter < pn + 4; iter++) {
                var pushed = false;
                var cs = stackCorners(cx, cy);
                for (var i = 0; i < pn; i++) {
                    var j = (i + 1) % pn;
                    var edx = poly[j].x - poly[i].x, edy = poly[j].y - poly[i].y;
                    // Outward-facing unit normal
                    var onx = windSign * edy, ony = -windSign * edx;
                    var olen = Math.sqrt(onx * onx + ony * ony);
                    if (olen < 1e-9) continue;
                    onx /= olen; ony /= olen;
                    // Max penetration depth (positive = outside this edge)
                    var maxPen = 0;
                    for (var k = 0; k < cs.length; k++) {
                        var d = (cs[k].x - poly[i].x) * onx + (cs[k].y - poly[i].y) * ony;
                        if (d > maxPen) maxPen = d;
                    }
                    if (maxPen > 0) {
                        cx -= onx * maxPen;
                        cy -= ony * maxPen;
                        pushed = true;
                    }
                }
                if (!pushed) break;
            }
            return { cx: cx, cy: cy };
        }

        const lotHD = lotD / 2, lotHW = lotW / 2;
        const xMin = -lotHD - arrXMin;
        const xMax =  lotHD - arrXMax;
        const yMin = -lotHW - arrYMin;
        const yMax =  lotHW - arrYMax;
        return {
            cx: Math.max(xMin <= xMax ? xMin : -lotHD, Math.min(xMin <= xMax ? xMax : lotHD, cx)),
            cy: Math.max(yMin <= yMax ? yMin : -lotHW, Math.min(yMin <= yMax ? yMax : lotHW, cy))
        };
    },

    // ── Inter-building spacing helpers ────────────────────────────────────────

    _computeGap: function(idx) {
        const state = ConfigEngine.state;
        if (idx <= 0 || idx >= state.buildings.length) return null;
        const prev    = state.buildings[idx - 1];
        const bldg    = state.buildings[idx];
        const prevExt = this.buildingExtents(prev);
        const thisExt = this.buildingExtents(bldg);
        return parseFloat((bldg.offsetX - prev.offsetX - prevExt.halfDepth - thisExt.halfDepth).toFixed(1));
    },

    _maxGap: function(idx) {
        const state = ConfigEngine.state;
        if (idx <= 0 || idx >= state.buildings.length) return null;
        const { depth: lotD } = ConfigEngine.data;
        const { front, rear } = state.setbacks;
        const prev    = state.buildings[idx - 1];
        const bldg    = state.buildings[idx];
        const prevExt = this.buildingExtents(prev);
        const thisExt = this.buildingExtents(bldg);
        const count   = bldg.count        || 1;
        const sS      = bldg.stackSpacing || 0;
        const anchor  = bldg.anchor       || 'center';
        const step    = thisExt.halfDepth * 2 + sS;
        const aOff    = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;
        const xMax       = lotD / 2 - (count - 1 - aOff) * step - thisExt.halfDepth;
        const maxOffsetX = xMax - (front - rear) / 2;
        return parseFloat((maxOffsetX - prev.offsetX - prevExt.halfDepth - thisExt.halfDepth).toFixed(1));
    },

    _applyGap: function(idx, gap) {
        const state = ConfigEngine.state;
        if (idx <= 0) return;
        const prev    = state.buildings[idx - 1];
        const bldg    = state.buildings[idx];
        const prevExt = this.buildingExtents(prev);
        const thisExt = this.buildingExtents(bldg);
        bldg.offsetX = prev.offsetX + prevExt.halfDepth + thisExt.halfDepth + gap;
        bldg.spacing = gap;
        const ox = document.getElementById('bldgOffsetX');
        if (ox && ConfigEngine.state.activeBuilding === idx) ox.value = bldg.offsetX.toFixed(1);
    },

    // ── Building selector UI ──────────────────────────────────────────────────

    rebuildSelector: function() {
        const state = ConfigEngine.state;
        const sel   = document.getElementById('bldgSelector');
        if (!sel) return;
        [...sel.querySelectorAll('.bldg-tab')].forEach(b => b.remove());
        // Remove all EX-related buttons (rebuilt fresh each time)
        [...sel.querySelectorAll('.bldg-tab-ex, .bldg-tab-ex-add, .bldg-tab-ex-del')].forEach(b => b.remove());
        const addBtn = sel.querySelector('.bldg-tab-add');

        // Regular building tabs (B1, B2, ...) with lock icons
        state.buildings.forEach((bldg, i) => {
            const btn = document.createElement('button');
            btn.className = 'bldg-tab' + (i === state.activeBuilding ? ' active' : '');
            btn.title = 'Building ' + (i + 1) + (bldg.locked ? ' (locked)' : '');
            const lbl = document.createElement('span');
            lbl.textContent = 'B' + (i + 1);
            btn.appendChild(lbl);
            const lockSpan = document.createElement('span');
            lockSpan.textContent = bldg.locked ? ' \uD83D\uDD12' : ' \uD83D\uDD13';
            lockSpan.style.cssText = 'font-size:0.7em;cursor:pointer;display:inline-block;';
            lockSpan.title = bldg.locked ? 'Unlock building' : 'Lock building';
            lockSpan.setAttribute('role', 'button');
            lockSpan.setAttribute('tabindex', '0');
            lockSpan.setAttribute('aria-label', (bldg.locked ? 'Unlock' : 'Lock') + ' building ' + (i + 1));
            const lockToggle = (e) => { e.stopPropagation(); this.toggleBuildingLock(i); };
            lockSpan.addEventListener('click', lockToggle);
            lockSpan.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lockToggle(e); } });
            btn.appendChild(lockSpan);
            btn.addEventListener('click', () => this.setActiveBuilding(i));
            sel.insertBefore(btn, addBtn);
        });

        // EX building tabs (EX1, EX2, ...) with lock icons
        const exBuildings = state.existingBuildings || [];
        exBuildings.forEach((ex, i) => {
            const exBtn = document.createElement('button');
            exBtn.className = 'bldg-tab-ex' + (i === state.activeExBuilding ? ' active' : '');
            exBtn.title = 'Existing building ' + (i + 1) + (ex.locked ? ' (locked)' : '');
            const exLbl = document.createElement('span');
            exLbl.textContent = 'EX' + (i + 1);
            exBtn.appendChild(exLbl);
            const exLockSpan = document.createElement('span');
            exLockSpan.textContent = ex.locked ? ' \uD83D\uDD12' : ' \uD83D\uDD13';
            exLockSpan.style.cssText = 'font-size:0.7em;cursor:pointer;display:inline-block;';
            exLockSpan.title = ex.locked ? 'Unlock EX' + (i + 1) : 'Lock EX' + (i + 1);
            exLockSpan.setAttribute('role', 'button');
            exLockSpan.setAttribute('tabindex', '0');
            exLockSpan.setAttribute('aria-label', (ex.locked ? 'Unlock' : 'Lock') + ' existing building ' + (i + 1));
            const exLockToggle = (e) => { e.stopPropagation(); this.toggleExBuildingLock(i); };
            exLockSpan.addEventListener('click', exLockToggle);
            exLockSpan.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); exLockToggle(e); } });
            exBtn.appendChild(exLockSpan);
            exBtn.addEventListener('click', () => this.setActiveExBuilding(i));
            sel.insertBefore(exBtn, addBtn);
        });

        // + EX add button (always shown)
        const exAddBtn = document.createElement('button');
        exAddBtn.className = 'bldg-tab-ex-add';
        exAddBtn.textContent = '+ EX';
        exAddBtn.title = 'Add existing building overlay';
        exAddBtn.addEventListener('click', () => this.addExBuilding());
        sel.insertBefore(exAddBtn, addBtn);

        // Delete button for active EX building
        const activeExIdx = state.activeExBuilding;
        if (activeExIdx >= 0 && activeExIdx < exBuildings.length) {
            const exDelBtn = document.createElement('button');
            exDelBtn.className = 'bldg-tab-ex-del';
            exDelBtn.textContent = '\u2715 EX' + (activeExIdx + 1);
            exDelBtn.title = 'Remove EX' + (activeExIdx + 1);
            exDelBtn.addEventListener('click', () => {
                if (confirm('Remove EX' + (activeExIdx + 1) + '? This cannot be undone.')) this.removeActiveExBuilding();
            });
            sel.insertBefore(exDelBtn, addBtn);
        }
    },

    setActiveBuilding: function(idx) {
        const state = ConfigEngine.state;
        if (idx < 0 || idx >= state.buildings.length) return;
        state.activeBuilding = idx;
        this._seedInputsFromBuilding(idx);
        this.rebuildSelector();
        MapEngine.buildingMarkers.forEach((m, i) => {
            if (!m._icon) return;
            const pin = m._icon.querySelector('.bldg-drag-pin');
            if (pin) pin.classList.toggle('active', i === idx);
        });
    },

    _seedInputsFromBuilding: function(idx) {
        const bldg = ConfigEngine.state.buildings[idx];
        if (!bldg) return;
        var normOri = ((bldg.orientation % 360) + 360) % 360;
        bldg.orientation = normOri;
        document.getElementById('bldgOrientInput').value    = normOri.toFixed(1);
        document.getElementById('bldgOrientSlider').value   = normOri;
        document.getElementById('bldgW').value          = (bldg.W || 30).toFixed(1);
        document.getElementById('bldgD').value          = (bldg.D || 60).toFixed(1);
        var wSldr = document.getElementById('bldgWSlider');
        var dSldr = document.getElementById('bldgDSlider');
        if (wSldr) wSldr.value = bldg.W || 30;
        if (dSldr) dSldr.value = bldg.D || 60;
        document.getElementById('bldgOffsetX').value        = (bldg.offsetX      || 0).toFixed(1);
        document.getElementById('bldgOffsetY').value        = (bldg.offsetY      || 0).toFixed(1);
        var oxSldr = document.getElementById('bldgOffsetXSlider');
        var oySldr = document.getElementById('bldgOffsetYSlider');
        if (oxSldr) oxSldr.value = bldg.offsetX || 0;
        if (oySldr) oySldr.value = bldg.offsetY || 0;
        document.getElementById('bldgCount').value          = bldg.count         || 1;
        document.getElementById('bldgStackSpacing').value   = (bldg.stackSpacing || 0).toFixed(1);
        const sAng   = bldg.stackAngle || 0;
        const angEl  = document.getElementById('bldgStackAngle');
        const dirBtn = document.getElementById('bldgStackDirBtn');
        if (angEl)  angEl.value = sAng;
        const angSlider = document.getElementById('bldgStackAngleSlider');
        if (angSlider) angSlider.value = sAng;
        if (dirBtn) dirBtn.textContent = sAng + '\u00B0';
        document.getElementById('bldgStories').value        = bldg.stories       || 1;
        document.getElementById('bldgFloorHeight').value    = (bldg.floorHeight  || 9).toFixed(1);

        // Inter-building spacing (S) — disabled for B1
        const spEl   = document.getElementById('bldgSpacing');
        const sHint  = document.getElementById('spacingHint');
        if (spEl) {
            if (idx > 0) {
                const gap    = this._computeGap(idx);
                const maxGap = this._maxGap(idx);
                spEl.value    = gap !== null ? gap.toFixed(1) : '0.0';
                spEl.disabled = false;
                if (sHint && maxGap !== null) {
                    sHint.title = 'Max: ' + maxGap.toFixed(1) + ' ft';
                    sHint.style.display = '';
                }
            } else {
                spEl.value    = '';
                spEl.disabled = true;
                if (sHint) sHint.style.display = 'none';
            }
        }

        // Anchor buttons
        const anchorMap = { anchorFront: 'front', anchorCenter: 'center', anchorRear: 'rear' };
        const bldgAnchor = bldg.anchor || 'center';
        Object.keys(anchorMap).forEach(aId => {
            const el = document.getElementById(aId);
            if (el) el.classList.toggle('active', anchorMap[aId] === bldgAnchor);
        });

        this.updateFAR();
    },

    addBuilding: function() {
        const state   = ConfigEngine.state;
        const src     = state.buildings[state.activeBuilding] || state.buildings[0] || ConfigEngine.defaultBuilding;
        const last    = state.buildings[state.buildings.length - 1];
        const lastExt = this.buildingExtents(last);
        const newBldg = {
            orientation:  src.orientation,
            W:            src.W,
            D:            src.D,
            offsetX:      0,
            offsetY:      last.offsetY || 0,
            spacing:      0,
            count:        1,
            stackSpacing: 0,
            stackAngle:   0,
            anchor:       'center',
            stories:      src.stories     || 1,
            floorHeight:  src.floorHeight || 9
        };
        const newExt    = this.buildingExtents(newBldg);
        newBldg.offsetX = last.offsetX + lastExt.halfDepth + newExt.halfDepth;
        state.buildings.push(newBldg);
        state.activeBuilding = state.buildings.length - 1;
        this.rebuildSelector();
        this._seedInputsFromBuilding(state.activeBuilding);
        this.drawBuilding();
    },

    removeLastBuilding: function() {
        const state = ConfigEngine.state;
        if (state.buildings.length <= 1) return;
        // Remove the active (selected) building, not just the last one
        const idx = state.activeBuilding;
        state.buildings.splice(idx, 1);
        if (state.activeBuilding >= state.buildings.length) {
            state.activeBuilding = state.buildings.length - 1;
        }
        this.rebuildSelector();
        this._seedInputsFromBuilding(state.activeBuilding);
        this.drawBuilding();
    },

    addExBuilding: function() {
        const state = ConfigEngine.state;
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
        const hw = 15 / F_LNG, hd = 10 / F_LAT; // 30ft wide, 20ft deep default
        state.existingBuildings.push({
            polygon: [
                [state.lat + hd, state.lng - hw],
                [state.lat + hd, state.lng + hw],
                [state.lat - hd, state.lng + hw],
                [state.lat - hd, state.lng - hw]
            ],
            locked: false
        });
        state.activeExBuilding = state.existingBuildings.length - 1;
        this.rebuildSelector();
        MapEngine.drawExistingBuildings();
        MapEngine._buildExBldgEditControl();
        ExportEngine.save();
    },

    removeActiveExBuilding: function() {
        const state = ConfigEngine.state;
        const idx = state.activeExBuilding;
        if (idx < 0 || idx >= state.existingBuildings.length) return;
        state.existingBuildings.splice(idx, 1);
        state.activeExBuilding = state.existingBuildings.length > 0
            ? Math.min(idx, state.existingBuildings.length - 1)
            : -1;
        this.rebuildSelector();
        MapEngine.drawExistingBuildings();
        MapEngine._buildExBldgEditControl();
        ExportEngine.save();
    },

    setActiveExBuilding: function(idx) {
        const state = ConfigEngine.state;
        if (idx < 0 || idx >= state.existingBuildings.length) return;
        state.activeExBuilding = idx;
        this.rebuildSelector();
        MapEngine.drawExistingBuildings();
    },

    toggleExBuildingLock: function(idx) {
        const state = ConfigEngine.state;
        if (idx < 0 || idx >= state.existingBuildings.length) return;
        state.existingBuildings[idx].locked = !state.existingBuildings[idx].locked;
        this.rebuildSelector();
        MapEngine.drawExistingBuildings();
        MapEngine._buildExBldgEditControl();
        ExportEngine.save();
    },

    toggleBuildingLock: function(idx) {
        const state = ConfigEngine.state;
        if (idx < 0 || idx >= state.buildings.length) return;
        state.buildings[idx].locked = !state.buildings[idx].locked;
        const m = MapEngine.buildingMarkers[idx];
        if (m) {
            if (state.buildings[idx].locked) m.dragging.disable();
            else m.dragging.enable();
        }
        this.rebuildSelector();
        ExportEngine.save();
    },

    // ── Core draw ─────────────────────────────────────────────────────────────

    drawBuilding: function(skipMarker) {
        if (!MapEngine.map) return;
        // Don't clobber the polygon while VertexEngine PM edit is active
        if (typeof VertexEngine !== 'undefined' && VertexEngine._frozen) return;
        const state     = ConfigEngine.state;
        const buildings = state.buildings;
        const bCount    = buildings.length;

        // Sync outer poly array (one inner array per building entry)
        while (MapEngine.buildingPolys.length < bCount) MapEngine.buildingPolys.push([]);
        while (MapEngine.buildingPolys.length > bCount) {
            MapEngine.buildingPolys.pop().forEach(p => MapEngine.map.removeLayer(p));
        }

        // Sync marker array (one per building entry)
        while (MapEngine.buildingMarkers.length < bCount) {
            MapEngine.buildingMarkers.push(MapEngine.createBuildingMarker(MapEngine.buildingMarkers.length));
        }
        while (MapEngine.buildingMarkers.length > bCount) {
            MapEngine.map.removeLayer(MapEngine.buildingMarkers.pop());
        }

        const { front, rear, sideL, sideR } = state.setbacks;
        const toLatLng = pt => MapEngine.toLatLng(pt, state);

        buildings.forEach((bldg, i) => {
            const count        = bldg.count        || 1;
            const stackSpacing = bldg.stackSpacing || 0;
            const anchor       = bldg.anchor       || 'center';
            const hw   = bldg.W / 2, hh = bldg.D / 2;
            const bRad = bldg.orientation * Math.PI / 180;
            const bCos = Math.cos(bRad), bSin = Math.sin(bRad);

            const rawCx = (front - rear) / 2 + (bldg.offsetX || 0);
            const rawCy = (sideR - sideL) / 2 + (bldg.offsetY || 0);

            // Non-overlap first: push preCx past previous building if needed
            // Skip if free drag mode is active
            let preCx = rawCx;
            if (i > 0 && !state.freeDrag) {
                const prev       = buildings[i - 1];
                const prevExt    = this.buildingExtents(prev);
                const thisExt    = this.buildingExtents(bldg);
                const prevBaseCx = (prev.offsetX || 0) + (front - rear) / 2;
                preCx = Math.max(rawCx, prevBaseCx + prevExt.halfDepth + thisExt.halfDepth);
            }
            // Lot boundary is always enforced — buildings cannot leave the lot
            let baseCx, cy;
            ({ cx: baseCx, cy } = this.clampToLot(preCx, rawCy, bldg));

            // Update state if clamped or adjusted
            const newOX = baseCx - (front - rear) / 2;
            const newOY = cy - (sideR - sideL) / 2;
            if (Math.abs(newOX - bldg.offsetX) > 0.001 || Math.abs(newOY - bldg.offsetY) > 0.001) {
                bldg.offsetX = newOX; bldg.offsetY = newOY;
                if (state.activeBuilding === i) {
                    const ox   = document.getElementById('bldgOffsetX');
                    const oy   = document.getElementById('bldgOffsetY');
                    const spEl = document.getElementById('bldgSpacing');
                    if (ox) ox.value = newOX.toFixed(1);
                    if (oy) oy.value = newOY.toFixed(1);
                    if (i > 0 && spEl && !spEl.disabled) spEl.value = this._computeGap(i).toFixed(1);
                }
            }

            // Sync inner polygon array for this building's stack
            if (!MapEngine.buildingPolys[i]) MapEngine.buildingPolys[i] = [];
            while (MapEngine.buildingPolys[i].length < count) {
                const p = L.polygon([], {
                    color: '#e67e22', weight: 2, fillColor: '#e67e22',
                    fillOpacity: 0.18, dashArray: '5 3', noClip: true
                }).addTo(MapEngine.map);
                MapEngine.buildingPolys[i].push(p);
            }
            while (MapEngine.buildingPolys[i].length > count) {
                MapEngine.map.removeLayer(MapEngine.buildingPolys[i].pop());
            }

            const sAngRad      = ((bldg.stackAngle || 0) * Math.PI / 180);
            const sDirX        = Math.cos(sAngRad);
            const sDirY        = Math.sin(sAngRad);
            const halfInDir    = Math.abs(hh * (bCos * sDirX + bSin * sDirY)) +
                                 Math.abs(hw * (-bSin * sDirX + bCos * sDirY));
            const step         = halfInDir * 2 + stackSpacing;
            const anchorOffset = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;

            for (let j = 0; j < count; j++) {
                const jOff = (j - anchorOffset) * step;
                const cx   = baseCx + jOff * sDirX;
                const cy_j = cy     + jOff * sDirY;
                let oriented;
                if (bldg.polygon && bldg.polygon.length >= 3) {
                    // Custom vertex polygon — offsets are relative to building center
                    oriented = bldg.polygon.map(v => {
                        const vx = v[0], vy = v[1];
                        return { x: cx + vx * bCos - vy * bSin, y: cy_j + vx * bSin + vy * bCos };
                    });
                } else {
                    // Default W×D rectangle
                    const raw = [
                        { x: cx - hh, y: cy_j + hw }, { x: cx + hh, y: cy_j + hw },
                        { x: cx + hh, y: cy_j - hw }, { x: cx - hh, y: cy_j - hw }
                    ];
                    oriented = raw.map(pt => {
                        const dx = pt.x - cx, dy = pt.y - cy_j;
                        return { x: cx + dx * bCos - dy * bSin, y: cy_j + dx * bSin + dy * bCos };
                    });
                }
                MapEngine.buildingPolys[i][j].setLatLngs(oriented.map(toLatLng));
            }

            if (!skipMarker) {
                MapEngine.buildingMarkers[i].setLatLng(toLatLng({ x: baseCx, y: cy }));
            }
        });

        // Highlight active marker and enforce lock state
        MapEngine.buildingMarkers.forEach((m, i) => {
            if (!m._icon) return;
            const pin = m._icon.querySelector('.bldg-drag-pin');
            if (pin) pin.classList.toggle('active', i === state.activeBuilding);
            const bldg = state.buildings[i];
            if (bldg && bldg.locked) m.dragging.disable();
            else if (bldg) m.dragging.enable();
        });

        this.updateBldgDimLabels();
        this.updateFAR();
    },

    updateBldgDimLabels: function() {
        MapEngine.bldgDimLabels.forEach(m => MapEngine.map.removeLayer(m));
        MapEngine.bldgDimLabels = [];
        if (!MapEngine.showBldgDims) return;

        const state  = ConfigEngine.state;
        const { front, rear, sideL, sideR } = state.setbacks;
        // Lot-frame rotation from frontBearing — a fixed per-site property that defines
        // the lot's geographic orientation. Unlike state.rotation (changes with slider,
        // causing chain dims to tumble) and unlike 0 (doesn't align with polygon lots),
        // frontBearing gives correct lot-axis alignment at ALL slider positions.
        // Default FB=270° → lRad=0, matching effectiveRotation=0 for rectangular lots.
        const fb   = (state.frontBearing ?? 270) * Math.PI / 180;
        const lRad = -(Math.PI / 2 + fb);
        const lCos  = Math.cos(lRad), lSin = Math.sin(lRad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
        const toLatLng = pt => {
            const rx = pt.x * lCos - pt.y * lSin;
            const ry = pt.x * lSin + pt.y * lCos;
            return [state.lat + ry / F_LAT, state.lng + rx / F_LNG];
        };

        const push = layer => { MapEngine.bldgDimLabels.push(layer); return layer; };
        const line = pts => push(L.polyline(pts.map(toLatLng), {
            color: '#1a202c', weight: 1.2, interactive: false, noClip: true
        }).addTo(MapEngine.map));
        // Normalize angle to [-90, 90) for upright label text
        const normAngle = (a) => { a = ((a % 180) + 180) % 180; return a >= 90 ? a - 180 : a; };
        const lbl = (pt, txt, rotDeg) => push(L.marker(toLatLng(pt), {
            icon: L.divIcon({
                className: '',
                html: '<div style="position:relative"><div class="arch-dim-label" style="font-size:' + bldgFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + normAngle(rotDeg - ConfigEngine.state.rotation) + 'deg)">' + txt + '</div></div>',
                iconSize: [0, 0], iconAnchor: [0, 0]
            }),
            interactive: false
        }).addTo(MapEngine.map));

        const EXT = 5;    // ft: dim line offset from building edge
        const EX2 = 2;    // ft: witness line overshoot beyond dim line
        const TK  = 1.2;  // ft: half-length of 45deg tick mark
        // Annotative text offset + zoom-scaled font
        const mapZoom  = MapEngine.map.getZoom();
        const bldgFontScale = Math.max(0.68, 0.34 + mapZoom * 0.024);
        const metersPerPx = 40075016.686 * Math.cos(ConfigEngine.state.lat * Math.PI / 180) / Math.pow(2, mapZoom + 8);
        const feetPerPx   = metersPerPx * 3.28084;
        const TO = 10 * feetPerPx;  // 10px gap, converted to feet at current zoom

        // Individual per-building dims replaced by chain dims below.

        // ── CHAIN DIMENSIONS ────────────────────────────────────────────────
        // Collects all boundary points along each axis, then draws one
        // continuous chain dim (shared witness lines at junctions).
        const { width: lotW, depth: lotD, parcelPolygon: chainPP } = ConfigEngine.data;
        var lotHD = lotD / 2, lotHW = lotW / 2;
        // For polygon sites, derive lot extents from actual polygon geometry.
        // MUST use state.lat/lng as origin (same as toLatLng) so polygon boundary
        // chain endpoints are in the same frame as building positions.
        var polyLocalVerts = null;
        if (chainPP && chainPP.length > 2) {
            var cpn = chainPP.length;
            if (chainPP[cpn-1][0]===chainPP[0][0] && chainPP[cpn-1][1]===chainPP[0][1]) cpn--;
            polyLocalVerts = [];
            var cMinX = Infinity, cMaxX = -Infinity, cMinY = Infinity, cMaxY = -Infinity;
            for (var ci = 0; ci < cpn; ci++) {
                var cry = (chainPP[ci][0] - state.lat) * F_LAT;
                var crx = (chainPP[ci][1] - state.lng) * F_LNG;
                var clx = crx * lCos + cry * lSin;
                var cly = cry * lCos - crx * lSin;
                polyLocalVerts.push({ x: clx, y: cly });
                if (clx < cMinX) cMinX = clx; if (clx > cMaxX) cMaxX = clx;
                if (cly < cMinY) cMinY = cly; if (cly > cMaxY) cMaxY = cly;
            }
            lotHD = (cMaxX - cMinX) / 2;
            lotHW = (cMaxY - cMinY) / 2;
        }
        // Lot extent bounds in lot-frame coordinates.
        // For polygon lots, cMin/cMax are relative to state.lat/lng (not centered at 0).
        // For rectangular lots, the pin IS the lot center so ±lotHD/lotHW are correct.
        var dMin = polyLocalVerts ? cMinX : -lotHD;  // depth axis min (chain X)
        var dMax = polyLocalVerts ? cMaxX :  lotHD;  // depth axis max (chain X)
        var wMin = polyLocalVerts ? cMinY : -lotHW;  // width axis min (chain Y)
        var wMax = polyLocalVerts ? cMaxY :  lotHW;  // width axis max (chain Y)
        var dCtr = (dMin + dMax) / 2;  // lot center X — used for perp direction
        var wCtr = (wMin + wMax) / 2;  // lot center Y — used for perp direction
        // Helper: find polygon extent along one axis at a given perpendicular position
        // isX=true → scan along Y at X=pos; isX=false → scan along X at Y=pos
        var polyExtentAt = function(pos, isX) {
            if (!polyLocalVerts) return null;
            var mn = Infinity, mx = -Infinity, n = polyLocalVerts.length;
            for (var i = 0; i < n; i++) {
                var a = polyLocalVerts[i], b = polyLocalVerts[(i+1)%n];
                var aP = isX ? a.x : a.y, bP = isX ? b.x : b.y;
                if ((aP - pos) * (bP - pos) > 0) continue; // both on same side
                if (Math.abs(bP - aP) < 0.001) continue;
                var t = (pos - aP) / (bP - aP);
                var cross = isX ? (a.y + t*(b.y - a.y)) : (a.x + t*(b.x - a.x));
                if (cross < mn) mn = cross;
                if (cross > mx) mx = cross;
            }
            return mn < Infinity ? { min: mn, max: mx } : null;
        };
        // Chain dim label rotation: lRad is from frontBearing, so chain bars are along
        // the lot's actual axes in geographic space. CSS normAngle(rotDeg - state.rotation)
        // gives the screen angle. The lotDeg-derived angles keep labels parallel to lot edges
        // and rotate correctly with setBearing at any slider position.
        const lotDeg = lRad * 180 / Math.PI;
        const clrDepthAngle = -lotDeg;
        const clrWidthAngle = -(90 + lotDeg);

        // ── Collect boundary points ────────────────────────────────────────
        // Use actual lot extents (accounts for chamfer + polygon geometry)
        const wPts = [{ v: wMin }, { v: wMax }];
        const dPts = [{ v: dMin }, { v: dMax }];
        let chainRefX = null;   // fixed x for the width chain (front edge)
        let chainRefY = null;   // fixed y for the depth chain (left edge)

        state.buildings.forEach((bldg, bIdx) => {
            const count  = bldg.count || 1;
            const ss     = bldg.stackSpacing || 0;
            const anchor = bldg.anchor || 'center';
            const { halfDepth, halfWidth } = this.buildingExtents(bldg);
            const step = halfDepth * 2 + ss;
            const aOff = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;
            // Geographic position first (same as drawBuilding), then rotate to lot frame.
            const _ox = bldg.offsetX || 0, _oy = bldg.offsetY || 0;
            const geoX = (front - rear) / 2 + _ox, geoY = (sideR - sideL) / 2 + _oy;
            const baseCx = geoX * lCos + geoY * lSin;
            const cy     = -geoX * lSin + geoY * lCos;
            const cxFirst = baseCx + (0 - aOff) * step;

            // Use first building's edges as the chain reference lines
            if (chainRefX === null) chainRefX = cxFirst - halfDepth;
            if (chainRefY === null) chainRefY = cy - halfWidth;

            // Width chain: witness lines at true perpendicular face (W/2), not bounding box projection
            const trueHW = bldg.W / 2;
            wPts.push({ v: cy - trueHW, pairId: `w${bIdx}`, trueLen: bldg.W });
            wPts.push({ v: cy + trueHW, pairId: `w${bIdx}`, trueLen: bldg.W });

            // Depth chain: witness lines at true perpendicular face (D/2), not bounding box projection
            const trueHD = bldg.D / 2;
            for (let j = 0; j < count; j++) {
                const cx = baseCx + (j - aOff) * step;
                dPts.push({ v: cx - trueHD, pairId: `d${bIdx}_${j}`, trueLen: bldg.D });
                dPts.push({ v: cx + trueHD, pairId: `d${bIdx}_${j}`, trueLen: bldg.D });
            }
        });

        // Deduplicate & sort
        const dedup = (arr) => {
            arr.sort((a, b) => a.v - b.v);
            const out = [arr[0]];
            for (let i = 1; i < arr.length; i++) {
                if (Math.abs(arr[i].v - out[out.length - 1].v) > 0.01) out.push(arr[i]);
            }
            return out;
        };
        const wChain = dedup(wPts);
        const dChain = dedup(dPts);

        // ── Draw chain helper ──────────────────────────────────────────────
        // Draws a full chain dim: shared witness lines + individual segments
        // Lines are draggable to reposition the chain perpendicular to its run.
        const drawChain = (chain, refCoord, isX, perpX, perpY, rotDeg, prefix) => {
            const chainLayers = [];
            const dimStyle = { color: '#1a202c', weight: 2, opacity: 1, interactive: true, noClip: true, className: 'chain-dim-line' };

            // Dim segments between adjacent boundaries — with merge support
            // Build merged runs: consecutive segments in mergedDimKeys are combined
            var segRuns = [];
            for (let i = 0; i < chain.length - 1; i++) {
                const dimKey = prefix + '_' + i;
                if (MapEngine.hiddenDimKeys.has(dimKey)) continue;
                if (MapEngine.mergedDimKeys.has(dimKey) && segRuns.length > 0) {
                    segRuns[segRuns.length - 1].endIdx = i + 1;
                    segRuns[segRuns.length - 1].keys.push(dimKey);
                } else {
                    segRuns.push({ startIdx: i, endIdx: i + 1, keys: [dimKey] });
                }
            }

            // Witness lines — only at run endpoints (start/end of each merged run), not internal merge points
            var witnessIndices = new Set();
            segRuns.forEach(run => { witnessIndices.add(run.startIdx); witnessIndices.add(run.endIdx); });
            witnessIndices.forEach(j => {
                if (j < 0 || j >= chain.length) return;
                const p = isX ? { x: chain[j].v, y: refCoord } : { x: refCoord, y: chain[j].v };
                const l = push(L.polyline([toLatLng(p), toLatLng({ x: p.x + (EXT+EX2)*perpX, y: p.y + (EXT+EX2)*perpY })], dimStyle).addTo(MapEngine.map));
                chainLayers.push(l);
            });

            for (let ri = 0; ri < segRuns.length; ri++) {
                const run = segRuns[ri];
                const v1 = chain[run.startIdx].v, v2 = chain[run.endIdx].v;
                const dist = Math.abs(v2 - v1);
                if (dist < 0.5) continue;

                const p1 = isX ? { x: v1, y: refCoord } : { x: refCoord, y: v1 };
                const p2 = isX ? { x: v2, y: refCoord } : { x: refCoord, y: v2 };
                const d1 = { x: p1.x + EXT*perpX, y: p1.y + EXT*perpY };
                const d2 = { x: p2.x + EXT*perpX, y: p2.y + EXT*perpY };
                const ux = (p2.x - p1.x) / dist, uy = (p2.y - p1.y) / dist;
                const mid = { x: (d1.x+d2.x)/2, y: (d1.y+d2.y)/2 };
                const tk45x = (ux + perpX) * 0.7071 * TK;
                const tk45y = (uy + perpY) * 0.7071 * TK;

                const layers = [];
                const pLine = pts => { const l = push(L.polyline(pts.map(toLatLng), dimStyle).addTo(MapEngine.map)); layers.push(l); chainLayers.push(l); };

                // Dim line split around label — clamp gap to 30% of segment so dims stay visible when zoomed out
                const segGap = Math.min(TO, dist * 0.3);
                pLine([d1, { x: mid.x - segGap*ux, y: mid.y - segGap*uy }]);
                pLine([{ x: mid.x + segGap*ux, y: mid.y + segGap*uy }, d2]);
                // Ticks
                pLine([{ x: d1.x - tk45x, y: d1.y - tk45y }, { x: d1.x + tk45x, y: d1.y + tk45y }]);
                pLine([{ x: d2.x - tk45x, y: d2.y - tk45y }, { x: d2.x + tk45x, y: d2.y + tk45y }]);
                // Label — use true perpendicular W/D when segment spans exactly one building face;
                // otherwise fall back to axis-aligned dist (setback gaps, lot edges)
                const isMerged = run.keys.length > 1;
                const startPt = chain[run.startIdx], endPt = chain[run.endIdx];
                const isBldgFace = !isMerged && startPt.pairId && endPt.pairId
                    && startPt.pairId === endPt.pairId;
                const labelDist = isBldgFace ? startPt.trueLen : dist;
                const labelText = labelDist.toFixed(1) + "'" + (isMerged ? ' \u2194' : '');
                const m = push(L.marker(toLatLng(mid), {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="position:relative"><div class="dim-label' + (isMerged ? ' dim-merged' : '') + '" style="font-size:' + bldgFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + normAngle(rotDeg - ConfigEngine.state.rotation) + 'deg)">' + labelText + '</div></div>',
                        iconSize: [0, 0], iconAnchor: [0, 0]
                    }),
                    interactive: true
                }).addTo(MapEngine.map));
                layers.push(m); chainLayers.push(m);
                m.on('click', () => {
                    if (MapEngine.dimMergeMode) {
                        // In merge mode: toggle merge on the first key of this run
                        const firstKey = run.keys[0];
                        if (run.keys.length > 1) {
                            // Already merged — unmerge all
                            run.keys.forEach(k => MapEngine.mergedDimKeys.delete(k));
                        } else {
                            // Merge this segment into previous (mark it as merged)
                            MapEngine.mergedDimKeys.add(firstKey);
                        }
                        ExportEngine.save();
                        SetbackEngine.updateBldgDimLabels();
                    } else {
                        // Normal mode: hide
                        run.keys.forEach(k => MapEngine.hiddenDimKeys.add(k));
                        ExportEngine.save();
                        SetbackEngine.updateBldgDimLabels();
                    }
                });
            }
            return chainLayers;
        };

        // ── For polygon sites, tighten boundary to actual polygon edge at chain position ──
        if (polyLocalVerts && chainRefX != null) {
            var wExt = polyExtentAt(chainRefX, true);  // Y extent at X=wRef
            if (wExt) {
                wChain[0].v = wExt.min;
                wChain[wChain.length - 1].v = wExt.max;
            }
        }
        if (polyLocalVerts && chainRefY != null) {
            var dExt = polyExtentAt(chainRefY, false);  // X extent at Y=dRef
            if (dExt) {
                dChain[0].v = dExt.min;
                dChain[dChain.length - 1].v = dExt.max;
            }
        }

        // ── Draw the two chain dims ──────────────────────────────────────
        // Perpendicular flips outward: if chain is on the rear/right half, push further out
        // Clamp chain dim reference lines to lot bounds + self-heal stale offsets
        const wRefRaw = chainRefX + MapEngine.chainWOffset;
        const dRefRaw = chainRefY + MapEngine.chainDOffset;
        const wRef = Math.max(dMin, Math.min(dMax, wRefRaw));
        const dRef = Math.max(wMin, Math.min(wMax, dRefRaw));
        if (wRef !== wRefRaw) MapEngine.chainWOffset = wRef - chainRefX;
        if (dRef !== dRefRaw) MapEngine.chainDOffset = dRef - chainRefY;
        const wPerpX = wRef >= dCtr ? 1 : -1;
        const dPerpY = dRef >= wCtr ? 1 : -1;
        let wLayers = drawChain(wChain, wRef, false, wPerpX, 0, clrWidthAngle, 'chain_w');
        let dLayers = drawChain(dChain, dRef, true, 0, dPerpY, clrDepthAngle, 'chain_d');

        // ── Drag-to-reposition via chain lines ──────────────────────────
        // toLocal uses the same rotation as toLatLng so drag stays in Frame B.
        const toLocal = (ll) => {
            const ry = (ll.lat - state.lat) * F_LAT;
            const rx = (ll.lng - state.lng) * F_LNG;
            return { x: rx * lCos + ry * lSin, y: -rx * lSin + ry * lCos };
        };

        // Snap anchors: lot edges + all building boundaries
        const wAnchors = [dMin, dMax];   // width chain repositioned along depth axis (X)
        const dAnchors = [wMin, wMax];   // depth chain repositioned along width axis (Y)
        state.buildings.forEach((bldg) => {
            const { halfDepth, halfWidth } = this.buildingExtents(bldg);
            const count  = bldg.count || 1;
            const ss     = bldg.stackSpacing || 0;
            const anchor = bldg.anchor || 'center';
            const step   = halfDepth * 2 + ss;
            const aOff   = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;
            const _ox2 = bldg.offsetX || 0, _oy2 = bldg.offsetY || 0;
            const geoX2 = (front - rear) / 2 + _ox2, geoY2 = (sideR - sideL) / 2 + _oy2;
            const baseCx = geoX2 * lCos + geoY2 * lSin;
            const cy     = -geoX2 * lSin + geoY2 * lCos;
            for (let j = 0; j < count; j++) {
                const cx = baseCx + (j - aOff) * step;
                wAnchors.push(cx - halfDepth, cx + halfDepth);
            }
            dAnchors.push(cy - halfWidth, cy + halfWidth);
        });

        // Threshold snap: only snap when within CHAIN_SNAP_THRESH ft of an anchor.
        // Always hard-clamps to [minBound, maxBound] so chain stays inside lot.
        const CHAIN_SNAP_THRESH = 4;
        const snapTo = (val, anchors, minBound, maxBound) => {
            const bounded = Math.max(minBound, Math.min(maxBound, val));
            let best = null, bestD = CHAIN_SNAP_THRESH;
            for (let i = 0; i < anchors.length; i++) {
                const d = Math.abs(bounded - anchors[i]);
                if (d < bestD) { best = anchors[i]; bestD = d; }
            }
            return best !== null ? best : bounded;
        };

        // Attach drag behavior to all polylines in a chain
        const self = this;
        // Click dim line → visible drag handle appears offset from line.
        // Drag the handle to reposition. Click handle (or line again) to dismiss.
        let activeHandle  = null;   // the L.marker handle currently showing
        let activeDragOff = null;   // cleanup fn; null = no chain active

        const deactivateChain = () => {
            if (!activeDragOff) return;
            activeDragOff();
        };

        const attachChainDrag = (layers, chain, isX, perpX, perpY, offsetProp, baseRef, anchors, rotDeg, prefix, getLayers, setLayers) => {

            // Returns local coords for the handle — midpoint of chain, offset outward 7 ft past dim line
            const getHandlePt = () => {
                const curRef = baseRef + MapEngine[offsetProp];
                const midV   = (chain[0].v + chain[chain.length - 1].v) / 2;
                const sign   = curRef >= (isX ? wCtr : dCtr) ? 1 : -1;
                return isX
                    ? { x: midV, y: curRef + (EXT + 7) * sign }
                    : { x: curRef + (EXT + 7) * sign, y: midV };
            };

            layers.forEach(l => {
                if (!l.on || !(l instanceof L.Polyline)) return;
                l.on('click', (e) => {
                    L.DomEvent.stop(e.originalEvent);
                    if (MapEngine.dimDragMode) return;  // handles already shown by toggle
                    // If any chain active — deactivate it (including this one)
                    if (activeDragOff) { deactivateChain(); return; }

                    // Highlight chain lines
                    getLayers().forEach(ll => { if (ll._path) ll._path.classList.add('chain-dim-active'); });
                    MapEngine.map.dragging.disable();

                    // Create the drag handle marker
                    activeHandle = L.marker(toLatLng(getHandlePt()), {
                        draggable: true,
                        icon: L.divIcon({
                            className: '',
                            html: '<div class="chain-drag-handle"></div>',
                            iconSize:   [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(MapEngine.map);

                    activeHandle.on('drag', () => {
                        const loc    = toLocal(activeHandle.getLatLng());
                        const rawVal = isX ? loc.y : loc.x;
                        const snapped = snapTo(rawVal, anchors, isX ? wMin : dMin, isX ? wMax : dMax);
                        if (MapEngine[offsetProp] === snapped - baseRef) return;
                        MapEngine[offsetProp] = snapped - baseRef;
                        const newRef = baseRef + MapEngine[offsetProp];
                        const pX = isX ? perpX : (newRef >= dCtr ? 1 : -1);
                        const pY = isX ? (newRef >= wCtr ? 1 : -1) : perpY;
                        getLayers().forEach(ll => MapEngine.map.removeLayer(ll));
                        const newLayers = drawChain(chain, newRef, isX, pX, pY, rotDeg, prefix);
                        setLayers(newLayers);
                        // Re-highlight new layers and reposition handle
                        getLayers().forEach(ll => { if (ll._path) ll._path.classList.add('chain-dim-active'); });
                        activeHandle.setLatLng(toLatLng(getHandlePt()));
                    });

                    // Click handle to dismiss
                    activeHandle.on('click', (e2) => {
                        L.DomEvent.stop(e2.originalEvent);
                        deactivateChain();
                    });

                    activeDragOff = () => {
                        activeDragOff = null;
                        if (activeHandle) { MapEngine.map.removeLayer(activeHandle); activeHandle = null; }
                        if (MapEngine._panEnabled) MapEngine.map.dragging.enable();
                        getLayers().forEach(ll => { if (ll._path) ll._path.classList.remove('chain-dim-active'); });
                        ExportEngine.save();
                        self.updateBldgDimLabels();
                    };
                });
            });
        };

        attachChainDrag(wLayers, wChain, false, wPerpX, 0, 'chainWOffset', chainRefX, wAnchors, clrWidthAngle, 'chain_w',
            () => wLayers, (l) => { wLayers = l; });
        attachChainDrag(dLayers, dChain, true, 0, dPerpY, 'chainDOffset', chainRefY, dAnchors, clrDepthAngle, 'chain_d',
            () => dLayers, (l) => { dLayers = l; });

        // ── Existing building clearance dims (blue) ──────────────────────────
        if (MapEngine.showBldgDims) (state.existingBuildings || []).forEach(function(exb) {
        if (!exb || !exb.polygon || exb.polygon.length < 3) return;
        {
            var exVerts = exb.polygon.map(function(pt) {
                var ery = (pt[0] - state.lat) * F_LAT;
                var erx = (pt[1] - state.lng) * F_LNG;
                return { x: erx * lCos + ery * lSin, y: ery * lCos - erx * lSin };
            });
            var exMinX = Infinity, exMaxX = -Infinity, exMinY = Infinity, exMaxY = -Infinity;
            exVerts.forEach(function(v) {
                if (v.x < exMinX) exMinX = v.x; if (v.x > exMaxX) exMaxX = v.x;
                if (v.y < exMinY) exMinY = v.y; if (v.y > exMaxY) exMaxY = v.y;
            });
            const EX_CLR = '#2563eb';
            const exLine = (pts) => push(L.polyline(pts.map(toLatLng), {
                color: EX_CLR, weight: 1.5, interactive: false, noClip: true, dashArray: '4 3'
            }).addTo(MapEngine.map));
            const exLbl = (pt, txt, rotDeg) => push(L.marker(toLatLng(pt), {
                icon: L.divIcon({
                    className: '',
                    html: '<div style="position:relative"><div class="arch-dim-label" style="color:' + EX_CLR + ';font-size:' + bldgFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + normAngle(rotDeg - ConfigEngine.state.rotation) + 'deg)">' + txt + '</div></div>',
                    iconSize: [0, 0], iconAnchor: [0, 0]
                }), interactive: false
            }).addTo(MapEngine.map));

            state.buildings.forEach((bldg) => {
                const { halfDepth, halfWidth } = this.buildingExtents(bldg);
                const { front: fr, rear: re, sideL: sl, sideR: sr } = state.setbacks;
                const count  = bldg.count  || 1;
                const ss     = bldg.stackSpacing || 0;
                const anchor = bldg.anchor || 'center';
                const aOff   = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;
                const _ox3 = bldg.offsetX || 0, _oy3 = bldg.offsetY || 0;
                const geoX3 = (fr - re) / 2 + _ox3, geoY3 = (sr - sl) / 2 + _oy3;
                const baseCx = geoX3 * lCos + geoY3 * lSin;
                const cy     = -geoX3 * lSin + geoY3 * lCos;
                // Use first and last stack copy extents
                const step = halfDepth * 2 + ss;
                const cxFirst = baseCx + (0 - aOff) * step;
                const cxLast  = baseCx + (count - 1 - aOff) * step;
                const dMinX = Math.min(cxFirst, cxLast) - halfDepth;
                const dMaxX = Math.max(cxFirst, cxLast) + halfDepth;
                const dMinY = cy - halfWidth, dMaxY = cy + halfWidth;

                const xGapRight = exMinX - dMaxX;
                const xGapLeft  = dMinX  - exMaxX;
                const yGapTop   = exMinY - dMaxY;
                const yGapBot   = dMinY  - exMaxY;

                // X-axis clearance
                if (xGapRight > 0.5 || xGapLeft > 0.5) {
                    const gap = xGapRight > 0.5 ? xGapRight : xGapLeft;
                    const x1  = xGapRight > 0.5 ? dMaxX : exMaxX;
                    const x2  = xGapRight > 0.5 ? exMinX : dMinX;
                    const cyMid = (Math.max(dMinY, exMinY) + Math.min(dMaxY, exMaxY)) / 2 || cy;
                    exLine([{x: x1, y: cyMid}, {x: x2, y: cyMid}]);
                    exLine([{x: x1, y: cyMid - EXT}, {x: x1, y: cyMid + EXT}]);
                    exLine([{x: x2, y: cyMid - EXT}, {x: x2, y: cyMid + EXT}]);
                    exLine([{x: x1 + TK, y: cyMid + TK}, {x: x1 - TK, y: cyMid - TK}]);
                    exLine([{x: x2 + TK, y: cyMid + TK}, {x: x2 - TK, y: cyMid - TK}]);
                    exLbl({x: (x1 + x2) / 2, y: cyMid + EXT + TO}, gap.toFixed(1) + "'", clrDepthAngle);
                }

                // Y-axis clearance
                if (yGapTop > 0.5 || yGapBot > 0.5) {
                    const gap = yGapTop > 0.5 ? yGapTop : yGapBot;
                    const y1  = yGapTop > 0.5 ? dMaxY : exMaxY;
                    const y2  = yGapTop > 0.5 ? exMinY : dMinY;
                    const cxMid = (Math.max(dMinX, exMinX) + Math.min(dMaxX, exMaxX)) / 2 || baseCx;
                    exLine([{x: cxMid, y: y1}, {x: cxMid, y: y2}]);
                    exLine([{x: cxMid - EXT, y: y1}, {x: cxMid + EXT, y: y1}]);
                    exLine([{x: cxMid - EXT, y: y2}, {x: cxMid + EXT, y: y2}]);
                    exLine([{x: cxMid + TK, y: y1 + TK}, {x: cxMid - TK, y: y1 - TK}]);
                    exLine([{x: cxMid + TK, y: y2 + TK}, {x: cxMid - TK, y: y2 - TK}]);
                    exLbl({x: cxMid + EXT + TO, y: (y1 + y2) / 2}, gap.toFixed(1) + "'", clrWidthAngle);
                }
            });
        }
        }); // end existingBuildings.forEach

        // When drag mode is on, show handles immediately (no click needed)
        if (MapEngine.dimDragMode) {
            const autoHandle = (chain, isX, perpX, perpY, offsetProp, baseRef, anchors, rotDeg, prefix, getLayers, setLayers) => {
                const getHPt = () => {
                    const curRef = baseRef + MapEngine[offsetProp];
                    const midV   = (chain[0].v + chain[chain.length - 1].v) / 2;
                    const sign   = curRef >= (isX ? wCtr : dCtr) ? 1 : -1;
                    return isX ? { x: midV, y: curRef + (EXT + 7) * sign }
                               : { x: curRef + (EXT + 7) * sign, y: midV };
                };
                const handle = push(L.marker(toLatLng(getHPt()), {
                    draggable: true,
                    icon: L.divIcon({ className: '', html: '<div class="chain-drag-handle"></div>', iconSize: [20, 20], iconAnchor: [10, 10] })
                }).addTo(MapEngine.map));
                handle.on('drag', () => {
                    const loc     = toLocal(handle.getLatLng());
                    const rawVal  = isX ? loc.y : loc.x;
                    const snapped = snapTo(rawVal, anchors, isX ? wMin : dMin, isX ? wMax : dMax);
                    if (MapEngine[offsetProp] === snapped - baseRef) return;
                    MapEngine[offsetProp] = snapped - baseRef;
                    const newRef = baseRef + MapEngine[offsetProp];
                    getLayers().forEach(ll => MapEngine.map.removeLayer(ll));
                    setLayers(drawChain(chain, newRef, isX, isX ? perpX : (newRef >= dCtr ? 1 : -1), isX ? (newRef >= wCtr ? 1 : -1) : perpY, rotDeg, prefix));
                    handle.setLatLng(toLatLng(getHPt()));
                });
                handle.on('dragend', () => { ExportEngine.save(); });
            };
            autoHandle(wChain, false, wPerpX, 0, 'chainWOffset', chainRefX, wAnchors, clrWidthAngle, 'chain_w', () => wLayers, (l) => { wLayers = l; });
            autoHandle(dChain, true,  0, dPerpY, 'chainDOffset', chainRefY, dAnchors, clrDepthAngle, 'chain_d', () => dLayers, (l) => { dLayers = l; });
        }
    },

    updateFAR: function() {
        const state   = ConfigEngine.state;
        const { width: lotW, depth: lotD, lotSF } = ConfigEngine.data;
        const lotArea = (lotSF && lotSF > 0) ? lotSF : (lotW * lotD);
        if (!lotArea) return;

        const sd        = window.__SITE_DEFAULTS__ || {};
        const commFront = state.commFront || false;
        const maxFAR    = commFront ? (sd.commFAR ?? 6.5) : (sd.baseFAR ?? 2.0);
        const buildable = Math.round(lotArea * maxFAR);

        const active      = state.buildings[state.activeBuilding] || state.buildings[0];
        // Use polygon area if custom shape is set, else W×D
        const footprintSF = (active.polygon && active.polygon.length >= 3 && typeof VertexEngine !== 'undefined')
            ? VertexEngine.polygonArea(active.polygon)
            : (active.W || 0) * (active.D || 0);

        // Total: sum per-building (footprint × count × stories); use polygon area if custom shape
        const totalArea = state.buildings.reduce((s, b) => {
            const bFP = (b.polygon && b.polygon.length >= 3 && typeof VertexEngine !== 'undefined')
                ? VertexEngine.polygonArea(b.polygon)
                : (b.W||0) * (b.D||0);
            return s + bFP * (b.count||1) * (b.stories||1);
        }, 0);
        const actualFAR = totalArea / lotArea;

        const set = (id, txt) => { const el = document.getElementById(id); if (!el) return; if (el.tagName === 'INPUT') el.value = txt; else el.textContent = txt; };

        set('bldgFootprintArea', Math.round(footprintSF).toLocaleString());
        set('bldgTotalArea',     Math.round(totalArea).toLocaleString()   + ' sf');

        const chkEl = document.getElementById('bldgFARCheck');
        if (maxFAR > 0) {
            set('bldgFAR',       actualFAR.toFixed(2));
            set('bldgBuildable', 'MAX ' + buildable.toLocaleString() + ' sf');
            set('maxFARLabel',   commFront ? 'Comm. Front: ' + maxFAR + ' FAR' : 'Base: ' + maxFAR + ' FAR');
            if (chkEl) {
                const ok = actualFAR <= maxFAR + 0.005;
                chkEl.textContent = ok
                    ? '\u2713 Within limit (' + actualFAR.toFixed(2) + ' \u2264 ' + maxFAR + ')'
                    : '\u2717 Exceeds limit (' + actualFAR.toFixed(2) + ' > ' + maxFAR + ')';
                chkEl.style.color = ok ? '#2f855a' : '#c53030';
            }
        } else {
            // FAR not applicable for this zone (baseFAR=0) — show actual but no limit
            set('bldgFAR',       actualFAR.toFixed(2));
            set('bldgBuildable', 'No FAR limit');
            set('maxFARLabel',   'FAR: No limit');
            if (chkEl) { chkEl.textContent = '\u2713 No FAR limit for this zone'; chkEl.style.color = '#2f855a'; }
        }

        const floorH      = active.floorHeight || 9;
        const activeStories = active.stories || 1;
        const totalHeight = activeStories * floorH + Math.max(0, activeStories - 1) * 1;
        set('bldgTotalHeight', totalHeight.toFixed(0));

        // Density check: total residential units vs base zone max
        const densPerSF = sd.densityPerSF ?? 600;
        const resiU     = state.buildings.reduce((s, b) => s + (b.stories || 1) * (b.count || 1), 0);
        const densEl    = document.getElementById('bldgDensity');
        const densChk   = document.getElementById('bldgDensityCheck');
        if (densPerSF > 0) {
            const baseDMax  = Math.floor(lotArea / densPerSF);
            const sdbMin    = baseDMax + Math.ceil(baseDMax * 0.225); // 5% LI -> 22.5% bonus
            if (densEl)  densEl.textContent  = resiU + ' DU / ' + (commFront ? 'unlimited' : baseDMax + ' max');
            if (densChk) {
                if (commFront)             { densChk.textContent = '\u2713 CCHS: no limit'; densChk.style.color = '#2f855a'; }
                else if (resiU <= baseDMax) { densChk.textContent = '\u2713 Within base zone'; densChk.style.color = '#2f855a'; }
                else if (resiU <= sdbMin)   { densChk.textContent = '\u26a0 Needs SDB (min 5% aff)'; densChk.style.color = '#d97706'; }
                else                        { densChk.textContent = '\u2717 Exceeds base -- use CCHS or SDB'; densChk.style.color = '#c53030'; }
            }
        } else {
            // densityPerSF=0 means density not governed by lot-area formula (e.g. R-3 MDR)
            if (densEl)  densEl.textContent  = resiU + ' DU / per zoning';
            if (densChk) { densChk.textContent = '\u2713 Density per zoning overlay'; densChk.style.color = '#2f855a'; }
        }
    },

    // ── Init wiring ───────────────────────────────────────────────────────────

    initBuildingConfig: function() {
        const state = ConfigEngine.state;
        const sb    = state.setbacks;

        document.getElementById('sb-front').value   = sb.front;
        document.getElementById('sb-rear').value    = sb.rear;
        document.getElementById('sb-side-l').value  = sb.sideL;
        document.getElementById('sb-side-r').value  = sb.sideR;

        // Front bearing — update cardinal display from saved state
        SetbackEngine._updateFrontBearingDisplay(state.frontBearing ?? 270);
        const setFrontBtn = document.getElementById('setFrontEdgeBtn');
        if (setFrontBtn) {
            setFrontBtn.addEventListener('click', function() {
                const active = setFrontBtn.classList.toggle('active');
                if (active) SetbackEngine._activateFrontEdgePick();
                else MapEngine._clearFrontPick();
            });
        }

        this._seedInputsFromBuilding(state.activeBuilding);

        const chk = document.getElementById('commFrontCheck');
        if (chk) chk.checked = state.commFront || false;

        // Auto-draw setbacks if they were explicitly applied in a prior session
        // Guard: skip on skeleton sites where lot dimensions are 0×0 (no polygon, no rect)
        const _pp = ConfigEngine.data.parcelPolygon;
        const _hasLot = (_pp && _pp.length > 2) || (ConfigEngine.data.width > 0 && ConfigEngine.data.depth > 0);
        if (ConfigEngine.state.setbacksApplied && _hasLot) {
            this.drawSetbacks();
        }

        this.rebuildSelector();

        document.getElementById('saveSetbackBtn').addEventListener('click', () => this.saveSetbacks());

        // Orientation
        const sldr = document.getElementById('bldgOrientSlider');
        const inp  = document.getElementById('bldgOrientInput');
        sldr.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            inp.value = v.toFixed(1);
            const bldg = state.buildings[state.activeBuilding];
            if (bldg) { bldg.orientation = v; this.drawBuilding(); }
        });
        inp.addEventListener('change', (e) => {
            let v = parseFloat(e.target.value);
            if (isNaN(v)) v = 0;
            v = ((v % 360) + 360) % 360;
            inp.value = v.toFixed(1); sldr.value = v;
            const bldg = state.buildings[state.activeBuilding];
            if (bldg) { bldg.orientation = v; this.drawBuilding(); }
        });

        // Footprint
        ['bldgW', 'bldgD'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                const bldg = state.buildings[state.activeBuilding];
                if (!bldg) return;
                bldg.W = parseFloat(document.getElementById('bldgW').value) || 30;
                bldg.D = parseFloat(document.getElementById('bldgD').value) || 60;
                this.drawBuilding();
            });
        });

        // Footprint sliders (W/D)
        ['bldgWSlider', 'bldgDSlider'].forEach((sliderId, i) => {
            const inputId = i === 0 ? 'bldgW' : 'bldgD';
            const prop = i === 0 ? 'W' : 'D';
            const slEl = document.getElementById(sliderId);
            if (!slEl) return;
            slEl.addEventListener('input', () => {
                const bldg = state.buildings[state.activeBuilding];
                if (!bldg) return;
                const v = parseFloat(slEl.value);
                document.getElementById(inputId).value = v.toFixed(1);
                bldg[prop] = v;
                this.drawBuilding();
            });
            slEl.addEventListener('change', () => { ExportEngine.save(); });
        });

        // Offset sliders (X/Y)
        ['bldgOffsetXSlider', 'bldgOffsetYSlider'].forEach((sliderId, i) => {
            const inputId = i === 0 ? 'bldgOffsetX' : 'bldgOffsetY';
            const prop = i === 0 ? 'offsetX' : 'offsetY';
            const slEl = document.getElementById(sliderId);
            if (!slEl) return;
            slEl.addEventListener('input', () => {
                const bldg = state.buildings[state.activeBuilding];
                if (!bldg) return;
                bldg[prop] = parseFloat(slEl.value);
                document.getElementById(inputId).value = bldg[prop].toFixed(1);
                this.drawBuilding();
            });
            slEl.addEventListener('change', () => { ExportEngine.save(); });
        });

        // Offset — back-compute inter-building gap when X changes
        ['bldgOffsetX', 'bldgOffsetY'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                const idx  = state.activeBuilding;
                const bldg = state.buildings[idx];
                if (!bldg) return;
                bldg.offsetX = parseFloat(document.getElementById('bldgOffsetX').value) || 0;
                bldg.offsetY = parseFloat(document.getElementById('bldgOffsetY').value) || 0;
                // Clamp typed values to lot boundary
                const { front: _f, rear: _r, sideL: _sl, sideR: _sr } = state.setbacks;
                const _cl = this.clampToLot(bldg.offsetX + (_f-_r)/2, bldg.offsetY + (_sr-_sl)/2, bldg);
                bldg.offsetX = _cl.cx - (_f-_r)/2;
                bldg.offsetY = _cl.cy - (_sr-_sl)/2;
                document.getElementById('bldgOffsetX').value = bldg.offsetX.toFixed(1);
                document.getElementById('bldgOffsetY').value = bldg.offsetY.toFixed(1);
                if (idx > 0) {
                    const gap = this._computeGap(idx);
                    bldg.spacing = gap !== null ? gap : 0;
                    const spEl = document.getElementById('bldgSpacing');
                    if (spEl) spEl.value = bldg.spacing.toFixed(1);
                }
                this.drawBuilding();
                ExportEngine.save();
            });
        });

        // Inter-building spacing (S field)
        const spInp = document.getElementById('bldgSpacing');
        if (spInp) {
            spInp.addEventListener('change', () => {
                const idx = state.activeBuilding;
                if (idx <= 0) return;
                let gap = parseFloat(spInp.value);
                if (isNaN(gap)) return;
                gap = Math.max(0, gap);
                const maxGap = this._maxGap(idx);
                if (maxGap !== null) gap = Math.min(gap, maxGap);
                spInp.value = gap.toFixed(1);
                this._applyGap(idx, gap);
                this.drawBuilding();
            });
        }

        // Count (per-building stack copies) — capped so stack fits in lot
        document.getElementById('bldgCount').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            const { depth: lotD } = ConfigEngine.data;
            const ext  = this.buildingExtents(bldg);
            const sS   = bldg.stackSpacing || 0;
            const step = ext.halfDepth * 2 + sS;
            const maxN = Math.max(1, Math.floor((lotD + sS) / step));
            let n = Math.max(1, Math.min(parseInt(document.getElementById('bldgCount').value) || 1, maxN));
            document.getElementById('bldgCount').value = n;
            bldg.count = n;
            this.drawBuilding();
        });

        // Stack spacing — capped so full stack stays within lot; re-caps count if needed
        document.getElementById('bldgStackSpacing').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            const { depth: lotD } = ConfigEngine.data;
            const ext   = this.buildingExtents(bldg);
            const count = bldg.count || 1;
            let g = Math.max(0, parseFloat(document.getElementById('bldgStackSpacing').value) || 0);
            if (count > 1) {
                const maxG = Math.max(0, parseFloat(((lotD - 2 * ext.halfDepth * count) / (count - 1)).toFixed(1)));
                g = Math.min(g, maxG);
                document.getElementById('bldgStackSpacing').value = g.toFixed(1);
            }
            bldg.stackSpacing = g;
            // Re-cap count in case new spacing reduces how many fit
            const newStep = ext.halfDepth * 2 + g;
            const newMaxN = Math.max(1, Math.floor((lotD + g) / newStep));
            if (count > newMaxN) {
                bldg.count = newMaxN;
                document.getElementById('bldgCount').value = newMaxN;
            }
            this.drawBuilding();
        });

        // Stack angle input
        document.getElementById('bldgStackAngle').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            let a = parseFloat(document.getElementById('bldgStackAngle').value) || 0;
            a = ((a % 360) + 360) % 360;
            document.getElementById('bldgStackAngle').value = a;
            const sliderEl = document.getElementById('bldgStackAngleSlider');
            if (sliderEl) sliderEl.value = a;
            bldg.stackAngle = a;
            const dirBtn = document.getElementById('bldgStackDirBtn');
            if (dirBtn) dirBtn.textContent = a + '\u00B0';
            this.drawBuilding();
            ExportEngine.save();
        });

        // Stack direction toggle: cycles 0° → 90° → 180° → 270°
        document.getElementById('bldgStackDirBtn').addEventListener('click', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            const steps = [0, 90, 180, 270];
            const cur   = bldg.stackAngle || 0;
            const idx   = steps.findIndex(s => Math.abs(cur - s) < 1);
            const next  = steps[(idx < 0 ? 0 : idx + 1) % 4];
            bldg.stackAngle = next;
            const angEl = document.getElementById('bldgStackAngle');
            if (angEl) angEl.value = next;
            const sliderEl = document.getElementById('bldgStackAngleSlider');
            if (sliderEl) sliderEl.value = next;
            document.getElementById('bldgStackDirBtn').textContent = next + '\u00B0';
            this.drawBuilding();
            ExportEngine.save();
        });

        // Stack angle slider
        const stackAngleSlider = document.getElementById('bldgStackAngleSlider');
        if (stackAngleSlider) {
            stackAngleSlider.addEventListener('input', () => {
                const bldg = state.buildings[state.activeBuilding];
                if (!bldg) return;
                const a = parseInt(stackAngleSlider.value, 10);
                bldg.stackAngle = a;
                const angEl = document.getElementById('bldgStackAngle');
                if (angEl) angEl.value = a;
                const dirBtn = document.getElementById('bldgStackDirBtn');
                if (dirBtn) dirBtn.textContent = a + '\u00B0';
                this.drawBuilding();
            });
            stackAngleSlider.addEventListener('change', () => { ExportEngine.save(); });
        }

        // Anchor buttons (per-building)
        const anchors   = ['anchorFront', 'anchorCenter', 'anchorRear'];
        const anchorMap = { anchorFront: 'front', anchorCenter: 'center', anchorRear: 'rear' };
        const setAnchor = (id) => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            anchors.forEach(a => document.getElementById(a).classList.toggle('active', a === id));
            bldg.anchor = anchorMap[id];
            this.drawBuilding();
        };
        anchors.forEach(id => document.getElementById(id).addEventListener('click', () => setAnchor(id)));

        // Stories (per-building)
        document.getElementById('bldgStories').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            bldg.stories = parseInt(document.getElementById('bldgStories').value) || 1;
            this.updateFAR();
        });

        // Floor height (per-building)
        document.getElementById('bldgFloorHeight').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            bldg.floorHeight = parseFloat(document.getElementById('bldgFloorHeight').value) || 9;
            this.updateFAR();
        });

        // Comm. Front (global)
        if (chk) chk.addEventListener('change', () => {
            state.commFront = chk.checked;
            this.updateFAR();
            MapEngine.render();
            ExportEngine.save();
        });

        document.getElementById('bldgAddBtn').addEventListener('click', () => this.addBuilding());
        document.getElementById('bldgDelBtn').addEventListener('click', () => this.removeLastBuilding());
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());

        document.getElementById('bldgDimBtn').addEventListener('click', () => {
            const on = !MapEngine.showBldgDims;
            MapEngine.showBldgDims = on;
            MapEngine.showDims     = on;
            // Reset hidden + merged dims when toggling — fresh slate each toggle cycle
            MapEngine.hiddenDimKeys.clear();
            MapEngine.mergedDimKeys.clear();
            const btn = document.getElementById('bldgDimBtn');
            btn.classList.toggle('active', on);
            btn.textContent = on ? 'Hide Dims' : 'Show Dims';
            this.updateBldgDimLabels();
            MapEngine.updateDimLabels();
        });

        // Restore dim toggle + hidden keys from saved config
        // Lot boundary dims (red) always show; building chain dims follow saved toggle
        const dimsOn = state.showBldgDims || false;
        MapEngine.showBldgDims = dimsOn;
        MapEngine.showDims     = true;
        if (state.hiddenDimKeys) state.hiddenDimKeys.forEach(k => MapEngine.hiddenDimKeys.add(k));
        if (state.mergedDimKeys) state.mergedDimKeys.forEach(k => MapEngine.mergedDimKeys.add(k));
        if (state.chainWOffset != null) MapEngine.chainWOffset = state.chainWOffset;
        if (state.chainDOffset != null) MapEngine.chainDOffset = state.chainDOffset;
        if (state.propDimOffsets) MapEngine._propDimOffsets = state.propDimOffsets;
        const dimBtn = document.getElementById('bldgDimBtn');
        dimBtn.classList.toggle('active', dimsOn);
        if (dimsOn) dimBtn.textContent = 'Hide Dims';

        if (state.buildings.length > 0) this.drawBuilding();
    },

    saveConfig: function() {
        ExportEngine.save();
        this.updateFAR();
        const btn = document.getElementById('saveConfigBtn');
        btn.textContent = 'Saved!'; btn.style.background = '#2f855a';
        setTimeout(() => { btn.textContent = 'Save Config'; btn.style.background = ''; }, 1800);
    },

    drawSetbacks: function() {
        const { front, rear, sideL, sideR } = ConfigEngine.state.setbacks;
        const { width: w, depth: h, parcelPolygon: pp } = ConfigEngine.data;

        const rad   = MapEngine.effectiveRotation() * Math.PI / 180;
        const cos   = Math.cos(rad), sin = Math.sin(rad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);

        const transform = (pt) => {
            let rx = pt.x * cos - pt.y * sin;
            let ry = pt.x * sin + pt.y * cos;
            return [ConfigEngine.state.lat + ry / F_LAT, ConfigEngine.state.lng + rx / F_LNG];
        };

        var setbackPts;

        if (pp && pp.length > 2) {
            // Polygon mode: inset each edge by its setback based on orientation
            var n = pp.length;
            if (pp[n-1][0]===pp[0][0] && pp[n-1][1]===pp[0][1]) n--;
            // MUST use state.lat/lng as origin so setback zone is in the same Frame B
            // as buildings and chain dims. Centroid origin caused misaligned setback polygon.
            var cLat = ConfigEngine.state.lat, cLng = ConfigEngine.state.lng;
            // Convert to local coords
            var lv = [];
            for (var i = 0; i < n; i++) {
                var ry = (pp[i][0] - cLat) * F_LAT;
                var rx = (pp[i][1] - cLng) * F_LNG;
                lv.push({ x: rx * cos + ry * sin, y: ry * cos - rx * sin });
            }
            // Signed area for winding
            var sa = 0;
            for (var i = 0; i < n; i++) { var j=(i+1)%n; sa += lv[i].x*lv[j].y - lv[j].x*lv[i].y; }
            var ws = sa > 0 ? 1 : -1;
            // Compute bounding box extents to find front/rear/side edges
            var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (var i = 0; i < n; i++) {
                if (lv[i].x < minX) minX = lv[i].x;
                if (lv[i].x > maxX) maxX = lv[i].x;
                if (lv[i].y < minY) minY = lv[i].y;
                if (lv[i].y > maxY) maxY = lv[i].y;
            }
            // Front-bearing-aware setback assignment
            // frontBearing: 0=N, 90=E, 180=S, 270=W (default W = negative-X side)
            var fBr = ((ConfigEngine.state.frontBearing ?? 270) * Math.PI / 180);
            var fDirX = Math.sin(fBr), fDirY = Math.cos(fBr);
            var _sbForNormal = function(nx_, ny_) {
                var dot = nx_ * fDirX + ny_ * fDirY;
                if (dot > 0.5) return front;
                if (dot < -0.5) return rear;
                var cross = nx_ * fDirY - ny_ * fDirX;
                return cross > 0 ? sideR : sideL;
            };

            // ── Arc-aware edge reduction ──────────────────────────────────────────
            // GIS arcs are approximated by many tiny polygon segments. Computing an
            // offset edge per tiny segment produces near-parallel lines whose
            // intersections shoot far outside the lot. Collapse arc runs into one
            // chord edge so each physical arc gets a single clean offset edge.
            var _ARC_DEGEN    = 0.1;
            var _ARC_MAX      = 6;    // ft
            var _ARC_MIN_RUN  = 4;
            var _ARC_LEN_RATIO = 2.0;

            // Build raw edge list from local vertices
            var _rawE = [];
            for (var i = 0; i < n; i++) {
                var j = (i+1) % n;
                var dx = lv[j].x - lv[i].x, dy = lv[j].y - lv[i].y;
                var len = Math.sqrt(dx*dx + dy*dy);
                _rawE.push({ p1: lv[i], p2: lv[j], dx: dx, dy: dy, len: len });
            }

            // Group into straight and arc runs (same algorithm as updateDimLabels)
            var _sbEdges = [];
            var _si = 0;
            while (_si < _rawE.length) {
                var _e = _rawE[_si];
                if (_e.len < _ARC_DEGEN) { _si++; continue; }
                if (_e.len < _ARC_MAX) {
                    var _run = [_e], _sj = _si + 1;
                    while (_sj < _rawE.length && _rawE[_sj].len >= _ARC_DEGEN && _rawE[_sj].len < _ARC_MAX) {
                        var _ratio = _rawE[_sj].len / _run[_run.length - 1].len;
                        if (_ratio > _ARC_LEN_RATIO || _ratio < 1 / _ARC_LEN_RATIO) break;
                        _run.push(_rawE[_sj++]);
                    }
                    if (_run.length >= _ARC_MIN_RUN) {
                        // Arc → single chord edge
                        var _cdx = _run[_run.length-1].p2.x - _run[0].p1.x;
                        var _cdy = _run[_run.length-1].p2.y - _run[0].p1.y;
                        _sbEdges.push({ p1: _run[0].p1, p2: _run[_run.length-1].p2,
                            dx: _cdx, dy: _cdy, len: Math.sqrt(_cdx*_cdx + _cdy*_cdy) });
                        _si = _sj; continue;
                    }
                }
                if (_e.len >= _ARC_DEGEN) _sbEdges.push(_e);
                _si++;
            }

            // ── Wrap-around merge ─────────────────────────────────────────────────
            // GIS polygons often start mid-arc (e.g. WA-405 NE corner arc split
            // across vertex 0). If first and last _sbEdges are both short-seg arcs
            // with compatible average lengths, merge last into first.
            (function() {
                if (_sbEdges.length < 2) return;
                var _g0 = _sbEdges[0], _gL = _sbEdges[_sbEdges.length - 1];
                // Both must be arc-length edges (len < _ARC_MAX * _ARC_MIN_RUN)
                if (_g0.len > _ARC_MAX * _ARC_MIN_RUN || _gL.len > _ARC_MAX * _ARC_MIN_RUN) return;
                // Average seg lengths: approximate from total chord / segment count
                // Use raw average from edge len (arc chord ~ arc len for small angles)
                var _avg0 = _g0.len, _avgL = _gL.len;
                var _r = _avg0 > _avgL ? _avg0 / _avgL : _avgL / _avg0;
                if (_r > _ARC_LEN_RATIO) return;
                // Merge: prepend last edge (its p1..p2 comes before g0's p1..p2)
                var _cdx = _g0.p2.x - _gL.p1.x;
                var _cdy = _g0.p2.y - _gL.p1.y;
                _sbEdges[0] = { p1: _gL.p1, p2: _g0.p2,
                    dx: _cdx, dy: _cdy, len: Math.sqrt(_cdx*_cdx + _cdy*_cdy) };
                _sbEdges.pop();
            })();

            // For each edge: compute outward normal, assign setback via bearing
            var offEdges = [];
            for (var i = 0; i < _sbEdges.length; i++) {
                var _se = _sbEdges[i];
                if (_se.len < _ARC_DEGEN) continue;
                var ux = _se.dx / _se.len, uy = _se.dy / _se.len;
                var nx = uy * ws, ny = -ux * ws;  // outward normal
                var sb = _sbForNormal(nx, ny);
                // Offset edge inward (opposite of outward normal)
                offEdges.push({
                    p1: { x: _se.p1.x - sb*nx, y: _se.p1.y - sb*ny },
                    p2: { x: _se.p2.x - sb*nx, y: _se.p2.y - sb*ny },
                    dx: _se.dx, dy: _se.dy,
                    bMidX: (_se.p1.x + _se.p2.x) / 2,
                    bMidY: (_se.p1.y + _se.p2.y) / 2
                });
            }
            // Intersect consecutive offset edges to get inset vertices
            setbackPts = [];
            for (var i = 0; i < offEdges.length; i++) {
                var j = (i+1) % offEdges.length;
                var a = offEdges[i], b = offEdges[j];
                // Line-line intersection: a.p1 + t*(a.dx,a.dy) = b.p1 + s*(b.dx,b.dy)
                var det = a.dx * b.dy - a.dy * b.dx;
                if (Math.abs(det) < 0.001) { setbackPts.push(a.p2); continue; }
                var t = ((b.p1.x - a.p1.x) * b.dy - (b.p1.y - a.p1.y) * b.dx) / det;
                setbackPts.push({ x: a.p1.x + t * a.dx, y: a.p1.y + t * a.dy });
            }
        } else {
            // Rectangle mode — compute per-face setback using frontBearing
            // fBr / fDirX / fDirY defined above in polygon block; re-derive here for rect-only paths
            var fBr2 = ((ConfigEngine.state.frontBearing ?? 270) * Math.PI / 180);
            var fDX2 = Math.sin(fBr2), fDY2 = Math.cos(fBr2);
            var _sbN2 = function(nx_, ny_) {
                var dot_ = nx_*fDX2 + ny_*fDY2;
                if (dot_ > 0.5) return front;
                if (dot_ < -0.5) return rear;
                return (nx_*fDY2 - ny_*fDX2) > 0 ? sideR : sideL;
            };
            var sbW = _sbN2(-1, 0), sbE = _sbN2(1, 0), sbS = _sbN2(0, -1), sbN = _sbN2(0, 1);
            setbackPts = [
                { x: -h/2 + sbW, y:  w/2 - sbN },
                { x:  h/2 - sbE, y:  w/2 - sbN },
                { x:  h/2 - sbE, y: -w/2 + sbS },
                { x: -h/2 + sbW, y: -w/2 + sbS }
            ];
        }

        MapEngine.setbackPoly.setLatLngs(setbackPts.map(transform));

        // Clear old setback dim labels
        MapEngine.setbackDimLabels.forEach(function(l) { MapEngine.map.removeLayer(l); });
        MapEngine.setbackDimLabels = [];

        // Normalize angle to [-90, 90) for upright label text
        var _normA = function(a) { a = ((a % 180) + 180) % 180; return a >= 90 ? a - 180 : a; };

        // Draw setback dim labels for rectangle sites
        if (!(pp && pp.length > 2)) {
            var fBr3 = ((ConfigEngine.state.frontBearing ?? 270) * Math.PI / 180);
            var fDX3 = Math.sin(fBr3), fDY3 = Math.cos(fBr3);
            var _lbl3 = function(nx_, ny_) {
                var dot_ = nx_*fDX3 + ny_*fDY3;
                if (dot_ > 0.5) return 'F';
                if (dot_ < -0.5) return 'R';
                return (nx_*fDY3 - ny_*fDX3) > 0 ? 'SR' : 'SL';
            };
            var _sb3 = function(nx_, ny_) {
                var dot_ = nx_*fDX3 + ny_*fDY3;
                if (dot_ > 0.5) return front;
                if (dot_ < -0.5) return rear;
                return (nx_*fDY3 - ny_*fDX3) > 0 ? sideR : sideL;
            };
            var mapZoom = MapEngine.map.getZoom();
            var sbFontScale = Math.max(0.78, 0.36 + mapZoom * 0.025);
            var sbStyle = { color: '#d97706', weight: 1.5, dashArray: '4 3', interactive: false, noClip: true };
            var sides = [
                { label: _lbl3(-1,0), dist: _sb3(-1,0), bx: -h/2, by: 0,    sx: -h/2 + _sb3(-1,0), sy: 0,    perpX: 0, perpY: 1 },
                { label: _lbl3( 1,0), dist: _sb3( 1,0), bx:  h/2, by: 0,    sx:  h/2 - _sb3( 1,0), sy: 0,    perpX: 0, perpY: 1 },
                { label: _lbl3(0,-1), dist: _sb3(0,-1), bx: 0,    by: -w/2, sx: 0, sy: -w/2 + _sb3(0,-1), perpX: 1, perpY: 0 },
                { label: _lbl3(0, 1), dist: _sb3(0, 1), bx: 0,    by:  w/2, sx: 0, sy:  w/2 - _sb3(0, 1), perpX: 1, perpY: 0 }
            ];
            sides.forEach(function(s) {
                if (s.dist < 0.5) return;
                // Dim line from boundary midpoint to setback midpoint
                var dimLine = L.polyline(
                    [transform({x: s.bx, y: s.by}), transform({x: s.sx, y: s.sy})],
                    sbStyle
                ).addTo(MapEngine.map);
                MapEngine.setbackDimLabels.push(dimLine);
                // Label at midpoint
                var labelPt = { x: (s.bx + s.sx) / 2, y: (s.by + s.sy) / 2 };
                // Rotation: perpendicular to lot edge
                var scrX = s.perpX * cos - s.perpY * sin;
                var scrY = s.perpX * sin + s.perpY * cos;
                var lblAngle = -Math.atan2(scrY, scrX) * 180 / Math.PI;
                lblAngle = ((lblAngle % 180) + 180) % 180;
                if (lblAngle >= 90) lblAngle -= 180;
                var m = L.marker(transform(labelPt), {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="position:relative"><div class="setback-dim-label" style="font-size:' + sbFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + _normA(lblAngle - ConfigEngine.state.rotation).toFixed(1) + 'deg)">' + s.dist.toFixed(0) + "'" + '</div></div>',
                        iconSize: [0, 0], iconAnchor: [0, 0]
                    }),
                    interactive: false
                }).addTo(MapEngine.map);
                MapEngine.setbackDimLabels.push(m);
            });
        }

        // Draw setback-to-boundary dim lines + labels for polygon sites
        // Only one label per side (front/rear/sideL/sideR) — placed on the longest edge of that type
        if (pp && pp.length > 2 && offEdges && offEdges.length > 0) {
            var mapZoom = MapEngine.map.getZoom();
            var sbFontScale = Math.max(0.78, 0.36 + mapZoom * 0.025);
            // Find longest edge per side for label placement
            var bestEdge = {};  // key: 'front'|'rear'|'sideL'|'sideR' → {ei, len}
            for (var ei = 0; ei < offEdges.length; ei++) {
                var oe = offEdges[ei];
                var edgeLen = Math.sqrt(oe.dx*oe.dx + oe.dy*oe.dy);
                if (edgeLen < 1) continue;
                var eUx_ = oe.dx/edgeLen, eUy_ = oe.dy/edgeLen;
                var eNx_ = eUy_ * ws, eNy_ = -eUx_ * ws;
                var eDot_ = eNx_*fDirX + eNy_*fDirY;
                var side = eDot_ > 0.5 ? 'front' : eDot_ < -0.5 ? 'rear' : (eNx_*fDirY - eNy_*fDirX > 0 ? 'sideR' : 'sideL');
                if (!bestEdge[side] || edgeLen > bestEdge[side].len) bestEdge[side] = { ei: ei, len: edgeLen };
            }
            for (var ei = 0; ei < offEdges.length; ei++) {
                var oe = offEdges[ei];
                var edgeLen = Math.sqrt(oe.dx*oe.dx + oe.dy*oe.dy);
                if (edgeLen < 1) continue;
                var eUx = oe.dx/edgeLen, eUy = oe.dy/edgeLen;
                var eNx = eUy * ws, eNy = -eUx * ws;
                var eDot = eNx*fDirX + eNy*fDirY;
                var side = eDot > 0.5 ? 'front' : eDot < -0.5 ? 'rear' : (eNx*fDirY - eNy*fDirX > 0 ? 'sideR' : 'sideL');
                var sbDist = side === 'front' ? front : side === 'rear' ? rear : side === 'sideR' ? sideR : sideL;
                if (sbDist < 0.5) continue;
                var showLabel = bestEdge[side] && bestEdge[side].ei === ei;
                // Midpoint of boundary edge (from collapsed _sbEdges chord, not raw lv[] index)
                var bMidX = oe.bMidX;
                var bMidY = oe.bMidY;
                // Setback midpoint (inward by setback distance)
                var sMidX = bMidX - eNx * sbDist;
                var sMidY = bMidY - eNy * sbDist;
                // Simple dim line from boundary midpoint to setback midpoint
                var sbStyle = { color: '#d97706', weight: 2, interactive: false, noClip: true };
                var dimLine = L.polyline(
                    [transform({x: bMidX, y: bMidY}), transform({x: sMidX, y: sMidY})],
                    sbStyle
                ).addTo(MapEngine.map);
                MapEngine.setbackDimLabels.push(dimLine);
                // Label only on longest edge per side (no stacking)
                if (!showLabel) continue;
                var labelX = (bMidX + sMidX) / 2;
                var labelY = (bMidY + sMidY) / 2;
                var scrNx = -eNx * cos - (-eNy) * sin;
                var scrNy = -eNx * sin + (-eNy) * cos;
                var lblAngle = -Math.atan2(scrNy, scrNx) * 180 / Math.PI;
                lblAngle = ((lblAngle % 180) + 180) % 180;
                if (lblAngle >= 90) lblAngle -= 180;
                var m = L.marker(transform({ x: labelX, y: labelY }), {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="position:relative"><div class="setback-dim-label" style="font-size:' + sbFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + _normA(lblAngle - ConfigEngine.state.rotation).toFixed(1) + 'deg)">' + sbDist.toFixed(0) + "'" + '</div></div>',
                        iconSize: [0, 0], iconAnchor: [0, 0]
                    }),
                    interactive: false
                }).addTo(MapEngine.map);
                MapEngine.setbackDimLabels.push(m);
            }
        }
    }
};

