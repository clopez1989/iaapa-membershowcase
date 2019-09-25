console.log(`
 _____  ___ ____________  ___  
|_   _|/ _ \\| ___ \\ ___ \\/ _ \\ 
  | | / /_\\ \\ |_/ / |_/ / /_\\ \\
  | | |  _  |  __/|  __/|  _  |
 _| |_| | | | |   | |   | | | |
 \\___/\\_| |_|_|   \\_|   \\_| |_/
___  ___               _               _____ _                                      
|  \\/  |              | |             /  ___| |                                     
| .  . | ___ _ __ ___ | |__   ___ _ __\\ \`--.| |__   _____      _____  __ _ ___  ___ 
| |\\/| |/ _ \\ '_ \` _ \\| '_ \\ / _ \\ '__|\`--. \\ '_ \\ / _ \\ \\ /\\ / / __|/ _\` / __|/ _ \\
| |  | |  __/ | | | | | |_) |  __/ |  /\\__/ / | | | (_) \\ V  V / (__| (_| \\__ \\  __/
\\_|  |_/\\___|_| |_| |_|_.__/ \\___|_|  \\____/|_| |_|\\___/ \\_/\\_/ \\___|\\__,_|___/\\___|
                                                                client v${process.env.VERSION}.${process.env.BUILD}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ★  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

// requires
var _ = require('lodash')
var MapboxGeocoder = require('@mapbox/mapbox-gl-geocoder')
var mapboxgl = require('mapbox-gl/dist/mapbox-gl.js')
var IdleJs = require('idle-js')

// mapbox css
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import 'mapbox-gl/dist/mapbox-gl.css'

// custom scss
import './../styles/input.scss'

var idle = true

mapboxgl.accessToken = process.env.MAPBOX_TOKEN
var map = new mapboxgl.Map({
    container: 'map',
    zoom: 3,
    pitch: 60, // pitch in degrees
    bearing: 0, // bearing in degrees
    center: [-50.43010461505332, -50.415524456794216],
    style: process.env.MAPBOX_STYLE
});


var idlejs = new IdleJs({
    idle: 1000 * 10, // idle time in ms
    events: ['keydown', 'mousedown', 'touchstart'], // events that will trigger the idle resetter
    onIdle: _ => {
        console.log('IDLE')
        idle = true
        flyToRandomLocation()
    },
    onActive: _ => {
        console.log('ACTIVE')
        map.stop()
        idle = false
    },
    onHide: function () {}, // callback function to be executed when window become hidden
    onShow: function () {}, // callback function to be executed when window become visible
    keepTracking: true, // set it to false if you want to be notified only on the first idleness change
    startAtIdle: true // set it to true if you want to start in the idle state
  })

map.on('moveend', evt => {
    if (idle) flyToRandomLocation()
})

map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

map.addControl(new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    localGeocoder: customGeocoder,
    localGeocoderOnly: true,
    mapboxgl: mapboxgl,
}), 'bottom-left');

function customGeocoder(query) {
    
    if(!listingsJSON || !listingsJSON.features) return

    var matchingFeatures = []
    for (var i = 0; i < listingsJSON.features.length; i++) {
        var feature = listingsJSON.features[i]
        // handle queries with different capitalization than the source data by calling toLowerCase()
        if (feature.properties.name.toLowerCase().search(query.toLowerCase()) !== -1) {
            // add a tree emoji as a prefix for custom data results
            // using carmen geojson format: https://github.com/mapbox/carmen/blob/master/carmen-geojson.md
            feature['place_name'] = feature.properties.name
            feature['center'] = feature.geometry.coordinates
            matchingFeatures.push(feature)
        }
    }
    return matchingFeatures
}

map.on('load', function () {
    // Add a new source from our GeoJSON data and set the
    // 'cluster' option to true. GL-JS will add the point_count property to your source data.
    map.addSource("iaapa-members", {
        type: "geojson",
        data: "server/members.geojson",
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
    });

    map.addLayer({
        id: "clusters",
        type: "circle",
        source: "iaapa-members",
        filter: ["has", "point_count"],
        paint: {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            //   * Blue, 20px circles when point count is less than 100
            //   * Yellow, 30px circles when point count is between 100 and 750
            //   * Pink, 40px circles when point count is greater than or equal to 750
            "circle-color": [
                "step",
                ["get", "point_count"],
                "#15bef0",
                2,
                "#e871ab",
                3,
                "#2f9e43"
            ],
            "circle-radius": [
                "step",
                ["get", "point_count"],
                20,
                100,
                30,
                750,
                40
            ]
        }
    });

    map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "iaapa-members",
        filter: ["has", "point_count"],
        layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12
        }
    });

    map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "iaapa-members",
        filter: ["!", ["has", "point_count"]],
        paint: {
            "circle-color": "#11b4da",
            "circle-radius": 16,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff"
        }
    });

    map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': '#aaa',

            // use an 'interpolate' expression to add a smooth transition effect to the
            // buildings as the user zooms in
            'fill-extrusion-height': [
                "interpolate", ["linear"], ["zoom"],
                15, 0,
                15.05, ["get", "height"]
            ],
            'fill-extrusion-base': [
                "interpolate", ["linear"], ["zoom"],
                15, 0,
                15.05, ["get", "min_height"]
            ],
            'fill-extrusion-opacity': .6
        }
    });

    var layers = map.getStyle().layers;

    var labelLayerId;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

    flyToRandomLocation()
    idlejs.start()

    map.on('mouseenter', 'unclustered-point', evt => {
        var pointProperties = evt.features[0].properties

        // name
        console.log(pointProperties.name)

        createPopUp(evt.features[0])

        // no other useful data is in the listingsJSON but if it were, get it like this:
        //console.log(_.find(listingsJSON.features, {  properties: { id: pointProperties.id.toString() }}))
    })

    //*inspect a cluster on click
    map.on('click', 'clusters', function (e) {
        var features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        var clusterId = features[0].properties.cluster_id;
        map.getSource('iaapa-members').getClusterExpansionZoom(clusterId, function (err, zoom) {
            if (err)
                return;

            map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom
            });
        });
        createPopUp(features);
    });

    map.on('mouseenter', 'clusters', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', function () {
        map.getCanvas().style.cursor = '';
    });
});

/*$(document).on('click', '#fly', flyToRandomLocation)*/
function flyToRandomLocation() {

    // TODO: don't just return, this is a workaround
    return
    
    map.flyTo({
        center: _.sample(listingsJSON.features).geometry.coordinates,
        zoom: 9,
        bearing: 0,
            
        // These options control the flight curve, making it move
        // slowly and zoom out almost completely before starting
        // to pan.
        speed: 0.2, // make the flying slow
        curve: 1, // change the speed at which it zooms out
            
        // This can be any easing function: it takes a number between
        // 0 and 1 and returns another number between 0 and 1.
        easing: function (t) { return t; }
    })

}

var listingsJSON
$.getJSON('server/members.geojson', data => {
        
    if (!data || !data.features) return
    
    console.log(`loaded ${data.features.length} listings`)
    listingsJSON = data
    buildLocationList(data);
})

function buildLocationList(data) {
    // Iterate through the list of stores
    for (var i = 0; i < data.features.length; i++) {

        var currentFeature = data.features[i];
        // Shorten data.feature.properties to `prop` so we're not
        // writing this long form over and over again.
        var prop = currentFeature.properties;
        // Select the listing container in the HTML and append a div
        // with the class 'item' for each store

        // TODO: this dom element doesn't exist
        var listings = document.getElementById('listings');
        var listing = listings.appendChild(document.createElement('div'));
        listing.className = 'item';
        listing.id = 'listing-' + i;

        // Create a new link with the class 'title' for each store
        // and fill it with the store address
        var link = listing.appendChild(document.createElement('a'));
        link.href = '#';
        link.className = 'title';
        link.dataPosition = i;
        link.innerHTML = prop.name;
    }
}

function createPopUp(currentFeature) {
    var popUps = document.getElementsByClassName('mapboxgl-popup');
    // Check if there is already a popup on the map and if so, remove it
    if (popUps[0]) popUps[0].remove();

    var popup = new mapboxgl.Popup({ closeOnClick: false, closeButton: false })
      .setLngLat(currentFeature.geometry.coordinates)
      .setHTML(`<h3>${currentFeature.properties.name}</h3>`)
      .addTo(map);

    map.on('mouseleave', 'unclustered-point', evt => {
        popup.remove()
    })
  }
