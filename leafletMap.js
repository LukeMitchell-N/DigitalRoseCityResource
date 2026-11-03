const spreadsheetId = '1dsL9BS4IJMr-5jYSyyS_bTYV82wVRCtZrzOZoJUXgpY';
const apiKey = 'AIzaSyAb5dMPDAJ19o2-gxbyzvb8ChewsG8JxzM';
const orgs = [], counties = [], sections = [];
let sidebar, userLocationMarker = null;
let orientation = "landscape";
let animating = false;      // Is sidebar actively expanding/collapsing
import {allMarkers, searchMarkers, createCustomCluster} from "./CustomClustering.js"      
import { icons } from "./icons/icons.js"


// #################################################  Map setup  ########################################################

//Setting up the map
async function createMap() {
    await fetchGoogleSheetData()

    map = L.map('myMap');                         
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_2jrm_1_0d44df88927d5e30fd03a99b', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
    }).addTo(map);                                                  // Load tile layer
    focusOnCoords(45.5215, -122.6682, 12);                          // Position map over Portland
    addOrgsToMap();                                                 // Load org info and add points on map
    searchOrganizations(orgs, "", false);                             // Search to show all orgs in sidebar
}

function addOrgsToMap() {
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

// ###################################################  Populate sidebar detail  ######################################################

// Fill in detail of sidebar dropdowns from the data loaded onto the map
function populateGenericDropdown(ID, list) {
    for (const i in list) {
        document.getElementById(ID).innerHTML +=
            `<li class="w-100">
                <input type="checkbox" class=" form-check-input dropdown-item btn-check w-100" id="${list[i]}" autocomplete="off">
                <label class="btn btn-secondary btn-outline-secondary w-100 rounded-0 dropdown-button" for="${list[i]}">${list[i]}</label>
            </li> `;
    }
}


// Set up click events for sidebar (html) buttons
function createSidebarClickEvents() {
    document.getElementById("org-search").addEventListener("keypress", function (event) {
        if (event.key === "Enter") {                                        // If the user presses "Enter" while in the search box
            document.getElementById("org-search-enter").click();                //Act as if the enter button was clicked
        }
    });

    // Add click handler for dynamic dropdown list elements
    document.body.addEventListener('click', (event) => {
        if (event.target.classList.contains('dropdown-button')) {           // Check if the clicked element has the specific class
            event.stopPropagation();                                            //Prevent other behavior
        }
    });

    document.getElementById("org-search-enter").addEventListener('click', e => filterAndSearchOrganizations())
    document.getElementById("org-search-clear").addEventListener('click', e => clearFilters())
    document.getElementById("sidebar-toggle").addEventListener('click', e => toggleSidebar())
}


// ###################################################  Create buttons  ######################################################

function addMapButtons() {
    var leafletTopLeft = document.querySelector(".leaflet-top.leaflet-left");
    leafletTopLeft.innerHTML += `<div class="leaflet-bar leaflet-control">
                                    <a id="locator-button">
                                        <span>
                                            <img src="./icons/locator.svg" style="width: 80%;">
                                        </span>
                                    </a>
                                </div>`
    document.getElementById("locator-button").addEventListener("click", locateUser)

    var leafletTopRight = document.querySelector(".leaflet-top.leaflet-right");
    leafletTopRight.innerHTML += `<div class="leaflet-bar leaflet-control">
                                    <a id="legend">
                                        <span>
                                            <img src="./icons/legend.svg" style="width: 70%;">
                                        </span>
                                    </a>
                                </div>`
    document.getElementById("legend").addEventListener("click", openLegend)
}

// ##################################################  Map functionality  ####################################################

function markerClick(e) {
    loadSidebarOrgDetail(e.target.Organization);
    focusOnCoords(e.target.Organization["Lat"], e.target.Organization["Lng"]);              // to do - add short wait so that coords center after sidebar done expanding
}

function loadSidebarOrgDetail(org) {
    // Grab relevant information from the target clicked marker
    // Use the org info to populate the correct fields in the organization detail pane
    if (getOrientation() == "portrait") {
        document.getElementById("sidebar-upper-box").classList.add("hidden");
    }
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

    sidebar.classList.toggle('collapsed');

    const controls = document.querySelector('.leaflet-control-container .leaflet-top.leaflet-left');
    controls.classList.toggle('collapsed');
}


function locateUser() {
    function onLocationFound(e) {
        if (userLocationMarker) {
            userLocationMarker.lat = e.latlng.lat;
            userLocationMarker.lng = e.latlng.lng;
        }
        else {
            userLocationMarker = L.marker(e.latlng);
            userLocationMarker.addTo(map)
        }     
        focusOnCoords(e.latlng.lat, e.latlng.lng, 17)
    }
    function onLocationError(e) {
        alert(e.message);
    }
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
    map.locate({ setView: false, flyTo: false});
}

var legendElement = document.createElement("a")
legendElement.innerHTML += `<div class="d-flex flex-column"></div>`


function openLegend() {
    var legend = document.getElementById("legend");
    var legendHtmlButton = legend.innerHTML
    console.log(legendHtmlButton)
    for (let orgType in icons) {
        console.log(orgType)
        var rowHTML = ` <div class="d-flex flex-row flex-shrink-0">
                            <a class="col-auto flex-auto">
                                <span>
                                    <img src=` + icons[orgType] + `>
                                </span>
                            </a>
                            <div class="col flex-grow-1">
                                 ` + orgType + `
                            </div>
                        </div>`
                   
        legendElement.innerHTML += rowHTML;
    }
    legend.innerHTML = legendElement.innerHTML
}

function filterAndSearchOrganizations() {
    const selectedSections = getDropdownSelection("resourceDropdown", sections);
    const selectedCounties = getDropdownSelection("countyDropdown", counties);

    const filteredOrganizations = applyOrganizationFilters(selectedCounties, selectedSections)
    searchOrganizations(filteredOrganizations, document.getElementById("org-search").value)
}

function clearFilters() {
    document.getElementById("org-search").value = "";                   //Clear search terms
    document.querySelectorAll(".btn-check:checked").forEach(            //Uncheck all checked menu items
        el => el.checked = false);
    searchOrganizations();                                              //Show all organizations by searching with no filter
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
    return filteredOrgs;
}

function searchOrganizations(filteredOrganizations = orgs, search_string="", moveMap=true) {
    search_string = document.getElementById("org-search").value
    searchMarkers.clearLayers();                

    var searchResultOrgs = filteredOrganizations.filter(org => {                        // Create a new filtered organization list for the search
        return Object.values(org).some(val => {                                         // Accept any org where the string value from any field
            return String(val).toLowerCase().includes(search_string.toLowerCase())      // Contains the search string
        })
    });

    searchResultOrgs.forEach(org => {                                           // Iterate over all accepted search results
        if (org.Coords && org.Coords.match('[0-9].*')) {                        // Where the org has valid coordinates
            searchMarkers.addLayer(org.Marker)                                  // Add it to the searchMarkers list
        }
    });

    map.removeLayer(allMarkers);                                                // Swap the active marker layers
    map.addLayer(searchMarkers);      
    addOrgsToResultsPane(searchResultOrgs);                                     // Build results list
    if (moveMap) {                                                              // If moving the map for this search
        map.fitBounds(searchMarkers.getBounds(), {                                  // Adjust map to show all results    
            paddingTopLeft: [sidebar.offsetWidth, 0],
            animate: true,
            duration: .25,
            easeLinearity: 0.5,
            noMoveStart: false
        })
    }
                                        
    document.getElementById("sidebar-lower-box").classList.add('hidden')        // Remove any previous entry in the organization detail pane
}

function addOrgsToResultsPane(searchResultOrgs) {
    var resultsParent = document.getElementById("search-results");
    resultsParent.replaceChildren()
    var resultsList = []
    searchResultOrgs.forEach(org => {
        var elem = document.createElement("div")
        elem.classList.add("search-result");
        elem.innerHTML = `<a href="#">` + org["Org Name"] + `</a>`
        elem.addEventListener("click", e => {                               // When search result org link clicked
            loadSidebarOrgDetail(org);                                          // Load it into the details pane
            if (org.Coords && org.Coords.match('[0-9].*')) {                    // If it has coordinates
                focusOnCoords(org["Lat"], org["Lng"], 17)                          // Move the map to focus on it
            }
        })
        resultsParent.appendChild(elem);
    })
    if (resultsParent.classList.contains("d-none")) {
        resultsParent.classList.toggle("d-none");
    }
}

function focusOnCoords(lat, lng, zoom = null) {
    if (!zoom) {
        zoom = map.getZoom();
    }
        
    let bounds = L.latLngBounds([lat, lng], [lat, lng])
    map = map.fitBounds(bounds,{                                // fitBounds rather than setView to allow for variable sidebar width
        maxZoom: zoom,
        paddingTopLeft: [sidebar.offsetWidth, 0],
        animate: true,
        duration: .25,
        easeLinearity: 0.5,
        noMoveStart: false
    });
}

// ###################################################  Add mobile compatibility  #####################################################
document.addEventListener('resize', e => getOrientation());

window.onresize = getOrientation;

function getOrientation() {
    const height = window.innerHeight;
    const width = window.innerWidth;

    if (width > height) {
        return "landscape";
    }
    else {
        return "portrait";
    }
}

// ###################################################  Build the page  #####################################################

// Call the function to fetch and display data
document.addEventListener('DOMContentLoaded', function (event) {
    sidebar = document.getElementById('sidebar');
    createMap().then((p) => {
        populateGenericDropdown("countyDropdown", counties);        // Fill in filter dropdowns with correct county and section info
        populateGenericDropdown("resourceDropdown", sections);
        createSidebarClickEvents();
        addMapButtons();
    })
});

