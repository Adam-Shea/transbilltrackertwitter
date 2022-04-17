export function chunkSubstr(str: string, size: number) {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size) + '...';
    }

    return chunks;
}

export function getItemInArray(array: any[], header: string, item: any) {
    //Has bill already been tweeted?
    for (let i = 0; i < array.length; i++) {
        if (array[i][header] == item) {
            return array[i];
        }
    }
}