class MediaWikiAPI {
    static WIKI_URL = "https://starcitizen.tools";
    static API_URL= `${MediaWikiAPI.WIKI_URL}/api.php`;
    static RESULTS = {};


    static prepare(props) {
        let params = {
            origin: "*",
            action: MediaWikiAPI_Action.QUERY,
            format: "json"
        };
        if (props)
            Object.keys(props).forEach(key => params[key] = props[key]);

        return params;
    }

    /**
     * @async
     * @param {object}  props           specific properties for the query to be run
     * @param {string}  referenceKey    the the key of response.query to reference when pulling results
     * @returns {Promise<MediaWikiAPI_Result[]>}
     */
    static async query(props, referenceKey) {
        // prepare the request parameters
        let params = MediaWikiAPI.prepare(props);
        let url = `${MediaWikiAPI.API_URL}?${Object.keys(params).map(key => `${key}=${params[key]}`).join("&")}`;

        return await fetch(url)
            .then(async response => {
                return response.json();
            })
            .then(async response => {
                if (typeof response.query !== "undefined") {
                    let myResult = response.query[referenceKey] ?? [];

                    if (typeof response.continue === "undefined")
                        return myResult;
                    else {
                        const key = Object.keys(response.continue)[0];
                        params[key] = response.continue[key];
                        params['continue'] = response.continue.continue;


                        let results = await MediaWikiAPI.query(params, referenceKey);
                        if (Array.isArray(results))
                            return [...(Array.isArray(myResult) ? myResult : [myResult]), ...results];

                        return [myResult, results];
                    }
                } else {
                    params._ref = referenceKey;
                    params.response = response;
                    console.log(params);
                }

                return [];
            })
            .catch(function(error){
                console.log(error);
                return [];
            });
    }

    /**
     *
     * @param {int} pageid
     * @param {MediaWikiAPI_Result[]} results
     * @param {string} referenceKey
     * @returns {{pageid}}
     */
    static union_results(pageid, results, referenceKey) {
        let _results = {};
        _results = {};
        _results = {
            pageid: pageid
        }
        _results[referenceKey] = [];

        const isObject = results !== null  && !Array.isArray(results) && typeof results === "object" && typeof results[referenceKey] === "undefined";
        const isArray = Array.isArray(results);

        switch (true) {
            case isArray:
                results.forEach(result_item => {
                    let keys = Object.keys(result_item);
                    while(keys.length > 0) {
                        const key = keys.shift();
                        const subitem = result_item[key];
                        if (typeof subitem[referenceKey] !== "undefined")
                            _results[referenceKey] = [..._results[referenceKey], ...subitem[referenceKey]];
                    }
                });
                break;

            case isObject:
                let keys = Object.keys(results);
                while(keys.length > 0) {
                    const key = keys.shift();
                    const result_item = results[key];
                    if (typeof result_item[referenceKey] === "undefined")
                        continue;

                    _results[referenceKey] = [..._results[referenceKey], ...result_item[referenceKey]];
                }
                break;

            default:
                console.log(results);
                if (typeof results[pageid] !== "undefined" && typeof results[pageid][referenceKey] !== "undefined")
                    _results[referenceKey] = results[pageid][referenceKey];

        }

        return _results;
    }


    static log_query(results, input_element) {
        console.log(results);

        input_element.innerHTML = "";
        results.map(item => {
            let option = document.createElement("option");
            option.value = item.title;
            option.innerText = item.title.split(":")[1] ?? "Unk";
            input_element.appendChild(option);
        });
    }
}

/** @typedef MediaWikiAPI_Result
 * @type object
 * @property {int}      pageid          MediaWiki pageid for the result
 * @property {string}   title           MediaWiki title for the result
 * @property {object}   imageinfo       MediaWiki imageinfo data
 * @property {array}    categorymembers results of a category member query
 * @property {array}    pages           results of a search across multiple pages
 * @property {array}    images          results of a search for images
 */
