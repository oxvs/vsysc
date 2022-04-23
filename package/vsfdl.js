window.vsfdl = window.vsfdl || null // global vsfdl object

const _regex = /^\s*(?<IDENTIFIER>.*?)\s*:\s*(?<NAME>.*?)\s*:\s*(?<CONTENT>.*?)$/gmi// regex for matching a vsfdl line
const _commands = {
    "nm": "string",
    "ar": "array",
    "ad": "string",
    "rm": "string",
    "wl": "string", // write line
    "im": "string['vsdfl.file']", // should start the file
    "ex": "string['all']", // should end the file
    "dc": "string", // should be a variable declaration
}

// main
const vsfdl = {} // vsdfl object
let variables = {}

/**
 * @function vsfdl.regmatch
 * @description Match RegExp groups
 * 
 * @param {string} str 
 * @param {RegExp} regex 
 * @returns {Promise} Matches list
 * 
 * @since 1.0.0
 */
vsfdl.regmatch = (str, regex) => {
    return new Promise((resolve, reject) => {
        let m
        let matches = [""]

        while ((m = regex.exec(str)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++
            }
            m.forEach((match, groupIndex) => {
                if (groupIndex !== 0) {
                    matches.push(match)
                }
            })
        }

        if (matches.length > 0) {
            resolve(matches)
        }
    })
}

/**
 * @function vsfdl.parseToJSON
 * @description parses a vsfdl string to a JSON object
 *
 * @param {string} vsfdlString - the vsfdl string
 * @returns {object} - the parsed vsfdl object
 * 
 * @since 1.0.0
 */
vsfdl.parseToJSON = function (vsfdlString) {
    const object = {
        name: "",
        content: {},
    }

    const lines = vsfdlString.split('\n')
    let line = ''

    for (let i = 0; i < lines.length; i++) {
        line = lines[i].trim()

        if (line.length > 2) {
            vsfdl.regmatch(line, _regex).then(matches => {
                const identifier = matches[1]
                const name = matches[2].toString().toLowerCase()
                const content = matches[3]
    
                const type = _commands[name]
    
                // if something in the content exists in variables, replace it
                if (content.includes('$')) {
                    content = content.replace(/\$([a-zA-Z0-9_]+)/gmi, (match, variable) => {
                        return variables[variable]
                    })
                }
    
                // push to object.content if it does not exist and has the type "string"
                if (!object.content[identifier.toString()] && type === "string" && name !== "nm") {
                    if (!parseFloat(identifier)) {
                        return console.error(`${identifier} is not a number`)
                    }
    
                    object.content[identifier.toString()] = content.toString()
                } else if (!object.content[identifier.toString()] && type === "array") {
                    object.content[identifier.toString()] = [content.toString()]
                } else {
                    if (name === "dc") {
                        variables[identifier.toString()] = content.toString()
                    } else if (name === "nm") {
                        object.name = content.toString()
                    }
                }
            })
        } else {
            continue
        }
    }

    console.log(object)
    return object
}

// assign vsfdl object to global vsfdl object
window.vsfdl = vsfdl