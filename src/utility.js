const chunk = require('chunk-text');

//Returns string split into array in chunks of size length
function chunkSubstr(str, size) {
    const chunks = chunk(str, size, {});
    return chunks;
}

//Returns object in array based on header
function getItemInArray(array, header, item) {
    for (let i = 0; i < array.length; i++) {
        if (array[i][header] == item) {
            return array[i];
        }
    }
    return false
}

module.exports = { chunkSubstr, getItemInArray }