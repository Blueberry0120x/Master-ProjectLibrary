"""
Fetch parcel polygons from public GIS REST services and update all site JSON files.
Run: py tools/fetch_parcels.py [--dry-run]

Sources:
  San Diego County:  services.arcgis.com/obpUicnfIYG1DOsR  (APN stripped, 10-digit)
  Orange County:     rdp.scag.ca.gov SCAG HELPR 2019 (APN with hyphens)
  King County WA:    services.arcgis.com/Ej0PsM5Aw677QF1W (PIN 10-digit)
"""
import urllib.request, ssl, json, urllib.parse, os, sys, math

ctx = ssl._create_unverified_context()
SITES_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'sites')
DRY_RUN = '--dry-run' in sys.argv

# ── Service URLs ────────────────────────────────────────────────────────────
SD_URL  = 'https://services.arcgis.com/obpUicnfIYG1DOsR/arcgis/rest/services/San_Diego_Parcels/FeatureServer/0/query'
OC_URL  = 'https://rdp.scag.ca.gov/mapping/rest/services/Housing/2019_Annual_Land_Use_NAD83/MapServer/0/query'
KC_URL  = 'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0/query'

# ── Per-site fetch configuration ────────────────────────────────────────────
# (site_file, service, field_name, apn_values, apn_strip_hyphens)
# apn_values: list of APNs to query (for multi-parcel sites, list > 1 -> merged)
SITES = [
    # San Diego County
    ('ca-4335_Euclid.json',       SD_URL,  'APN',  ['471-271-16-00'],              True),
    ('ca-4876_Cannington.json',   SD_URL,  'APN',  ['362-682-03-00'],              True),
    ('ca-5251_Palmyra.json',      SD_URL,  'APN',  ['355-441-13-00'],              True),
    ('ca-9362_Angwin.json',       SD_URL,  'APN',  ['429-562-08-00'],              True),
    ('ca-3063_CabrilloMesa.json', SD_URL,  'APN',  ['428-232-04-00'],              True),
    ('ca-1905_Rohn.json',         SD_URL,  'APN',  ['236-411-06-00'],              True),
    ('ca-2921_ElCajon.json',      SD_URL,  'APN',  ['446-232-04-00'],              True),  # padded
    # Orange County (SCAG uses hyphenated APN field)
    ('ca-11001_Westminster.json', OC_URL,  'APN',  ['100-151-33', '100-151-34'],   False),  # 2 lots merged
    ('ca-12652_Laux.json',        OC_URL,  'APN',  ['231-544-02'],                 False),
    # King County WA
    ('wa-405_126th.json',         KC_URL,  'PIN',  ['0723049368'],                 False),
    # wa-10404_Kirkland.json skipped — lat/lng = 0, site not yet set up
]


# ── Geometry helpers ─────────────────────────────────────────────────────────
def geojson_ring_to_latlon(ring):
    """Convert GeoJSON [lng,lat] ring to [[lat,lng],...] without closing dup."""
    pts = [[round(pt[1], 8), round(pt[0], 8)] for pt in ring]
    if pts and pts[0] == pts[-1]:
        pts = pts[:-1]
    return pts


def convex_hull(pts):
    """Graham scan convex hull. pts = [[lat,lng],...]. Returns hull [[lat,lng],...]."""
    def cross(o, a, b):
        return (a[1]-o[1])*(b[0]-o[0]) - (a[0]-o[0])*(b[1]-o[1])
    pts = sorted(set(map(tuple, pts)))
    if len(pts) <= 1:
        return [list(p) for p in pts]
    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    hull = lower[:-1] + upper[:-1]
    return [list(p) for p in hull]


def polygon_centroid(pts):
    """Simple centroid (average of vertices)."""
    lat = sum(p[0] for p in pts) / len(pts)
    lng = sum(p[1] for p in pts) / len(pts)
    return round(lat, 8), round(lng, 8)


# ── Fetch functions ──────────────────────────────────────────────────────────
def _fetch_geojson_polygon(url, field, apn, strip_hyphens):
    """Fetch a single polygon for one APN. Returns [[lat,lng],...] or None."""
    apn_val = apn.replace('-', '') if strip_hyphens else apn
    params = urllib.parse.urlencode({
        'where': field + "='" + apn_val + "'",
        'outFields': field,
        'outSR': '4326',
        'f': 'geojson',
        'resultRecordCount': '1'
    })
    try:
        r = urllib.request.urlopen(url + '?' + params, context=ctx, timeout=25)
        d = json.loads(r.read())
        features = d.get('features', [])
        if not features:
            return None
        geom = features[0].get('geometry', {})
        gtype = geom.get('type', '')
        if gtype == 'Polygon':
            ring = geom['coordinates'][0]
        elif gtype == 'MultiPolygon':
            ring = max(geom['coordinates'], key=lambda rg: len(rg[0]))[0]
        else:
            return None
        return geojson_ring_to_latlon(ring)
    except Exception as e:
        print('    ERROR (' + apn + '): ' + str(e))
        return None


def fetch_polygon_for_site(url, field, apns, strip_hyphens):
    """Fetch and merge polygons for a site (handles multi-parcel sites)."""
    rings = []
    for apn in apns:
        poly = _fetch_geojson_polygon(url, field, apn, strip_hyphens)
        if poly:
            rings.append(poly)
        else:
            print('    MISS: ' + apn)
    if not rings:
        return None
    if len(rings) == 1:
        return rings[0]
    # Multiple parcels: merge via convex hull of all vertices
    all_pts = [pt for ring in rings for pt in ring]
    print('    MERGE: ' + str(len(rings)) + ' parcels -> convex hull (' + str(len(all_pts)) + ' pts)')
    return convex_hull(all_pts)


# ── JSON update ──────────────────────────────────────────────────────────────
def update_site_json(filename, poly):
    """Update site.parcelPolygon, saved.parcelPolygon, and saved lat/lng."""
    path = os.path.join(SITES_DIR, filename)
    with open(path, encoding='utf-8') as f:
        j = json.load(f)

    clat, clng = polygon_centroid(poly)

    if not DRY_RUN:
        # Update site section
        if 'site' not in j:
            j['site'] = {}
        j['site']['parcelPolygon'] = poly

        # Update saved section
        if 'saved' not in j:
            j['saved'] = {}
        j['saved']['parcelPolygon'] = poly
        j['saved']['lat'] = clat
        j['saved']['lng'] = clng

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(j, f, indent=2)

    return clat, clng


# ── ElCajon APN fix ──────────────────────────────────────────────────────────
def fix_elcajon_apn():
    """Patch ca-2921_ElCajon.json APN from 446-232-04 to 446-232-04-00."""
    path = os.path.join(SITES_DIR, 'ca-2921_ElCajon.json')
    with open(path, encoding='utf-8') as f:
        j = json.load(f)
    old_apn = j.get('site', {}).get('apn', '')
    if old_apn == '446-232-04':
        if not DRY_RUN:
            j['site']['apn'] = '446-232-04-00'
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(j, f, indent=2)
        print('  Fixed ElCajon APN: 446-232-04 -> 446-232-04-00')


# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if DRY_RUN:
        print('[DRY RUN] No files will be modified.\n')

    fix_elcajon_apn()

    results = []
    for filename, url, field, apns, strip in SITES:
        label = filename.replace('.json', '')
        print(label + ' (' + ', '.join(apns) + ') ...')
        poly = fetch_polygon_for_site(url, field, apns, strip)
        if poly:
            clat, clng = update_site_json(filename, poly)
            status = 'OK'
            results.append((label, status, len(poly), clat, clng))
            print('  -> ' + str(len(poly)) + ' vertices  centroid=' + str(clat) + ',' + str(clng))
        else:
            results.append((label, 'FAIL', 0, None, None))
            print('  -> FAIL (no polygon returned)')

    print('\n=== SUMMARY ===')
    ok = [r for r in results if r[1] == 'OK']
    fail = [r for r in results if r[1] == 'FAIL']
    print('OK:   ' + str(len(ok)) + '/' + str(len(results)))
    if fail:
        print('FAIL: ' + ', '.join(r[0] for r in fail))
    if not DRY_RUN and ok:
        print('\nNext: py tools/build.py')

