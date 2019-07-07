var MapboxGeocoder = require('@mapbox/mapbox-gl-geocoder')
var mapboxgl = require('mapbox-gl/dist/mapbox-gl.js')

mapboxgl.accessToken = 'pk.eyJ1IjoiY2dsb3BlejE5ODkiLCJhIjoiY2p3a3VkOHR1MDBwNTQ4cHA5dnlqdzZjbSJ9.nAiyhwEo3aQu6ndTF0kweQ';
var map = new mapboxgl.Map({
    container: 'map',
    zoom: 8,
    pitch: 60, // pitch in degrees
    bearing: 0, // bearing in degrees
    center: [-81.43010461505332, 28.415524456794216],
    style: 'mapbox://styles/cglopez1989/cjun0whj849df1fnq2of37iky'
});

map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

map.addControl(new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    localGeocoder: customGeocoder,
    localGeocoderOnly: true,
    mapboxgl: mapboxgl,
}), 'bottom-left');

var listingsJSON

function customGeocoder(query) {
    var customData = listingsJSON
    var matchingFeatures = []
    for (var i = 0; i < customData.features.length; i++) {
        var feature = customData.features[i]
        // handle queries with different capitalization than the source data by calling toLowerCase()
        if (feature.properties.name.toLowerCase().search(query.toLowerCase()) !== -1) {
            // add a tree emoji as a prefix for custom data results
            // using carmen geojson format: https://github.com/mapbox/carmen/blob/master/carmen-geojson.md
            feature['place_name'] = '🌲 ' + feature.properties.name
            feature['center'] = feature.geometry.coordinates
            feature['place_type'] = ['park']
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
    }, labelLayerId);

    var layers = map.getStyle().layers;

    $.getJSON('server/members.geojson', data => {
        listingsJSON = data
        console.log(data)
        buildLocationList(data);
    })

    var labelLayerId;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

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
    });

    map.on('mouseenter', 'clusters', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', function () {
        map.getCanvas().style.cursor = '';
    });
});

document.getElementById('fly').addEventListener('click', function () {
    // Fly to a random location by offsetting the point -74.50, 40
    // by up to 5 degrees.
    map.flyTo({
        center: [
            -74.50 + (Math.random() - 0.5) * 10,
            40 + (Math.random() - 0.5) * 10]
    });
});

function buildLocationList(data) {
    // Iterate through the list of stores
    for (i = 0; i < data.features.length; i++) {

        var currentFeature = data.features[i];
        // Shorten data.feature.properties to `prop` so we're not
        // writing this long form over and over again.
        var prop = currentFeature.properties;
        // Select the listing container in the HTML and append a div
        // with the class 'item' for each store
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

var theToggle = document.getElementById('toggle');

// hasClass
function hasClass(elem, className) {
    return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
}
// addClass
function addClass(elem, className) {
    if (!hasClass(elem, className)) {
        elem.className += ' ' + className;
    }
}
// removeClass
function removeClass(elem, className) {
    var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
    if (hasClass(elem, className)) {
        while (newClass.indexOf(' ' + className + ' ') >= 0) {
            newClass = newClass.replace(' ' + className + ' ', ' ');
        }
        elem.className = newClass.replace(/^\s+|\s+$/g, '');
    }
}
// toggleClass
function toggleClass(elem, className) {
    var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, " ") + ' ';
    if (hasClass(elem, className)) {
        while (newClass.indexOf(" " + className + " ") >= 0) {
            newClass = newClass.replace(" " + className + " ", " ");
        }
        elem.className = newClass.replace(/^\s+|\s+$/g, '');
    } else {
        elem.className += ' ' + className;
    }
}

theToggle.onclick = function () {
    toggleClass(this, 'on');
    return false;
}