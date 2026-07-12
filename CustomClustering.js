
export let allMarkers = L.markerClusterGroup({
    maxClusterRadius: determineCurrentMaxClusterRadius,
    showCoverageOnHover: false,
    iconCreateFunction: createCustomCluster,
    //spiderfyOnMaxZoom: true,
    //spiderfyOnEveryZoom: true,
});
export let searchMarkers = L.markerClusterGroup({
    maxClusterRadius: determineCurrentMaxClusterRadius,
    showCoverageOnHover: false,
    iconCreateFunction: createCustomCluster,
    //spiderfyOnMaxZoom: true,
    //spiderfyOnEveryZoom: true,
});
var zoomSwitchPointMarker = 17;
var smallestPointSize = 30;
function determineCurrentMaxClusterRadius(zoom) {
    if (zoom >= zoomSwitchPointMarker) {
        return 10;
    }
    else {
        return 100;
    }
}

//Custom version of default iconCreateFunction
export function createCustomCluster(cluster) {                        
    var childCount = cluster.getChildCount();

    // Customized - Marker appearance changes whether or not map is at high zoom settings
    var pointMarker = (map.getZoom() >= zoomSwitchPointMarker)
      

    /*
    if (childCount < 8) {
        c += 'small';
    } else if (childCount < 30) {
        c += 'medium';
    } else {
        c += 'large';
    }
    */

    // Get latitude longitude of all points making up the bounding polygon of the points in this cluster
    var latlngs = L.polygon(cluster.getConvexHull()).getLatLngs()[0];

    // Convert the coordinate pairs to screen pixel positions
    var screenCoordinates = [];
    for (var i = 0; i < latlngs.length; i++) {
        screenCoordinates.push(map.latLngToContainerPoint(latlngs[i]));
    }
    //console.log(screenCoordinates)

    // Implementation of the shoelace theorem to calculate the screen area of the poly
    var npoints = screenCoordinates.length;
    var total = 0;
    for (let i = 0; i < npoints; i++) {
        //console.log(screenCoordinates[i]);
        total += screenCoordinates[i].x * screenCoordinates[(i + 1) % npoints].y
            - screenCoordinates[i].y * screenCoordinates[(i + 1) % npoints].x;
    }
    var area = Math.abs(total * .5);
    var ptSize = area < smallestPointSize ** 2 ? smallestPointSize : Math.sqrt(area);
    //console.log("area = " + area + "ptsize: " + ptSize);


    if (pointMarker == true) {
        let multiIcon = './icons/diamond.svg'
        return new L.DivIcon({
            html: '<img src = "' + multiIcon + '" style="width: ' + smallestPointSize + 'px; height: ' + smallestPointSize + 'px;">',
            className: 'leaflet-marker-icon leaflet-zoom-animated leaflet-interactive black-to-green',
            iconSize: smallestPointSize
        });
    }
    else {
        return new L.DivIcon({
            html: '<div><span>' + childCount + ' <span aria-label="markers"></span>' + '</span></div>',
            className: 'marker-cluster marker-cluster-small',
            iconSize: new L.Point(ptSize, ptSize)
        });
    }
    
}