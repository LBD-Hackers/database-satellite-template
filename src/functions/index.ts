const FormData = require('form-data')
const {v4} = require('uuid')
const {log} = require('../logger')
const fetch = require('node-fetch')

// send a SPARQL update to the SPARQL store
async function updateSparql(query, dataset) {
    var urlencoded = new URLSearchParams();
    urlencoded.append("update", query);

    var requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + Buffer.from(process.env.SPARQL_STORE_USERNAME + ":" + process.env.SPARQL_STORE_PW).toString("base64")
        },
        body: urlencoded,
    };

    let response = await fetch(
        process.env.SPARQL_STORE_ENDPOINT + "/" + dataset,
        requestOptions
    );
    const text = await response.text();
    return text;
}

// get all graphs available in the SPARQL store
async function getAllGraphs(dataset) {
    const graphsInStore = await querySparql(
        `SELECT DISTINCT ?g WHERE {GRAPH ?g {?s ?p ?o}}`,
        dataset
    );
    return graphsInStore.results.bindings.map((b) => b.g.value);
}

async function getAllDatasets() {
    const url = `${process.env.SPARQL_STORE_ENDPOINT}/$/datasets`
    const auth = 'Basic ' + Buffer.from(process.env.SPARQL_STORE_USERNAME + ":" + process.env.SPARQL_STORE_PW).toString('base64')
    var requestOptions = {
        method: 'GET',
        headers: {
            "Authorization": auth
        },
      };

    const datasets = await fetch(url, requestOptions).then(res => res.json())
    return datasets 
}

// delete a resource in the SPARQL store
async function deleteResource(resource, dataset) {
    const query = `CLEAR GRAPH <${resource}>`;
    await updateSparql(query, dataset);
}

// upload a resource to the SPARQL store
async function uploadResource(data, graph, dataset, extension) {
    var formdata = new FormData();
    if (data.buffer) {
        formdata.append("file", data.buffer, data.originalname);
    } else {
        formdata.append(
            "file",
            Buffer.from(JSON.stringify(data)),
            `${v4()}.${extension}`
        );
    }
    var requestOptions = {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Connection": "keep-alive"
        },
        body: formdata,
    };

    let url = process.env.SPARQL_STORE_ENDPOINT + "/" + dataset;
    if (graph) url = url + `?graph=${graph}`;

    try {
        const response = await fetch(url, requestOptions);
        return response.status;
    } catch (error) {
        log.error(`error`, error);
    }
    return;
}

// upload a list of resources, filter RDF resources, check if they already exist on the triple store and if not, upload to the SPARQL store
async function uploadRdfToTripleStore(sync, options, dataset, session) {
    try {
        for (const resource of sync) {
            let exists;
            if (!options.overwrite) {
                exists = await checkExistenceInTripleStore(resource, dataset);
            }
            if (options.overwrite || !exists) {
                const data = await session.fetch(resource, {
                    headers: { Accept: "application/ld+json" },
                });
                // content types to sync
                if (data.status === 200) {
                    await deleteResource(resource, dataset);
                    const text = await data.json();
                    await uploadResource(text, resource, dataset, "jsonld");
                    log.info(`Mirrored <${resource}>`)
                }
            } else {
                log.info(`<${resource}> already exists.`)
            }
        }
    } catch (error) {
        log.error(`error`, error);
    }
}

// check the existence of a named graph in the SPARQL store
async function checkExistenceInTripleStore(named, dataset) {
    const result = await querySparql(
        `ASK WHERE { GRAPH <${named}> { ?s ?p ?o } }`,
        dataset
    );
    return result.boolean;
}

// perform a SPARQL query on the SPARQL store
async function querySparql(query, dataset) {
    var requestOptions = {
        method: "POST",
        headers: {
            "Accept": "application/sparql-results+json",
            "Authorization":  "Basic " + Buffer.from(process.env.SPARQL_STORE_USERNAME + ":" + process.env.SPARQL_STORE_PW).toString("base64")
        },
    };

    let url =
        process.env.SPARQL_STORE_ENDPOINT + "/" +
        dataset +
        "?query=" +
        encodeURI(query);
    url = url.replace(/#/g, "%23"); //you'll have to replace hash (replaceAll does not work here?)
    try {
        const res = await fetch(url, requestOptions);
        if (res.status === 200) {
            const results = await res.json();
            return results;
        } else {
            return { results: { bindings: [] } }
        }
    } catch (error) {
        log.error(`error`, error)
        return { results: { bindings: [] } }
    }
}

async function createRepository(name) {
    const auth = 'Basic ' + Buffer.from(process.env.SPARQL_STORE_USERNAME + ":" + process.env.SPARQL_STORE_PW).toString('base64')
    
    var requestOptions = {
      method: 'POST',
      headers: {
          "Authorization": auth
      },
    };
    
    fetch(`${process.env.SPARQL_STORE_ENDPOINT}/$/datasets?dbName=${name}&dbType=tdb2`, requestOptions)
      .then(response => response.text())
      .then(result => log.info(result))
      .catch(error => log.error('error', error));

    return
}

export {querySparql, checkExistenceInTripleStore, uploadRdfToTripleStore, updateSparql, uploadResource, deleteResource, getAllGraphs, createRepository, getAllDatasets}