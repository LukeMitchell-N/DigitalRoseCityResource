export let markers = L.markerClusterGroup({
    maxClusterRadius: 100,
    showCoverageOnHover: false,
    iconCreateFunction: createCustomCluster,
    //spiderfyOnMaxZoom: true,
    spiderfyOnEveryZoom: true,
    disableClusteringAtZoom: 17
});


export function createCustomCluster(cluster) {                        //Custom version of default iconCreateFunction
    var childCount = cluster.getChildCount();

    // Customized - Give all clusters the same symbol - default small
    var c = ' marker-cluster-small';

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
    var ptSize = area < 900 ? 30 : Math.sqrt(area);
    //console.log("area = " + area + "ptsize: " + ptSize);


    return new L.DivIcon({ html: '<div><span>' + childCount + ' <span aria-label="markers"></span>' + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(ptSize, ptSize) });
}