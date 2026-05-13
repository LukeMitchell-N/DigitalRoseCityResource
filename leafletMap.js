import { icons } from "./icons/icons.js"
let map, markers = L.markerClusterGroup({
    maxClusterRadius: 100,
    showCoverageOnHover: false,
    iconCreateFunction: createCustomCluster,
    //spiderfyOnMaxZoom: true,
    spiderfyOnEveryZoom: true,
    disableClusteringAtZoom: 17
});
const spreadsheetId = '1dsL9BS4IJMr-5jYSyyS_bTYV82wVRCtZrzOZoJUXgpY';
const apiKey = 'AIzaSyAb5dMPDAJ19o2-gxbyzvb8ChewsG8JxzM';
const sheetNames = ['Multnomah County', 'Clackamas County', 'Washington County'];
let orgs = [];


function createCustomCluster(cluster) {                        //Custom version of default iconCreateFunction
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


//Setting up the map
async function createMapContent() {
    fetchGoogleSheetData().then((p) => {
        createMap();
        addOrgsToMap();
    });             //return later - then necessary?
}
function createMap() {
    map = L.map('myMap').setView([45.5152, -122.6784], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
    }).addTo(map);
}
function addOrgsToMap() {
    //console.log(typeof orgs)
    //console.log(orgs)
    for (const org of orgs) {
        let marker = null;                                          //One marker per organization - init null
        if (org.Coords && org.Coords.match('[0-9].*')) {            //Catch lat/lng values that don't start with a number
            let iconName = org['Section'];
            if (!(org['Section'] in icons)) {
                iconName = 'Undefined';
            }
            marker = L.marker(org.Coords.split(','),
                { icon: L.icon({ iconUrl: icons[iconName], iconSize: [30, 30] }) }
            );
            marker["Organization"] = org;
            marker["Active"] = true;
            marker.on('click', markerClick)
            markers.addLayer(marker);
        };
        org['marker'] = marker;
    };
    markers.addTo(map);
}

//Getting data from Google Sheets
async function fetchSingleSheet(sheet) {
    try {
        let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheet}?key=${apiKey}`;
        // Fetch data from Google Sheets API
        const response = await fetch(url);
        const data = await response.json();

        // Extract rows from the data
        //console.log(data.values)
        return data.values;

    } catch (error) {
        console.error('Error fetching Google Sheets data:', error);
        throw ('Error fetching Google Sheets data:', error)
    }
}

async function fetchGoogleSheetData() {
    for (const sheet of sheetNames) {
        try {
            const rows = await fetchSingleSheet(sheet)
            if (rows != null) {
                orgs.push(...rowsToObjects(rows));
            }
            //console.log(orgs)


        } catch (error) {
            console.error('Error fetching Google Sheets data:', error);
        }
    };
}

const rowsToObjects = (rows) => {
    const fieldNames = rows[0];

    const reducer = (accumulator, currentVal, index) => {
        accumulator[fieldNames[index]] = currentVal;
        return accumulator
    }
    return rows.slice(1).map((row) => {
        return row.reduce(reducer, {})
    });
}


//Map functionality
function markerClick(e) {
    //console.log(e.target.Organization);
    //e.target.Organization.marker.options.icon.
    //console.log("org name: " + e.target.Organization["Org Name"])
    document.getElementById("lower-box").classList.remove("hidden");
    document.getElementById("organization-name").innerHTML = e.target.Organization["Org Name"]
    document.getElementById("organization-address").innerHTML = e.target.Organization["Address"]
    document.getElementById("organization-section").innerHTML = e.target.Organization["Section"]
    document.getElementById("organization-description").innerHTML = e.target.Organization["Description & Hours"]
    document.getElementById("organization-phone").innerHTML = e.target.Organization["Phone Number"]
    //console.log("classlist of organization detail: " + document.getElementById("lower-box").classList)
    if (document.querySelector('.sidebar').classList.contains("collapsed")) {
        toggleSidebar();
    }   
    console.log(map.getZoom())
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('collapsed');
    document.querySelector('.leaflet-left').classList.toggle('collapsed')
}

function searchOrganizations() {
    var search_string = document.getElementById("org-search").value;
    console.log(search_string);
    /*for (let key in markers) {
        console.log(`${key}: ${markers[key]}`);
    }*/
    console.log(orgs)
    for (const org of orgs) {
        console.log(org);
        console.log(org.marker);
        org["marker"]["Active"] = true;                             // Set all organizations/markers back to active (clear prev. search)
        let org_values = Object.values(org);                    
        console.log("org_values: " + org_values);
        console.log("typeof org_values: " + typeof (org_values));

        // If the organization does not contain the search term in ANY of its values
        // Set the org/marker to inactive
        if (org_values.some((val) => String(val).toLowerCase().includes(search_string.toLowerCase())) == false) {
            org.marker["Active"] = false;
        }
    }

    for (org in orgs) {
        console.log(org.marker)
    }
            
}



// Call the function to fetch and display data
document.addEventListener('DOMContentLoaded', createMapContent);
document.getElementById("org-search").addEventListener("keypress", function (event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
        //Act as if the enter button was clicked
        document.getElementById("org-search-enter").click();
    }
});
document.getElementById("org-search-enter").addEventListener('click', searchOrganizations)

