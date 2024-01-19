class Template {
    /** @var string */
    templateHTML;

    /** @var object */
    templateElements = {};

    /** @param {string} templateHTML
     * @param {object} dataset
     */
    constructor(templateHTML, dataset = null) {
        this.templateHTML = templateHTML;

        this.set = this.set.bind(this);
        this.setAssociativeArray = this.setAssociativeArray.bind(this);
        this.render = this.render.bind(this);
        this.render_outerHTML = this.render_outerHTML.bind(this);
        this.dumpElement = this.dumpElement.bind(this);

        if (dataset !== null)
            this.setAssociativeArray(dataset);
    }

    /**
     *
     * @param {string} name
     * @param {any} value
     */
    set(name, value) {
        let validValTypes = [
            "string",
            "boolean",
            "number",
            "undefined"
        ];
        try {
            if (typeof name !== "string")
                throw "TypeError: Parameter 1 (one) must be a string";

            if (validValTypes.indexOf(typeof value) === -1)
                throw "TypeError: Parameter 2 must be of type string, boolean, or number (passed type is " + typeof value + ")";

            this.templateElements[name] = value;
        } catch (e) {
            console.warn(e);
        }
    };

    /**
     *
     * @param {Object} elementSet
     */
    setAssociativeArray(elementSet) {
        try {
            if (typeof elementSet !== "object")
                throw "TypeError: Parameter 1 must be of type object";

            for (let name in elementSet) {
                if (!elementSet.hasOwnProperty(name))
                    continue;

                this.set(name, elementSet[name]);
            }
        } catch (e) {
            console.warn(e.getMessage());
        }
    };

    render(returnDOMFragment) {
        returnDOMFragment = returnDOMFragment || false;
        let renderedHTML = this.templateHTML.trim();

        for (let name in this.templateElements) {
            if (!this.templateElements.hasOwnProperty(name))
                continue;

            let pattern = new RegExp('\{' + name + '\}');
            while(pattern.test(renderedHTML))
                renderedHTML = renderedHTML.replace(pattern, this.templateElements[name]);
        }

        // clean up any un-replaced template fields
        //let pattern = new RegExp('\{.*?\}');
        //while(pattern.test(renderedHTML))
        //    renderedHTML = renderedHTML.replace(pattern, ``);

        if (returnDOMFragment) {
            let t = document.createElement("template");
            t.innerHTML = renderedHTML;
            return t.content.firstChild;
        } else {
            return renderedHTML;
        }
    };
    render_outerHTML(){
        let renderedHTML = this.templateHTML.trim();

        for (let name in this.templateElements) {
            if (!this.templateElements.hasOwnProperty(name))
                continue;

            let pattern = new RegExp('\{' + name + '\}');
            renderedHTML = renderedHTML.replace(pattern, this.templateElements[name]);
        }

        let t = document.createElement("template");
        t.innerHTML = renderedHTML;
        return t.content.children;
    }

    dumpElement() {
        for (let name in this.templateElements) {
            if (!this.templateElements.hasOwnProperty(name))
                continue;

            console.log(name + " => " + this.templateElements[name]);
        }
    };


    /**
     *
     * @param templateHTML
     * @param returnDOMFragment
     * @param {Object|false} dataset
     * @returns {Node|ChildNode|HTMLElement|string}
     */
    static render_immediate = (templateHTML, dataset = {}, returnDOMFragment = true) => {
        if (templateHTML)
            templateHTML = templateHTML.trim();

        let template = new Template(templateHTML);
        if (dataset !== false)
            template.setAssociativeArray(dataset);

        return template.render(returnDOMFragment);
    };
    static createElement = (templateHTML) => {
        templateHTML = templateHTML.trim();
        return Template.render_immediate(templateHTML, true)
    };
}
