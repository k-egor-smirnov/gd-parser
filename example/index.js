const fs = require('fs')
const gdParser = require('../index')

gdParser.readFromFile('./78.mrg')
    .then(result => {
        fs.writeFile('./output.json', JSON.stringify(result), err => {
            if (err) console.log(err)
        })
    })
