# IAAPA Member Showcase
This codebase contains both the server and the client for hosting the IAAPA Member Showcase microsite.

## Server
The server downloads IAAPA members from IMIS (services.iaapa.org) and exports them to a geojson file with coordinate info.
### How to run
First, edit the **.env** file inside of **iaapa-membershowcase/server** folder, replacing the iMIS API Token and MapBox API Token accordingly.

```bash
IAAPA_TOKEN=[INSERT TOKEN HERE]
MAPBOX_TOKEN=[INSERT TOKEN HERE]
```

Then, within the **iaapa-membershowcase/server** folder, run the following commands
```bash
npm install
node index.js
```
### What it does
The IAAPA Member Showcase Server performs the following tasks:
#### 1. Download member info from iMIS API
The server relies on an environment variable **IAAPA_TOKEN** to be pre-defined, and uses that token to communicate with the API. Once connected to the API, the server will download all the records it can find by accessing the **HasNext** property of each API response.
#### 2. Simplify the format
The server then takes the following raw format:

```json
{
    "$type": "Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts",
    "EntityTypeName": "48",
    "PrimaryParentEntityTypeName": "Party",
    "PrimaryParentIdentity": {
        "$type": "Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts",
        "EntityTypeName": "Party",
        "IdentityElements": {
            "$type": "System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib",
            "$values": [
                "363593"
            ]
        }
    },
    "Properties": {
        "$type": "Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts",
        "$values": [
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "ResultRow",
                "Value": "1"
            },
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "ID",
                "Value": "363593"
            },
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Company_Name",
                "Value": " fecMUSIC"
            },
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Address1",
                "Value": "787 Adelaide St., North"
            },
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Address2",
                "Value": "Suite 2"
            },
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Address3",
                "Value": ""
            },
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "City",
                "Value": "London"
            },
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "StateProvince",
                "Value": "ON"
            },
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Country",
                "Value": "Canada"
            },
            {
                "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
                "Name": "Zip",
                "Value": "N5Y 2L8"
            }
        ]
    }
}
```
And converts it into the following simplified format:

```json
{
    "id": "363593",
    "name": "fecMUSIC",
    "address": "787 Adelaide St., North Suite 2 , London, ON, N5Y 2L8, Canada"
}
```
After all members have been processed like this, the resulta are cached to a local file **members.json** so that we don't have to contact the iMIS API again until the cache "expires" (as defined in code, currently set to 1 week).
#### 3. Geocode all members via MapBox API
Now that there is a clean list of **members.json**, the server parses each item and goes a forward geocoding lookup on each address. If a match is found, the coordinates are stored in memory.
#### 4. Create geojson file from geocode results
With the successfully geocoded results in memory, these converted into [geojson](https://geojson.org/) format and saved to a file **members.geojson**
## Client
This is the html/css/js that gets built and used as the microsite
### How to test
Then, within the **iaapa-membershowcase** root, run the following commands
```bash
npm install
npm run test
```
### How to build
This does the same as the test command, but only builds the files and does not start a test server at localhost
```bash
npm install
npm run build
```
### What it does
Produces static html/css/js files in the "dist" folder via webpack