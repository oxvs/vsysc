/*
 * ----------- vsystem container language -----------
 * description: vsystem container language (vsysc) is a simple assembly language that can be used to control systems on https://vsys.oxvs.net.
 * These systems a quick and simple language that can be used to control the system. Instructions in vsysc are executed line by line.
 * All reserved names should be only 2 characters long, but it is not required.
 * 
 * Reserved names:
 * - nm: name
 * - dc: data (variables)
 * - wl: write line
 * - ar: create array
 * - ad: add to array
 * - rm: remove from array
 * - im: import a file and run it (basically using functions), an imported file will have access to 000 variables, which are supplied parameters
 * - ex: export a file, should be used when you want the file to be imported by another file as a function
 * 
 * Syntax:
 * (int): (string): (string)
 * ex: (0: NM: testName)
 * 
 * Variables can be referenced by using the $ sign.
 * ex: (
 *     0: DC: testVariable
 *     1: WL: $0
 * )
 * 
 * Arrays can be created by using the ar command. Adding to an array uses the same identifier as the array.
 * ex: (
 *     0: AR: testArray
 *     0: AD: $0, "test"
 *     0: AD: $0, "test2"
 * )
 */

window.vsysc = window.vsysc || null // global vsysc object

const _regex = /^\s*(?<IDENTIFIER>.*?)\s*:\s*(?<NAME>.*?)\s*:\s*(?<CONTENT>.*?)$/gmi// regex for matching a vsysc line
const _commands = {
    "nm": "string",
    "ar": "array",
    "ad": "array",
    "rm": "array",
    "wl": "string", // write line
    "im": "string['vsysc.file']", // should start the file
    "ex": "string['all']", // should end the file
    "dc": "string", // should be a variable declaration
}

// main
const vsysc = {} // vsdfl object
vsysc.customKeywords = {} // each must be a function that returns a promise, these will be pointed to whenever the keyword comes up
vsysc.files = [] // all loaded files
vsysc.globalVariables = []

/**
 * @function vsysc.regmatch
 * @description Match RegExp groups
 * 
 * @param {string} str 
 * @param {RegExp} regex 
 * @returns {Promise} Matches list
 * 
 * @since 1.0.0
 */
vsysc.regmatch = (str, regex) => {
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
 * @function vsysc.parseToJSON
 * @description Parses a vsysc string to a JSON object
 *
 * @param {string} vsyscString - The vsysc string
 * @param {Array} parameterStore - The parameter store, defaults to vsysc.globalVariables
 * @returns {Promise<object>} - A promise containing the JSON object
 * 
 * @since 1.0.0
 */
vsysc.parseToJSON = function (vsyscString, variableStore = vsysc.globalVariables) {
    return new Promise((resolve, reject) => {
        const object = {
            name: "",
            content: {},
        }

        const lines = vsyscString.split('\n')
        let line = ''

        for (let i = 0; i < lines.length; i++) {
            line = lines[i].trim()

            if (line.length > 2) {
                vsysc.regmatch(line, _regex).then(matches => {
                    if (matches.length < 3) {
                        // we're missing part of the line
                        return object.content[i + 1] = { 
                            type: "error", 
                            value: `Invalid syntax (line:${i + 1})`, 
                            keyword: "none" 
                        }
                    }

                    const identifier = matches[1]
                    const name = matches[2].toString().toLowerCase()
                    let content = matches[3]

                    const type = _commands[name]

                    // if something in the content exists in variables, replace it
                    if (content.includes('$')) {
                        content = content.replace(/\$([a-zA-Z0-9_]+)/gmi, (match, variable) => {
                            if (!variableStore[variable]) {
                                object.content[i + 1] = { 
                                    type: "error", 
                                    value: `Unknown variable (line:${i + 1})`, 
                                    keyword: "none" 
                                }

                                return match
                            }

                            return variableStore[variable.toString()]
                        })
                    }

                    // push to object.content if it does not exist and has the type "string"
                    if (!object.content[identifier.toString()] && type === "string" && name !== "nm" && name !== "dc") {
                        if (!parseFloat(identifier)) {
                            reject(`${identifier} is not a number`)
                        }

                        object.content[identifier.toString()] = {
                            type: type,
                            value: content,
                            keyword: name,
                        }
                    } else if (/* !object.content[identifier.toString()] && */ type === "array") { // do not check if it already exists for arrays
                        if (name === "ar") {
                            object.content[identifier.toString()] = {
                                type: type,
                                value: [content.toString()],
                                keyword: name,
                            }
                        } else if (name === "ad") {
                            if (!object.content[identifier.toString()]) {
                                object.content[identifier.toString()] = { 
                                    type: "error", 
                                    value: `Array '${identifier}' does not exist, failed to add '${content.toString()}'`, 
                                    keyword: name 
                                }
                            } else {
                                // adding to an array uses the same identifier as the array
                                object.content[identifier.toString()].value.push(content.toString())
                            }

                        }
                    } else {
                        // if it is a special value handle it, otherwise reject
                        if (name === "dc") {
                            variableStore[identifier.toString()] = content.toString()
                        } else if (name === "nm") {
                            object.name = content.toString()
                        } else if (!vsysc.customKeywords[name]) { // it doesn't exist in normal keywords, and it is not a custom keyword
                            // instead of rejecting, just add it to object.content as an error
                            if (name !== "ex" && name !== "im") {
                                object.content[identifier.toString()] = { 
                                    type: "error", 
                                    value: `Unknown keyword '${name}' (line:${i + 1})`, 
                                    keyword: name 
                                }
                            }
                        }
                    }
                })
            } else {
                continue
            }
        }

        resolve(object)
    })
}

/**
 * @function vsysc.newKeyword
 * @description Adds a new keyword to the vsysc object
 * 
 * @param {string | Array} name - The name of the keyword, or an array of each keyword individually using JSON
 * @param {function} func - The function to run when the keyword is called
 * @returns {Promise} - A promise that resolves when the keyword is added
 */
vsysc.newKeyword = function (name, func) {
    return new Promise((resolve, reject) => {
        if (typeof name === "string") {
            if (typeof func !== "function") {
                reject("func must be a function")
            }

            vsysc.customKeywords[name] = func
            resolve()
        } else if (Array.isArray(name)) {
            // use each object in the array as { name: string, func: function }
            name.forEach(keyword => {
                if (typeof keyword.name !== "string") {
                    reject("name must be a string")
                }

                if (typeof keyword.func !== "function") {
                    reject("func must be a function")
                }

                vsysc.customKeywords[keyword.name] = keyword.func
            })

            resolve()
        }
    })
}

/**
 * @function vsysc.stringToVSYSC
 * @description Converts a string to a vsysc object
 * 
 * @param {string} string 
 * @param {string} name 
 * @returns {Promise<object>} Object containing the vsysc JSON
 */
vsysc.stringToVSYSC = function (string, name) {
    return new Promise((resolve, reject) => {
        // add every line to str variable: "\n#: WL: ${line}"
        let str = '0: NM: ' + name + '\n'
        const lines = string.split('\n')
        for (let i = 0; i < lines.length; i++) {
            str += `\n${i + 1}: WL: ${lines[i]}`
        }

        // get object
        vsysc.parseToJSON(str).then((data) => {
            resolve(data)
        }).catch((err) => reject(err))
    })
}

/**
 * @function vsysc.parse
 * @description Parses a vsysc file
 * 
 * @param {string} content - The string to parse
 * 
 * @returns {Promise<Array} - A promise containing the result of all expressions
 */
vsysc.parse = function (content) {
    return new Promise((resolve, reject) => {
        vsysc.parseToJSON(content).then((data) => {
            const result = []
            const content = data.content
            for (const key in content) {
                if (content.hasOwnProperty(key)) {
                    const element = content[key]
                    
                    if (element.type === "string") {
                        result.push(element.value)
                    } else if (element.type === "array") {
                        result.push(element.value)
                    } else if (element.type === "error") {
                        reject(`Execution error: ${element.value}`)
                    } else if (element.name === "im") {
                        const file = vsync.files[element.value.split(/,\s*/g)[0]]
                        if (file) { // file name is the first element in ", "
                            let str = ""
                            // for each element after element.value.split(/,\s*/g)[0], add "000{i}: DC: {element}\n" to str
                            for (let i = 1; i < element.value.split(/,\s*/g).length; i++) {
                                str += `\n000${i}: DC: ${element.value.split(/,\s*/g)[i]}` // add parameters by creating variables in the file
                            }

                            // get object
                            str += file // add the file to the string
                            vsysc.parseToJSON(str, [] /* file will have its own variable store */).then((data) => {
                                vsysc.parse(data).then((data) => {
                                    result.push(data)
                                })
                            })
                        }
                    } else if (element.name === "ex") {
                        if (element.value === "default") {
                            // export whole file
                            if (vsysc.files[element.value]) {
                                reject(`File '${element.value}' already exists`)
                            } else {
                                vsysc.files[element.value] = content // add the file to the file store
                                result = [content] // overwrite result with the file
                            }
                        } else {
                            // export expression
                            result = [element.value]
                        }
                    } else {
                        const func = vsysc.customKeywords[element.keyword]
                        if (func) {
                            func(element.value).then((res) => {
                                result.push(res)
                            }).catch((err) => reject(err))
                        } else {
                            reject(`Execution error: ${element.value}`)
                        }
                    }
                }
            }

            resolve(result)
        }).catch((err) => reject(err))
    })
}

// assign vsysc object to global vsysc object
window.vsysc = vsysc