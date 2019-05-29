console.log('imis')

var token = '[INSERT TOKEN HERE]'
$.ajax({
    url: 'https://services.iaapa.org/Asi.Scheduler_IAAPA_Prod_Imis/api/IQA?QueryName=$/IAAPA_Globe/IAAPA_Globe',
    type: 'GET',
    beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    },
    error: function(e) {
        console.error(e)
    },
    success: function(response) {
        console.log(response)
    }
})