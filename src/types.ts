export type watchListSheet = {
    legiscan_id: string;
    bill_id: string;
    category: string;
    description: string;
    link: string;
};

export type legislatureSheet = {
    State: string;
    House: string;
    Senate: string;
    Governor: string;
    'Representative Contact Link': string;
};

export type dataStore = {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    historyCount: string;
};

export type bill = {
    bill_id: string,
    bill_number: string,
    state: string;
    state_link: string;
    status: number;
    title: string;
    category: string;
    description: string;
    history: [{
        chamber: string;
    }];
    sponsors: [
        {
            role: string;
            first_name: string;
            last_name: string;
            party: string;
        }
    ];
    votes: [{
        yea: number;
        nay: number;
        absent: number;
    }];
};

export type legiScanSearchResult = {
    data: {
        searchresult: [
            {
                bill_id: string;
                relevance: number
            }
        ]
    }
}