const https = require('https')
    ,chalk = require('chalk')
    ,_ = require('lodash')
    ,fs = require('fs')
    ,mbxClient = require('@mapbox/mapbox-sdk')
    ,mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding')
    ,pLimit = require('p-limit')

// todo: get token dynamically instead of relying on environment variable
require('dotenv').config()
const IAPPA_TOKEN = process.env.IAAPA_TOKEN
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN

const baseClient = mbxClient({accessToken: MAPBOX_TOKEN })
const geocodingService = mbxGeocoding(baseClient)

const version = "v0.0.1"
const expirationHours = 24 * 7 // week

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
                                                                server ${version}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ${chalk.yellow('★')}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

var done = (function wait () { if (!done) setTimeout(wait, 1000) })();

getTokens()

// check for members.json, and timestamp before loading from API
if (fs.existsSync('./members.json')) {

    // is it recent?
    var mtime = fs.statSync('./members.json').mtime
    var hoursSinceModified = (new Date() - mtime) / (1000 * 60 * 60)
    
    if (hoursSinceModified > expirationHours) {
        console.log(`${chalk.blue('ⓘ')}    members.json is ${hoursSinceModified} hours old, getting a new one now...`)
        downloadMembers()
    } else {
        console.log(`${chalk.green('✓')}    members.json is only ${hoursSinceModified} hours old, so using that`)

        geocodeMembers(JSON.parse(fs.readFileSync('./members.json')))
    }
} else {
    console.log(`${chalk.red('✗')}    members.json not found, generating now...`)
    downloadMembers()
}

function downloadMembers() {

    new Promise((resolve, reject) => {
        getMembers(0, 500, [], resolve, reject)
    })
    .then(response => {
        fs.writeFileSync('members.json', JSON.stringify(response))
        geocodeMembers(response)
    })
}

function geocodeMembers(members) {
    
    // grab a small sample size for testing
    var members = _.sampleSize(members, 200)

    const limit = pLimit(1)
    var input = []
    
    _.map(members, member => {
        input.push(limit(() => {
            return new Promise((resolve, reject) => {
                geocodingService.forwardGeocode({
                    query: member.address,
                    limit: 1
                })
                .send()
                .then(response => {
                    try {

                    var features =  _.find(response.body.features, { 'type': 'Feature' })
                    var coordinates = features.geometry.coordinates
                    console.log(`${chalk.green('✓')}    ${member.name} (${member.id}): ${features.place_name} (${coordinates})`)
                    member.coordinates = coordinates
                    
                    } catch (err) {
                        console.error(`${chalk.red('✗')}    ${member.name} (${member.id}): location not found`)
                        //reject(`could not geocode ${member.name} (${member.id}): ${member.address}`)
                    }

                    resolve(member)
                })
                .catch(err => {
                    console.error(`${chalk.red('✗')}    ${member.name} (${member.id}): ${err.message}`)
                    resolve(member)
                })
            })
        }))
    })

    async function asyncGeocode() {
        const result = await Promise.all(input)
            .then(data => {

                // filter out data without coordinates
                var geocodedMembers = _.filter(data, 'coordinates')

                // convert to geojson
                var geoJSON = {
                    type: 'FeatureCollection',
                    crs: {
                        type: 'name',
                        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
                    },
                    features: _.map(geocodedMembers, member => {
                        return {
                            "type": "Feature",
                            "geometry": {
                                "type": "Point",
                                "coordinates": member.coordinates
                            },
                            "properties": {
                                "name": member.name,
                                "id": member.id
                            }
                        }
                    })
                }

                // save geojson file
                fs.writeFileSync('members.geojson', JSON.stringify(geoJSON))

                done = true
            })
            .catch(err => {
                //done = true
            })
    }

    asyncGeocode()
}

function getTokens() {
    if (IAPPA_TOKEN == undefined || IAPPA_TOKEN == "") {
        console.error(`${chalk.red('✗')}    IAAPA_TOKEN environment variable not set!`)
    } else {
        console.error(`${chalk.green('✓')}    IAAPA_TOKEN environment variable loaded`)
    }

    if (MAPBOX_TOKEN == undefined || MAPBOX_TOKEN == "") {
        console.error(`${chalk.red('✗')}    MAPBOX_TOKEN environment variable not set!`)
    } else {
        console.error(`${chalk.green('✓')}    MAPBOX_TOKEN environment variable loaded`)
    }
}

function getMembersPage(pageIndex=0, pageSize=500) {

    return new Promise((resolve, reject) => {
        // reserve memory for data
        var chunks = []
        var queryName = '$/IAAPA_Globe/IAAPA_Globe'

        // make request
        const req = https.request(
            // options
            {
                hostname: 'services.iaapa.org',
                port: 443,
                method: 'GET',
                path: `/Asi.Scheduler_IAAPA_Prod_Imis/api/IQA?QueryName=${queryName}&Limit=${pageSize}&Offset=${pageIndex * pageSize}`,
                headers: { 'Authorization': 'Bearer ' + IAPPA_TOKEN }
            },
            // response
            (res) => {

                if (res.statusCode != 200) {
                    console.error(`${chalk.red('✗')}    statusCode ${res.statusCode}`)
                    reject(res.toString())
                    done = true
                }
                res.on('data', (d) => {
                    chunks.push(d)
                })
                res.on('end', () => {
                    
                    // combine data into a single string
                    var body = Buffer.concat(chunks).toString()

                    // convert to JSON
                    var membersJSON = JSON.parse(body)

                    resolve(membersJSON)
                })
        })

        // handle error
        req.on('error', (error) => {
            console.error(`${chalk.red('✗')}    ${error}`)
            reject(error)
        })

        req.end()
    })
}

function getMembers(pageIndex, pageSize=500, membersArray, resolve, reject) {
    getMembersPage(pageIndex, pageSize)
        .then(membersJSON => {
            console.log(`${chalk.blue('⇩')}    getting members ${membersJSON.Offset}-${membersJSON.Offset + membersJSON.Count} / ${membersJSON.TotalCount}`)
            const retrievedMembers = membersArray.concat(parseMembers(membersJSON))
            if (membersJSON.HasNext) {
                getMembers(pageIndex+1, pageSize, retrievedMembers, resolve, reject)
            } else {
                resolve(retrievedMembers)
            }
        })
}

function parseMembers(membersJSON) {
    
    members = _.map(membersJSON.Items.$values, (member) => {
        var memberInfo = member.Properties.$values
        var companyID = _.trim(_.find(memberInfo, { "Name": "ID" }).Value)
        var companyName = _.trim(_.find(memberInfo, { "Name": "Company_Name" }).Value)
        var companyAddress1 = _.trim(_.find(memberInfo, { "Name": "Address1" }).Value)
        var companyAddress2 = _.trim(_.find(memberInfo, { "Name": "Address2" }).Value)
        var companyAddress3 = _.trim(_.find(memberInfo, { "Name": "Address3" }).Value)
        var companyCity = _.trim(_.find(memberInfo, { "Name": "City" }).Value)
        var companyState = _.trim(_.find(memberInfo, { "Name": "StateProvince" }).Value)
        var companyCountry = _.trim(_.find(memberInfo, { "Name": "Country" }).Value)
        var companyZip = _.trim(_.find(memberInfo, { "Name": "Zip" }).Value)
        return {
            id: companyID,
            name: companyName,
            // todo: validate address, build with more context about country, missing fields, etc.
            address: `${companyAddress1} ${companyAddress2} ${companyAddress3}, ${companyCity}, ${companyState}, ${companyZip}, ${companyCountry}`,
        }
    })

    return members
    
}

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});