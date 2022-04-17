import { chunkSubstr, getItemInArray } from '../src/utility';

test('Correct useage of function chunkSubstr', () => {
    expect(
        chunkSubstr("Test String", 5)
    ).toStrictEqual(["Test ...", "Strin...", "g..."]);
});

test('Correct useage of function getItemInArray', () => {
    expect(
        getItemInArray(
            [
                { id: 100, name: 'name' },
                { id: 101, name: 'name' },
            ],
            'id',
            100,
        ),
    ).toStrictEqual({ id: 100, name: 'name' });
});

test('Tests invalid item', () => {
    expect(
        getItemInArray(
            [
                { id: 100, name: 'name' },
                { id: 101, name: 'name' },
            ],
            'id',
            2,
        ),
    ).toBe(false);
});

test('Testing invalid header', () => {
    expect(
        getItemInArray(
            [
                { id: 100, name: 'name' },
                { id: 101, name: 'name' },
            ],
            'test',
            100,
        ),
    ).toBe(false);
});