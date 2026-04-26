/* ==========================================
   ENGINE 8: VERTEX EDITOR
   Allows freeform polygon reshaping of:
     - Design buildings (bldg.polygon overrides W×D rectangle)
     - Existing building footprint (delegates to MapEngine PM flow)
   ========================================== */
const VertexEngine = {
    _activeBldgIdx: -1,      // which building is being edited (-1 = none)
    _editBar: null,          // DOM element for the floating edit bar
    _frozen: false,          // true while vertex edit is active (suppresses drawBuilding)

    /* ── Public API ──────────────────────────────────────────────────── */

    // Start vertex editing on design building at index `idx`
    startBldgEdit: function(idx) {
        const state = ConfigEngine.state;
        const bldg  = state.buildings[idx];
        if (!bldg) return;
        if (this._frozen) this._cleanup();

        this._activeBldgIdx = idx;
        this._frozen = true;

        // Ensure the polygon exists on the map
        SetbackEngine.drawBuilding();

        const poly = MapEngine.buildingPolys[idx] && MapEngine.buildingPolys[idx][0];
        if (!poly || !L.PM) {
            this._frozen = false;
            this._activeBldgIdx = -1;
            alert('Polygon layer not available — draw the building first.');
            return;
        }

        // Style the polygon differently while editing
        poly.setStyle({ color: '#7c3aed', fillColor: '#7c3aed', dashArray: null });

        poly.pm.enable({
            allowSelfIntersection: false,
            draggable: true,
            removeLayerBelowMinVertices: false,
            preventVertexRemoval: false
        });

        this._showBldgEditBar(idx);
    },

    // Save edited vertices back to bldg.polygon (local Frame B ft coords)
    saveBldgEdit: function() {
        const idx  = this._activeBldgIdx;
        const state = ConfigEngine.state;
        const bldg  = state.buildings[idx];
        if (!bldg) { this._cleanup(); return; }

        const poly = MapEngine.buildingPolys[idx] && MapEngine.buildingPolys[idx][0];
        if (!poly) { this._cleanup(); return; }

        const latLngs = poly.getLatLngs()[0];
        poly.pm.disable();

        // Convert each vertex from lat/lng → local Frame B (ft from lot center)
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
        const lRad  = MapEngine.effectiveRotation() * Math.PI / 180;
        const lCos  = Math.cos(lRad), lSin = Math.sin(lRad);

        // Frame B: x=east, y=north in local rotated frame
        const verts = latLngs.map(function(ll) {
            const ry = (ll.lat - state.lat) * F_LAT;
            const rx = (ll.lng - state.lng) * F_LNG;
            return [ rx * lCos + ry * lSin, ry * lCos - rx * lSin ];
        });

        // Store as offsets from building center (offsetX, offsetY) in Frame B
        const { front, rear, sideL, sideR } = state.setbacks;
        const cx = (front - rear) / 2 + (bldg.offsetX || 0);
        const cy = (sideR - sideL) / 2 + (bldg.offsetY || 0);
        bldg.polygon = verts.map(function(v) { return [v[0] - cx, v[1] - cy]; });

        // Update W/D/area from polygon bounding box so FAR stays accurate
        const xs = verts.map(v => v[0]), ys = verts.map(v => v[1]);
        const spanX = Math.max(...xs) - Math.min(...xs);
        const spanY = Math.max(...ys) - Math.min(...ys);
        // Keep W/D as the bounding extents (used for chain dims)
        bldg.W = parseFloat(spanY.toFixed(1));
        bldg.D = parseFloat(spanX.toFixed(1));

        this._cleanup();
        SetbackEngine.drawBuilding();
        ExportEngine.save();
    },

    // Cancel — restore rectangle
    cancelBldgEdit: function() {
        const idx  = this._activeBldgIdx;
        const poly = MapEngine.buildingPolys[idx] && MapEngine.buildingPolys[idx][0];
        if (poly) poly.pm.disable();
        this._cleanup();
        SetbackEngine.drawBuilding();  // re-renders original rectangle
    },

    // Clear custom polygon → revert to W×D rectangle
    clearBldgPolygon: function(idx) {
        const bldg = ConfigEngine.state.buildings[idx];
        if (!bldg) return;
        delete bldg.polygon;
        SetbackEngine.drawBuilding();
        ExportEngine.save();
    },

    // Delegate existing building vertex edit to MapEngine's existing PM flow
    startExBldgEdit: function() {
        MapEngine._startExBldgEdit();
    },

    /* ── Helpers ─────────────────────────────────────────────────────── */

    _cleanup: function() {
        this._frozen = false;
        this._activeBldgIdx = -1;
        if (this._editBar) { this._editBar.remove(); this._editBar = null; }
        // Restore polygon style
        MapEngine.buildingPolys.forEach(function(group) {
            group.forEach(function(p) {
                p.setStyle({ color: '#e67e22', fillColor: '#e67e22', dashArray: '5 3' });
            });
        });
    },

    _showBldgEditBar: function(idx) {
        if (this._editBar) this._editBar.remove();
        const self = this;
        const bar = document.createElement('div');
        bar.style.cssText = 'position:absolute;bottom:100px;left:50%;transform:translateX(-50%);z-index:1001;' +
            'display:flex;gap:8px;background:rgba(255,255,255,0.97);border:2px solid #7c3aed;' +
            'border-radius:8px;padding:8px 14px;box-shadow:0 4px 16px rgba(124,58,237,.25);' +
            'font-size:13px;align-items:center;white-space:nowrap;';
        bar.innerHTML =
            '<span style="color:#7c3aed;font-weight:700;">&#9632; Vertex Edit — B' + (idx + 1) + '</span>' +
            '<span style="color:#6b7280;font-size:11px;">Drag corners · click edge to add vertex</span>' +
            '<button id="vtx-save" style="background:#7c3aed;color:#fff;border:none;border-radius:5px;' +
            'padding:5px 14px;cursor:pointer;font-size:12px;font-weight:700;">Save Shape</button>' +
            '<button id="vtx-cancel" style="background:#e5e7eb;color:#333;border:none;border-radius:5px;' +
            'padding:5px 10px;cursor:pointer;font-size:12px;">Cancel</button>' +
            '<button id="vtx-clear" style="background:#fee2e2;color:#991b1b;border:none;border-radius:5px;' +
            'padding:5px 10px;cursor:pointer;font-size:12px;" title="Reset to W×D rectangle">Reset ▭</button>';
        MapEngine.map.getContainer().appendChild(bar);
        this._editBar = bar;
        document.getElementById('vtx-save').addEventListener('click', function() { self.saveBldgEdit(); });
        document.getElementById('vtx-cancel').addEventListener('click', function() { self.cancelBldgEdit(); });
        document.getElementById('vtx-clear').addEventListener('click', function() {
            self.cancelBldgEdit();
            self.clearBldgPolygon(idx);
        });
    },

    /* ── Polygon area helper (shoelace — for FAR calc) ───────────────── */
    polygonArea: function(verts) {
        // verts: [[x,y],...] local ft
        let area = 0;
        const n = verts.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += verts[i][0] * verts[j][1];
            area -= verts[j][0] * verts[i][1];
        }
        return Math.abs(area) / 2;
    }
};
