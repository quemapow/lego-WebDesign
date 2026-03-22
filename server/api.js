import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

<<<<<<< HEAD
// We load json files as data source
import SALES from "./sources/vinted.json" with { type: "json" };
=======
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

>>>>>>> fbb68ff (docs(api): create the workhop 4 about api with express)

const PORT = 8092;

const app = express();

<<<<<<< HEAD
=======
// We load json files as data source
let SALES = {};

>>>>>>> fbb68ff (docs(api): create the workhop 4 about api with express)
app.use(bodyParser.json());
app.use(cors());
app.use(helmet());
app.use(cors())

app.get('/', (request, response) => {
  response.send({'ack': true});
});

app.get('/sales/search', (request, response) => {
  response.setHeader('Access-Control-Allow-Credentials', true)
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  try {
    const { legoSetId } = request.query;
    const result = SALES[legoSetId] || []

    return response.status(200).json({
      'success': true,
      'data': {'result': result}
    });
  } catch (error) {
    console.log(error);
    return response.status(404).send({
      'success': false,
      'data': {'result': []}
    });
  }
});


<<<<<<< HEAD
app.listen(PORT)
=======
app.listen(PORT, () => {
  // when we start the server we load available json files
  try {
    SALES = JSON.parse(
      readFileSync(path.join(__dirname, 'sources', 'vinted.json'), 'utf8')
    );
  } catch (error) {
    console.warn(`⚠️  ${error}`);
  }
})
>>>>>>> fbb68ff (docs(api): create the workhop 4 about api with express)

console.log(`📡 Running on port ${PORT}`);
