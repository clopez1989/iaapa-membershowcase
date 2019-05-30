const https = require('https')
    ,chalk = require('chalk')
    ,_ = require('lodash')
    ,fs = require('fs')
    ,mbxClient = require('@mapbox/mapbox-sdk')
    ,mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding')

const MAPBOX_TOKEN = "pk.eyJ1IjoiY2dsb3BlejE5ODkiLCJhIjoiY2pzbHdpeDY1MXdqYjQ5cDZ0am8zcWVvaCJ9.T58s8aUnx0yhcjyNTQ3fEA"

const baseClient = mbxClient({accessToken: MAPBOX_TOKEN })
const geocodingService = mbxGeocoding(baseClient)

const version = "v0.0.1"

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

// todo: get token dynamically instead of relying on environment variable
var token = process.env.IAAPA_TOKEN

getToken()
getMembers()

function getToken() {
    if (token == undefined || token == "") {
        console.error(`${chalk.red('✗')}    IAAPA_TOKEN environment variable not set!`)
    } else {
        console.error(`${chalk.green('✓')}    IAAPA_TOKEN environment variable loaded`)
    }
}

function getMembers() {

    // reserve memory for data
    var chunks = []

    // this seems to be the max defined by IMIS
    var queryLimit = 500
    var queryName = '$/IAAPA_Globe/IAAPA_Globe'

    // make request
    const req = https.request(
        // options
        {
            hostname: 'services.iaapa.org',
            port: 443,
            method: 'GET',
            path: `/Asi.Scheduler_IAAPA_Prod_Imis/api/IQA?QueryName=${queryName}&Limit=${queryLimit}`,
            headers: { 'Authorization': 'Bearer ' + token }
        },
        // response
        (res) => {

            if (res.statusCode != 200) {
                console.error(`${chalk.red('✗')}    statusCode ${res.statusCode}`)
            }
            res.on('data', (d) => {
                chunks.push(d)
            })
            res.on('end', () => {
                
                // combine data into a single string
                var body = Buffer.concat(chunks).toString()

                // convert to JSON
                var membersJSON = JSON.parse(body)

                // todo: continue requesting until membersJSON.HasNext == false
                console.log(`parsing members ${membersJSON.Offset + membersJSON.Count} / ${membersJSON.TotalCount}`)
                
                // parse the JSON
                parseMembers(membersJSON)
            })
    })

    // handle error
    req.on('error', (error) => {
        console.error(`${chalk.red('✗')}    ${error}`)
    })

    req.end()
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

    // todo: geocode each member
    geocodingService.forwardGeocode({
        query: 'Paris, France',
        limit: 1
    })
        .send()
        .then(response => {
            console.log(response.body)
        })


    // todo: write final geocoded results to file
    
}

