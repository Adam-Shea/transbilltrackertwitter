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
    bill_id: string;
    bill_number: string;
    state: string;
    state_link: string;
    status: number;
    title: string;
    category: string;
    description: string;
    state_id: number;
    bill_type: string;
    bill_type_id: string;
    body: string;
    body_id: number;
    current_body: string;
    current_body_id: number;
    pending_committee_id: number;
    progress: [
        {
            date: string;
            event: number;
        },
    ];
    session: {
        session_id: number;
        state_id: number;
        year_start: number;
        year_end: number;
        prefile: number;
        sine_die: number;
        prior: number;
        special: number;
        session_tag: string;
        session_title: string;
        session_name: string;
    };
    committee: {
        committee_id: number;
        chamber: string;
        chamber_id: number;
        name: string;
    };
    referrals: [{
        date: string;
        committee_id: number;
        chamber: string;
        chamber_id: number;
        name: string;
    }]
    history: [
        {
            date: string;
            action: string;
            chamber: string;
            chamber_id: number;
            importance: number;
        },
    ];
    sponsors: [
        {
            people_id: number;
            person_hash: string;
            party_id: string;
            state_id: number;
            party: string;
            role_id: number;
            role: string;
            name: string;
            first_name: string;
            middle_name: string;
            last_name: string;
            suffix: string;
            nickname: string;
            district: string;
            ftm_eid: number;
            votesmart_id: number;
            opensecrets_id: string;
            knowwho_pid: number;
            ballotpedia: string;
            sponsor_type_id: number;
            sponsor_order: number;
            committee_sponsor: number;
            committee_id: number;
            state_federal: number;
        },
    ];
    sasts: [];
    subjects: [];
    texts: [{
        doc_id: number;
        date: string;
        type: string;
        type_id: number;
        mime: string;
        mime_id: number;
        url: string;
        state_link: string;
        text_size: number;
        text_hash: string;
    }];
    ammendments: [];
    supplements: [];
    calendar: [];
    votes: [
        {
            yea: number;
            nay: number;
            absent: number;
        },
    ];
};

export type legiScanSearchResult = {
    data: {
        searchresult: [
            {
                relevance: number;
                state: string;
                bill_number: string;
                bill_id: string;
                change_hash: string;
                url: string;
                text_url: string;
                research_url: string;
                last_action_date: string;
                last_action: string;
                title: string;
            },
        ];
    };
};
