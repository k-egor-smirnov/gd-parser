const fs = require('fs')
const gdParser = require('gravity-parser')

gdParser('./78.mrg')
    .then(result => {
        fs.writeFile('./output.json', JSON.stringify(result), err => {
            if (err) console.log(err)
        })
    })
