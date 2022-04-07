import {log} from '../logger'
import {deleteResource, uploadResource, uploadRdfToTripleStore, getAllGraphs, getAllDatasets} from '../functions'
import {createBucket} from 'mongoose-gridfs'
import {Readable} from 'stream'
import { v4 } from 'uuid'
// functionality for uploading new resource to the satellite
async function syncResourceAdd(req, res) {
    try {
        const session = req.session
        const url = await uploadResourceMongo(req.body.url, session)
    
        const uploaded = req.protocol + '://' + req.get('host') + req.originalUrl + `?url=${url}`   
        res.status(201).send(uploaded)
    } catch (error) {
        res.status(500).send(error)
    }
}

async function uploadResourceMongo(url, session): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            const mongoUrl = url
            const data = await session.fetch(url).then(res => res.arrayBuffer())
            const bucket = createBucket();
            const exists = await bucket.findOne({filename: mongoUrl})
            if (exists) {
              reject("resource already exists")
            } else {
            // const stream = bucket.createWriteStream({_id, filename: "test.gltf"})
            const readable = new Readable();
            readable._read = () => {}; // _read is required but you can noop it
            readable.push(Buffer.from(data)); 
            readable.push(null);
            await bucket.writeFile({ filename: mongoUrl }, readable);

            resolve(mongoUrl)
            }  
          } catch (error) {
            reject(error)
          }
    })
}


// functionality for deleting resource on the satellite
async function syncResourceDelete(req, res) {
    try {
        const { url } = req.query;
        const bucket = createBucket();
        const doc = await bucket.findOne({ filename: url });
        bucket.deleteFile(doc._id, (error, results) => {
          if (error) {
            throw error;
          }
          res.status(204).send();
        });
      } catch (error) {
        res.status(500).send(error.message);
      }
}

// functionality for updating resource on the satellite
async function syncResourceUpdate(req, res) {
    const {url} = req.body
    // await uploadRdfToTripleStore([url], {overwrite: true}, dataset, req.session)
    res.status(204).send()
}

async function getAllMirroredResources(req, res) {
    const datasets = await getAllDatasets().then(ds => ds.datasets.map(item => item["ds.name"].substring(1) ))
    const all = []
    for (const ds of datasets) {
        const items = await getAllGraphs(ds)
        all.push(items)
    }
    res.status(200).send(all.flat())
}

async function getDataset(req, res) {
    try {
        const { url } = req.query;
        const bucket = createBucket();
        const exists = await bucket.findOne({ filename: url })
        if (exists) {
            const readStream = bucket.createReadStream({ filename: url });
            readStream.pipe(res)
            readStream.on('end', () => res.end());
        } else {
            res.status(404).send()
        }
      } catch (error) {
        console.log(`error`, error);
        res.status(500).send(error.message);
      }
}

export {syncResourceAdd, syncResourceDelete, syncResourceUpdate, getDataset, getAllMirroredResources} 