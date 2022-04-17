//Returns string split into array in chunks of size length
export function chunkSubstr(str: string, size: number) {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size) + '...';
    }

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
