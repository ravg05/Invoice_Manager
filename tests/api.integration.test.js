const supertest = require('supertest');

describe('API Tests', () => {
  let server;
  let request;
  before(() => {
    const api = require('../index');
    server = api.server;
    request = supertest(api.app);
  });

  after(() => {
    server.close();
  });

  it('Retrieve document ID: 500', async () => {
    await request.get('/document/500')
      .expect("Document ID does not exist");
  });
  it('Retrieve document ID: 1', async () =>{
    await request.get('/document/1')
    .expect({"uploadedBy":"user@domain.com","uploadTimestamp":"2020-11-16","size":25670,"total":"22.50","totalDue":"0.00","currency":"GBP","taxAmount":"0.00","vendorName":"UK Company","invoiceDate":"2019-02-22","processingStatus":"Submitted"})
  });
  it('Uploading file that does not exist', async () => {
    await request.post('/Upload') 
    .field("file","invoices/HubdocInvoice123.pdf")
    .field("email","user@domain.com")
    .expect("File does not exist");
  });
  it('Upload file and receive id', async () => {
    await request.post('/Upload')
    .field("file","invoices/HubdocInvoice1.pdf")
    .field("email","user@domain.com")
    .expect('Content-Type', 'text/html; charset=utf-8')
  });

});