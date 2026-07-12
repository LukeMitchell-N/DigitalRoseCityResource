const spreadsheetId = '1dsL9BS4IJMr-5jYSyyS_bTYV82wVRCtZrzOZoJUXgpY';
const apiKey = 'AIzaSyAb5dMPDAJ19o2-gxbyzvb8ChewsG8JxzM';
//const sheetNames = ['Multnomah County', 'Clackamas County', 'Washington County'];
const orgs =[], counties = [], sections = [];
import {allMarkers, searchMarkers, createCustomCluster} from "./CustomClustering.js"      
import { icons } from "./icons/icons.js"

//Setting up the map
async function createMapContent() {
    await fetchGoogleSheetData()
    createMap();
    addOrgsToMap();
        //createLegend();
    map.on('zoomend', onZoomEnd);
                //return later - then necessary?
    console.log("finished with createmapcontent")
    console.log("counties is ", counties)
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
            org.Lat = parseFloat(org.Coords.split(',')[0])
            org.Lng = parseFloat(org.Coords.split(',')[1])
            marker["Organization"] = org;
            marker.on('click', markerClick)
            allMarkers.addLayer(marker);
        };
        org.Marker = marker;

        if (org.Section && org.Section.length > 0 &&                // If the organization type is not empty or null
            sections.includes(org.Section) == false) {              // And if it hasn't been recorded previously
            sections.push(org.Section)                                  // Add it to the list of sections
        }
    };
    allMarkers.addTo(map);
    console.log(counties);
    console.log(sections);
}
//Get the names of each sheet
//This is also the list of counties needed for the county filtering
async function getSheetNames(spreadsheetId, apiKey) {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.sheets.map(sheet => sheet.properties.title);
    }
    catch (error){
        console.error('Error fetching Google Sheets names:', error);
        throw ('Error fetching Google Sheets names:', error)
    }  
}

//Getting data from Google Sheets
async function fetchSingleSheet(sheet) {
    try {
        let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheet}?key=${apiKey}`;
        // Fetch data from Google Sheets API
        const response = await fetch(url);
        const data = await response.json();

        // Extract rows from the data
        return data.values || [];

    } catch (error) {
        console.error('Error fetching Google Sheets data:', error);
        throw ('Error fetching Google Sheets data:', error)
    }
}

async function fetchGoogleSheetData() { 
    const sheetNames = await getSheetNames(spreadsheetId, apiKey)               // Get the names of all sheets in the spreadsheet
    for (const sheet of sheetNames) {                                           // Iterate over the sheet names
        if (sheet.toLowerCase().includes("county")) {                           // If the sheet name refers to data for a county (not sections or some ancillary table)
            counties.push(sheet.slice(0, -7))                                   // Cut last 7 characters " Counties" and add to counties list
            try {
                const rows = await fetchSingleSheet(sheet)                          // Pull the rows from the given sheet                
                if (rows != null) {                                      
                    orgs.push(...rowsToObjects(rows, sheet.slice(0, -7)));          // Transform the raw rows to objects with named properties                         
                }
            } catch (error) {
                console.error('Error fetching Google Sheets data:', error);
            }
        }
    };
}

const rowsToObjects = (rows, sheet) => {
    const fieldNames = rows[0];
    const dataRows = rows.slice(1);

    return dataRows.map((row) => {                                              // Create a new array for rows
        const obj = row.reduce((accumulator, currentVal, index) => {                // Function to build up an object for each row
            accumulator[fieldNames[index]] = currentVal;
            return accumulator;
        }, {});
        obj.County = sheet;                                                     // Add the county as a new property
        return obj;
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
    focusOnCoords(e.target.Organization["Lat"], e.target.Organization["Lng"]);
}

function loadSidebarOrgDetail(org) {
    // Grab relevant information from the target clicked marker
    // Use the org info to populate the correct fields in the organization detail pane
    document.getElementById("sidebar-lower-box").classList.remove("hidden");
    document.getElementById("organization-name").innerHTML = org["Org Name"]
    document.getElementById("organization-address").innerHTML = org["Address"]
    document.getElementById("organization-section").innerHTML = org["Section"]
    document.getElementById("organization-description").innerHTML = org["Description & Hours"]
    document.getElementById("organization-phone").innerHTML = org["Phone Number"]

    // If the sidebar is currently collapsed, open it.
    if (document.querySelector('#sidebar').classList.contains("collapsed")) {
        toggleSidebar();
    }
}

function toggleSidebar() {
    document.querySelector('#sidebar').classList.toggle('collapsed');
}

function filterAndSearchOrganizations() {
    const selectedSections = getDropdownSelection("resourceDropdown", sections);
    const selectedCounties = getDropdownSelection("countyDropdown", counties);

    const filteredOrganizations = applyOrganizationFilters(selectedCounties, selectedSections)
    searchOrganizations(filteredOrganizations, document.getElementById("org-search").value)
}

function getDropdownSelection(dropdownID, list) {
    const searchString = "#" + dropdownID + " .btn-check:checked";

    const selection = []
    document.querySelectorAll(searchString).forEach(
        el => selection.push(el.id));
    return selection
}

function applyOrganizationFilters(selectedCounties, selectedSections) {
    var filteredOrgs = orgs;
    console.log("selectedCounties is " + selectedCounties)
    if (selectedCounties != null && selectedCounties.length != 0) {
        filteredOrgs = filteredOrgs.filter(org => {
            return selectedCounties.includes(org.County)
        })
    }
    if (selectedSections != null && selectedSections.length != 0) {
        filteredOrgs = filteredOrgs.filter(org => {
            return selectedSections.includes(org.Section)
        })
    }
    console.log("size of filtered records: " + filteredOrgs.length)
    return filteredOrgs;
}

function searchOrganizations(filteredOrganizations = orgs, search_string="") {
    console.log(search_string)
    search_string = document.getElementById("org-search").value
    searchMarkers.clearLayers();                

    var searchResultOrgs = filteredOrganizations.filter(org => {                                         // Create a new filtered organization list for the search
        return Object.values(org).some(val => {                                         // Accept any org where the string value from any field
            return String(val).toLowerCase().includes(search_string.toLowerCase())      // Contains the search string
        })
    });

    searchResultOrgs.forEach(org => {                                           // Iterate over all accepted search results
        if (org.Coords && org.Coords.match('[0-9].*')) {                        // Where the org has valid coordinates
            searchMarkers.addLayer(org.Marker)                                  // Add it to the searchMarkers list
        }
    });

    // Swap the active marker layers
    map.removeLayer(allMarkers);
    map.addLayer(searchMarkers);      

    // Build results list
    addOrgsToResultsPane(searchResultOrgs);

    // Pan/zoom to show all results
    map.fitBounds(searchMarkers.getBounds())

    // Remove any previous entry in the organization detail pane
    document.getElementById("sidebar-lower-box").classList.add('hidden')
}

function addOrgsToResultsPane(searchResultOrgs) {
    var resultsParent = document.getElementById("search-results");
    resultsParent.replaceChildren()
    var resultsList = []
    searchResultOrgs.forEach(org => {
        var elem = document.createElement("div")
        elem.innerHTML = `<a href="#">` + org["Org Name"] + `</a>`
        elem.addEventListener("click", e => {                               // When search result org link clicked
            loadSidebarOrgDetail(org);                                      // Load it into the details pane
            if (org.Coords && org.Coords.match('[0-9].*')) {                // If it has coordinates
                focusOnCoords(org["Lat"], org["Lng"], 17)                          // Move the map to focus on it
            }
        })
        resultsParent.appendChild(elem);
    })


}

function focusOnCoords(lat, lng, zoom = null) {
    if (zoom) {
        map = map.flyTo([lat, lng], zoom,
            {
                animate: true,
                duration: 1,
                easeLinearity: 0.5,
                noMoveStart: false
            }
        );
    }
    else {
        map = map.setView([lat, lng], map.getZoom(), {
            pan: {
                animate: true,
                duration: .25,
                easeLinearity: 0.5,
                noMoveStart: false
            },
            zoom: {
                animate: true,
                duration: .25,
                easeLinearity: 0.5,
                noMoveStart: false
            }
        });
    }
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
        populateDropdowns();
    })
});


function populateGenericDropdown(ID, list) {
    for (const i in list) {
        document.getElementById(ID).innerHTML +=
            `<li class="w-100">
                <input type="checkbox" class=" form-check-input dropdown-item btn-check w-100" id="${list[i]}" autocomplete="off">
                <label class="btn btn-outline-secondary w-100 rounded-0 dropdown-button" for="${list[i]}">${list[i]}</label>
            </li> `;
    }
}

// Fill in filter dropdowns with correct county and section info
function populateDropdowns() {
    populateGenericDropdown("countyDropdown", counties);
    populateGenericDropdown("resourceDropdown", sections);
}

// Set up click events
function createClickEvents() {
    document.getElementById("org-search").addEventListener("keypress", function (event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
            //Act as if the enter button was clicked
            document.getElementById("org-search-enter").click();
        }
    });

    // Add click handler for dynamic dropdown list elements
    document.body.addEventListener('click', (event) => {
        // Check if the clicked element has the specific class
        if (event.target.classList.contains('dropdown-button')) {;
            event.stopPropagation();
        }
    });

    document.getElementById("org-search-enter").addEventListener('click', e => filterAndSearchOrganizations())
}
