const { createClient } = window.supabase;
const supabaseUrl = 'https://crdintvkahorwjzcwxef.supabase.co';
const supabaseKey = 'sb_publishable_fvvZccY5Gh-9-_uWtb-oSg_tXeZ9o2R';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [-73.98, 40.75],
    zoom: 13
});

async function queryWithinDistance(point, n = 1000) {
    const { data, error } = await supabaseClient.rpc(
        "find_nearest_n_restaurants",
        { lat: point[1], lon: point[0], n: n }
    );
    if (error) {
        console.error("Error:", error);
        return;
    }

    const geojson = {
        type: "FeatureCollection",
        features: data.map(r => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [r.long, r.lat] },
            properties: {
                name: r.name,
                seating_choice: r.seating_choice,
                dist_meters: r.dist_meters
            }
        }))
    };

    if (map.getSource("restaurants")) {
        map.getSource("restaurants").setData(geojson);
    } else {
        map.addSource("restaurants", { type: "geojson", data: geojson });

        map.addLayer({
            id: "restaurants-layer",
            type: "circle",
            source: "restaurants",
            paint: {
                "circle-radius": [
                    "interpolate", ["linear"],
                    ["get", "dist_meters"],
                    0, 10,
                    1000, 4
                ],
                "circle-color": [
                    "match", ["get", "seating_choice"],
                    "sidewalk", "#e74c3c",
                    "roadway", "#3498db",
                    "both", "#2ecc71",
                    "#aaaaaa"
                ],
                "circle-opacity": 0.85,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#fff"
            }
        });

        map.on("click", "restaurants-layer", (e) => {
            const p = e.features[0].properties;
            new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                    <strong>${p.name}</strong><br>
                    Seating: ${p.seating_choice}<br>
                    Distance: ${Math.round(p.dist_meters)}m
                `)
                .addTo(map);
        });
    }
}

map.on("load", () => {
    map.on("click", (e) => {
        const point = [e.lngLat.lng, e.lngLat.lat];
        queryWithinDistance(point, 1000);
    });
});