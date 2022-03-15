import express from 'express'
import {log} from './logger'
import cors from 'cors'
import creds from "../credentials"
import {setSatellite, extractWebId} from "express-solid-auth-wrapper"
import {syncResourceAdd, syncResourceDelete, syncResourceUpdate} from "./controller"
const port = process.env.PORT

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

app.listen(port, async () => {
    log.info(`Server listening at http://localhost:${port}`);
})
