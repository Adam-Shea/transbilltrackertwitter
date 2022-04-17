import {
    legiScanSearchBill,
    legiScanSearchQuery,
    legiScanGetBill,
} from '../src/legiscan';

test('Correct useage of function legiScanSearchBill', async () => {
    expect((await legiScanSearchBill('AK', 'SB140')).statusText)
        .toStrictEqual("OK");
});

test('Correct useage of function legiScanSearchQuery', async () => {
    expect((await legiScanSearchQuery('3',
        'all',
        "action:day AND ('transgender' OR ('biological' AND 'sex'))")).statusText)
        .toStrictEqual("OK");
});

test('Correct useage of function legiScanSearchQuery', async () => {
    expect((await legiScanGetBill(1558474)).title)
        .toStrictEqual("Public schools; restrooms; reasonable accommodations");
});