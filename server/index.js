const https = require('https')

var token = '[INSERT TOKEN HERE]'

const options = {
    hostname: 'services.iaapa.org',
    port: 443,
    method: 'GET',
    path: '/Asi.Scheduler_IAAPA_Prod_Imis/api/IQA?QueryName=$/IAAPA_Globe/IAAPA_Globe',
    headers: {
        'Authorization': 'Bearer ' + token
    }
}

const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`)
    res.on('data', (d) => {
        process.stdout.write(d)
    })
})

req.on('error', (error) => {
    console.error(error)
})

req.end()