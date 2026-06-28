const spreadsheetId = '1dsL9BS4IJMr-5jYSyyS_bTYV82wVRCtZrzOZoJUXgpY';
const apiKey = 'AIzaSyAb5dMPDAJ19o2-gxbyzvb8ChewsG8JxzM';
const sheetNames = ['Multnomah County', 'Clackamas County', 'Washington County'];
let orgs = [];
import {allMarkers, searchMarkers, createCustomCluster} from "./CustomClustering.js"      
import { icons } from "./icons/icons.js"

//Setting up the map
async function createMapContent() {
    fetchGoogleSheetData().then((p) => {
        createMap();
        addOrgsToMap();
        //createLegend();
        map.on('zoomend', onZoomEnd);
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
            if (!(org['Section'] in icons)) {                       // Give the organization marker the appropriate icon
                iconName = 'Undefined';
            }
            marker = L.marker(org.Coords.split(','),
                { icon: L.icon({ iconUrl: icons[iconName], iconSize: [30, 30] }) }
            );
            org["Lat"] = parseFloat(org.Coords.split(',')[0])
            org["Lng"] = parseFloat(org.Coords.split(',')[1])
            marker["Organization"] = org;
            marker.on('click', markerClick)
            allMarkers.addLayer(marker);
        };
        org['marker'] = marker;
    };
    allMarkers.addTo(map);
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


/*
function createLegend() {
    console.log("trying to set up div overlay")
    newDivOverlay = L.DivOverlay(interactive = true, content="<div style='backgroundcolor: blue'></div>");
    newDivOverlay.openOn(map)
}
*/

// Map functionality
function markerClick(e) {
    loadSidebarOrgDetail(e.target.Organization);
}

function loadSidebarOrgDetail(org) {
    // Grab relevant information from the target clicked marker
    // Use the org info to populate the correct fields in the organization detail pane
    document.getElementById("lower-box").classList.remove("hidden");
    document.getElementById("organization-name").innerHTML = org["Org Name"]
    document.getElementById("organization-address").innerHTML = org["Address"]
    document.getElementById("organization-section").innerHTML = org["Section"]
    document.getElementById("organization-description").innerHTML = org["Description & Hours"]
    document.getElementById("organization-phone").innerHTML = org["Phone Number"]

    // If the sidebar is currently collapsed, open it.
    if (document.querySelector('.sidebar').classList.contains("collapsed")) {
        toggleSidebar();
    }
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('collapsed');
    document.querySelector('.leaflet-left').classList.toggle('collapsed')
}

function searchOrganizations(search_string="") {
    console.log(search_string)
    search_string = document.getElementById("org-search").value
    searchMarkers.clearLayers();                

    var searchResultOrgs = orgs.filter(org => {                                         // Create a new filtered organization list for the search
        return Object.values(org).some(val => {                                         // Accept any org where the string value from any field
            return String(val).toLowerCase().includes(search_string.toLowerCase())      // Contains the search string
        })
    });

    searchResultOrgs.forEach(org => {                                           // Iterate over all accepted search results
        if (org.Coords && org.Coords.match('[0-9].*')) {                        // Where the org has valid coordinates
            searchMarkers.addLayer(org.marker)                                  // Add it to the searchMarkers list
        }
    });

    // Swap the active marker layers
    map.removeLayer(allMarkers);
    map.addLayer(searchMarkers);      

    // Build results list
    addOrgsToResultsPane(searchResultOrgs);
}

function addOrgsToResultsPane(searchResultOrgs) {
    var resultsParent = document.getElementById("search-results");
    resultsParent.replaceChildren()
    var resultsList = []
    searchResultOrgs.forEach(org => {
        var elem = document.createElement("div")
        elem.innerHTML = `<a href="#">` + org["Org Name"] + `</a>`
        elem.addEventListener("click", e => {
            loadSidebarOrgDetail(org);
            if (org.Coords && org.Coords.match('[0-9].*')) {
                console.log(org);
                map = map.setView([org["Lat"], org["Lng"]], 17)
            }
        })
        resultsParent.appendChild(elem);
    })


}

var previousZoom;

function onZoomStart() {
    previousZoom = map.getZoom();
}
function onZoomEnd() {
   
}



// Call the function to fetch and display data
document.addEventListener('DOMContentLoaded', function (event) {
    createMapContent().then((p) => {
        createClickEvents();
    })
});

// Set up click events
function createClickEvents() {
    document.getElementById("org-search").addEventListener("keypress", function (event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
            //Act as if the enter button was clicked
            document.getElementById("org-search-enter").click();
        }
    });
    document.getElementById("org-search-enter").addEventListener('click', e => searchOrganizations(document.getElementById("org-search").value))
}
