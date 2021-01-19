const express = require('express');
const multer = require('multer');
const app = express();
const port = 3000;
const fs = require('fs')

const upload = multer();

//Poppler pdftotext conversion
const { Poppler } = require('node-poppler');

const poppler = new Poppler();

app.get('/document/:id', (req, res) => {
  //Search if document exists
  retrieveData(req.params.id, function response_doc(response) {
    if (response == null) {
      res.send("Document ID does not exist")
    }
    else {
      res.send(response)
    }
  });
});

app.post('/upload', upload.single('file'), (req, res, next) => {

  //PDF document and user email supplied through user
  const user = req.body.email
  const file = req.body.file

  //Parse pdf file to txt
  if (fs.existsSync(file)) {
    var object = {}
    poppler.pdfToText(file).then((val) => {
      var data = parseDocument(file, val, user);
      storeData(data, function (response) {
        object['id'] = response.toString()
        res.send(JSON.stringify(object))
      })
    })
  }
  else {
    res.send("File does not exist")
  }
})

//This retrieves data from the JSON file containing invoice information
function retrieveData(id, callback) {
  //Check if json document exists
  if (fs.existsSync('data.json')) {
    fs.readFile('data.json', function (err, res) {
      if (err) return console.log(err)

      var json_data = JSON.parse(res)
      for (var i in json_data) {
        if (i == id) {
          return callback(json_data[id])
        }
      }
      return callback(null)
    })
  }
  else {
    return callback(null)
  }
}

//This function will check if a JSON document exists and appends or will create a new JSON document
function storeData(data, callback) {

  //Check if JSON document already exists
  if (fs.existsSync('data.json')) {
    fs.readFile('data.json', function (err, res) {
      if (err) return console.log(err)

      var json_data = JSON.parse(res)
      //Iterate to find the last ID in the JSON document
      for (var i in json_data) var latestID = parseInt(i) + 1

      //Append new json data to existing data
      json_data[latestID] = data
      fs.writeFile("data.json", JSON.stringify(json_data), function (err) {
        if (err) return console.log(err)
        return callback(latestID)
      })
    })
  }
  else {
    //There is no JSON document, so a new one will be created and appended to
    var obj = {}
    obj['1'] = data
    fs.writeFile('data.json', JSON.stringify(obj), 'utf8', function (err) {
      if (err) throw err;
      return callback('1')
    })
  }
}

//This function will parse the text result and place information into a JSON Object
function parseDocument(file, text, user) {

  var fileData = fs.statSync(file)
  var data = {};
  var foundDate = false

  data['uploadedBy'] = user
  data['uploadTimestamp'] = new Date(Date.now()).toISOString().split('T')[0]
  data['size'] = fileData.size
  data['total'] = null
  data['totalDue'] = null
  data['currency'] = null
  data['taxAmount'] = null
  data['vendorName'] = null
  data['invoiceDate'] = null
  data['processingStatus'] = "Submitted"

  //Iterate array and match data to keys
  var arr = text.split("\r\n")
  for (var i = 0; i <= arr.length; i++) {

    //This checks if its a possible date. The flag is there as it confuses invoice date with next invoice due date
    if (!isNaN(new Date(Date.parse(arr[i]))) && Date.parse(arr[i]) > 0) {
      if (!foundDate) {
        data['vendorName'] = arr[i + 2]
        data['invoiceDate'] = new Date(Date.parse(arr[i])).toISOString().split('T')[0]
        foundDate = true
      }
    }
    if (arr[i] == 'CAD' || arr[i] == 'USD' || arr[i] == 'GBP') {
      data['currency'] = arr[i]
    }
    else if (arr[i] == 'Total') {
      data['total'] = parseFloat(arr[i + 2].substring(1)).toFixed(2)
    }
    else if (arr[i] == 'Total Due') {
      data['totalDue'] = parseFloat(arr[i + 2].substring(1)).toFixed(2)
    }
    else if (arr[i] == 'Tax 0%' || arr[i] == 'GST 13%') {
      data['taxAmount'] = parseFloat(arr[i + 2].substring(1)).toFixed(2)
    }
  }
  return data
}

const server = app.listen(port, () => console.log(`Hubdoc Intake listening on port ${port}!`))

module.exports = {
  app,
  server
};
