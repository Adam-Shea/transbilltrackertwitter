const fastChunkString = require('fast-chunk-string');

//Returns string split into array in chunks of size length
export function chunkSubstr(str: string, size: number) {
    const chunks = fastChunkString(str, { size: size, unicodeAware: true });
    return chunks;
}

//Returns object in array based on header
export function getItemInArray(array: any[], header: string, item: any) {
    for (let i = 0; i < array.length; i++) {
        if (array[i][header] == item) {
            return array[i];
        }
    }
    return false
}
