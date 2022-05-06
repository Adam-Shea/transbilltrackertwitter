"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utility_1 = require("../src/utility");
test('Correct useage of function chunkSubstr', function () {
    expect((0, utility_1.chunkSubstr)("Test String", 5)).toStrictEqual(["Test ...", "Strin...", "g..."]);
});
test('Correct useage of function getItemInArray', function () {
    expect((0, utility_1.getItemInArray)([
        { id: 100, name: 'name' },
        { id: 101, name: 'name' },
    ], 'id', 100)).toStrictEqual({ id: 100, name: 'name' });
});
test('Tests invalid item', function () {
    expect((0, utility_1.getItemInArray)([
        { id: 100, name: 'name' },
        { id: 101, name: 'name' },
    ], 'id', 2)).toBe(false);
});
test('Testing invalid header', function () {
    expect((0, utility_1.getItemInArray)([
        { id: 100, name: 'name' },
        { id: 101, name: 'name' },
    ], 'test', 100)).toBe(false);
});
