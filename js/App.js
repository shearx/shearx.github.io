class App {
    static IMAGE_PLACEHOLDER_URL = 'https://media.starcitizen.tools/9/93/Placeholderv2.png';

    static IMAGE_BLACKLIST = [
        "File:RSIsite.svg",
        "File:RSItm.svg",
        "File:WikimediaUI-Globe.svg",
        "File:PHnav.svg",
        "File:WikimediaUI-ArticleDisambiguation-ltr.svg"
    ];
    static clear_results() {
        const results_table = document.querySelector(`#page-results #results-body`);
        if (results_table)
            results_table.innerHTML = "";
    }

    /**
     *
     * @param {string}  categoryName    MediaWiki Category name
     * @param {*}       results         Array of results from MediaWikiAPI.query()
     * @returns {Promise<void>}
     */
    static async append_results(categoryName, results) {
        const results_body = document.querySelector(`#page-results #results-body`);

        if (results.length > 0) {
            while(results.length > 0) {
                const item = results.shift();

                const pageid = item.pageid;
                const title = item.title;

                /** @type HTMLDivElement */
                const row = Template.render_immediate(`
                    <div class="page-row" data-page="{pageid}" data-category="{categoryName}">
                        <div></div>
                        <div>
                            <div class="item-image">
                                <img src="" alt="{title}" loading="lazy">
                            </div>
                        </div>
                        <div>
                            <div><a href="{page_link}" title="Link to {title} on StarCitizen.tools" target="_blank">{title}</a></div>
                        </div>
                        <div>
                            <div><a href="{category_link}" title="Link to {categoryName_safe} on StarCitizen.tools" target="_blank">{categoryName_safe}</a></div>
                        </div>
                    </div>`, {
                    pageid: pageid,
                    page_link: encodeURI(`${MediaWikiAPI.WIKI_URL}/${title}`),
                    category_link: encodeURI(`${MediaWikiAPI.WIKI_URL}/${categoryName}`),
                    categoryName: categoryName,
                    title: title,
                    categoryName_safe: categoryName.replace(/^(category(:)?)/i, '')
                }, true);
                results_body.appendChild(row);

                App.load_images(pageid, row);
            }
        }
    }

    /**
     * @param {int} pageid
     * @param {HTMLDivElement} row
     */
    static async load_images(pageid, row){
        const imageEl = row.querySelector(`img`);

        // query the wiki for images related to this pageid
        let images = await MediaWikiAPI.query({
            pageids: pageid,
            prop: MediaWikiAPI_Props.IMAGES,
        }, "pages");
        let _images = MediaWikiAPI.union_results(pageid, images, MediaWikiAPI_Props.IMAGES);

        // process images returned from query and add them to the row
        for(let i = 0; i < _images.images.length; i++) {
            // get image properties for this image, then query the wiki for more info about it, including its real URL
            let image_props = _images.images[i];

            let image_info = await MediaWikiAPI.query({
                prop: MediaWikiAPI_Props.IMAGE_INFO,
                iiprop: `${MediaWikiAPI_IIProps.URL}|${MediaWikiAPI_IIProps.DIMENSIONS}`,
                titles: image_props.title
            }, "pages");
            image_info = MediaWikiAPI.union_results(pageid, image_info, MediaWikiAPI_Props.IMAGE_INFO);

            // now, the results of the above query may refer to multiple different pages that are not the one we're starting from
            // to compensate, we'll add each one to the row's images
            // for debugging, only the first image is used
            let done = false;
            let index = 0;

            let members = image_info[MediaWikiAPI_Props.IMAGE_INFO];
            i = members.length;
            while(members.length > 0) {
                let image_props = members.shift();
                console.log(image_props);

                const url = image_props.url;
                if (url) {

                    let blacklisted = false;
                    // check if this image is blacklisted
                    for(let k = 0; k < App.IMAGE_BLACKLIST.length; k++) {
                        const blacklisted_file = App.IMAGE_BLACKLIST[k].split(":")[1];

                        const regex = new RegExp(`(${blacklisted_file})`);
                        if (regex.test(url))
                            blacklisted = true;
                    }
                    if (!blacklisted) {
                        imageEl.src = url;
                        imageEl.dataset['done'] = "";

                        let width = image_props.width;
                        let height = image_props.height;
                        if (height > width)
                            imageEl.classList.add("portrait")

                        return;
                    }
                }
            }

            // if we got here, there were no valid images found; so let's add a placeholder instead
            imageEl.src = App.IMAGE_PLACEHOLDER_URL;
            imageEl.dataset['done'] = "";
        }
    }

    static async get_category_items(buttonElement) {
        console.log("get_category_items");

        buttonElement.disabled = true;

        App.clear_results();

        const category_input = document.body.querySelector("[name='q_category']");
        let results = {};

        // housekeeping
        switch(true) {
            case !category_input:
                throw "Missing category input element";
        }
        let category = category_input.value;
        if (!category)
            return;

        // query the wiki for categories linked to this one
        let subcategories = await App.query_subcategories(category);
        App.process_subcategories(results, subcategories);
        buttonElement.disabled = false;
    }

    /**
     *
     * @param {string} category
     * @returns {Promise<MediaWikiAPI_Result[]>}
     */
    static async query_subcategories(category) {

        const subcategory_input = document.body.querySelector("[name='q_subcategory']");
        // housekeeping
        switch(true) {
            case !subcategory_input:
                throw "Missing subcategory input element";
        }

        let subcategories = await MediaWikiAPI.query({
            list: MediaWikiAPI_List.CATEGORY_MEMBERS,
            cmtitle: category,
            cmtype: MediaWikiAPI_Types.SUBCATEGORY
        }, MediaWikiAPI_List.CATEGORY_MEMBERS);

        // create subcategory options
        App.prepare_subcategories(subcategory_input, subcategories);

        return subcategories;
    }
    static prepare_subcategories(subcategory_input, subcategories) {
        // clear subcategory control as they will change with the new category
        subcategory_input.innerHTML = "";
        subcategory_input.appendChild(Template.render_immediate(`
            <option>Select a Sub-Category...</option>
        `))

        for(let i = 0; i < subcategories.length; i++) {
            const subcategory = subcategories[i];
            const subcategory_name = subcategory.title.split(":")[1];
            subcategory_input.appendChild(Template.render_immediate(`
                <option value="{value}">{text}</option>
            `, {
                value: subcategory.title,
                text: subcategory_name
            }));
        }
    }
    static async process_subcategories(results, subcategories) {
        for(let i = 0; i < subcategories.length; i++) {
            const subcategory = subcategories[i];
            const subcategory_name = subcategory.title.split(":")[1];
            let items = await this.get_subcategory_items(null, subcategory.title, false);

            results[subcategory.title] = items;
            App.append_results(subcategory.title, items);
        }
    }
    static async get_subcategory_items(buttonElement = null, subcategory = null, shouldClearResults = true) {
        if (buttonElement)
            buttonElement.disabled = true;
        const subcategory_input = document.body.querySelector("[name='q_subcategory']");

        switch(true) {
            case !subcategory_input:
                throw "Missing result element";
        }
        subcategory = subcategory ?? subcategory_input.value;

        let results = await MediaWikiAPI.query({
            list: MediaWikiAPI_List.CATEGORY_MEMBERS,
            cmtitle: subcategory ?? subcategory_input.value,
            cmtype: MediaWikiAPI_Types.PAGE,
        }, MediaWikiAPI_List.CATEGORY_MEMBERS);

        if (shouldClearResults)
            App.clear_results();

        App.append_results(subcategory, results);

        if (buttonElement)
            buttonElement.disabled = false;


        return results;
    }
    static async get_page_images(item_props) {

    }
}