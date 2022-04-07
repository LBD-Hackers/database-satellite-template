import express from 'express'
import {log} from './logger'
import cors from 'cors'
import {setSatellite, extractWebId} from "express-solid-auth-wrapper"
import {syncResourceAdd, syncResourceDelete, syncResourceUpdate, getDataset, getAllMirroredResources} from "./controller"
import { connect } from './functions/storageLogic'

const port = process.env.PORT_DOCSTORE_SATELLITE
const creds = JSON.parse(process.env.CREDENTIALS)

const app = express();
app.use(cors())
app.use(express.json());

// // set satellite authenticated session as req.session
app.use(setSatellite(creds))

// extract client webId, if exists: req.auth.webId (req.auth.clientId)
app.use(extractWebId)

// the satellite is notified of a new resource on the Pod
app.post("/", syncResourceAdd)

// the satellite is notified that a resource has been removed from the Pod
app.delete("/", syncResourceDelete)

// the satellite is notified a resource on the Pod has been updated
app.patch("/", syncResourceUpdate)

// get a list of all mirrored resources
app.get('/all', getAllMirroredResources)

// dataset retrieval logic
app.get("/", getDataset)

app.listen(port, async () => {
    log.info(`Server listening at http://localhost:${port}`);
    connect()
})
