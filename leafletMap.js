import { icons } from "./icons/icons.js"
let map;
const spreadsheetId = '1dsL9BS4IJMr-5jYSyyS_bTYV82wVRCtZrzOZoJUXgpY';
const apiKey = 'AIzaSyAb5dMPDAJ19o2-gxbyzvb8ChewsG8JxzM';
const sheetNames = ['Multnomah County', 'Clackamas County', 'Washington County'];
let orgs = [];

// Loop through each cell in the row and create a table cell for each
//Object.keys(rowObjects[i]).forEach(key => {
//    const cellElement = document.createElement('td');
//    cellElement.textContent = key +": "+ rowObjects[i][key];
//    row.appendChild(cellElement);
//});

// Map rows to objects
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
    for (const sheet of sheetNames){
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

function createMap() {
    map = L.map('myMap').setView([45.5152, -122.6784], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

function addOrgsToMap() {
    //console.log(typeof orgs)
    //console.log(orgs)
    for (const org of orgs) {
        console.log(org)
        if (org.Coords != "N/A") {
            let iconName = org['Section']
            if (!(org['Section'] in icons)) { iconName = 'Undefined' }

            console.log("Attemtping to add " + org['Section'])
            L.marker(org.Coords.split(','),
                {icon: L.icon({ iconUrl: icons[iconName] }) }
            ).addTo(map)
        };
    };
}

async function createMapContent() {
    fetchGoogleSheetData().then(() => {
        createMap();
        addOrgsToMap();
    }); 
}

// Call the function to fetch and display data
document.addEventListener('DOMContentLoaded', createMapContent);
