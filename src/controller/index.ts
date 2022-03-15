import {log} from '../logger'

async function syncResourceAdd(req, res) {
    const {url} = req.body
    // functionality for uploading new resource to the satellite
    res.status(201).send()
}

async function syncResourceDelete(req, res) {
    const {url} = req.body

    // functionality for deleting resource on the satellite
    res.status(204).send()
}

async function syncResourceUpdate(req, res) {
    const {url} = req.body

    // functionality for updating resource on the satellite
    res.status(204).send()
}

async function queryDatabase(req, res) {
    res.status(200).send()
}

async function getDataset(req, res) {
    res.status(200).send()
}

export {syncResourceAdd, syncResourceDelete, syncResourceUpdate, queryDatabase, getDataset}