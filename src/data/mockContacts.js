export const MOCK_CONTACTS = [
    {
        id: '1',
        name: 'Mokshith',
        phone: '+91 7075721229',
        status: 'hot',
        assignedTo: 'Teja',
        source: 'team_lead',
        callStatus: 'disconnected',
        callDirection: 'outgoing',
        lastCallTime: '2026-01-19T16:00:00',
        leadDescription: 'Looking for 3BHK villa in gated community. Budget 80L–1Cr. Ready to buy in 3 months.',
        notes: [
            {
                id: 'n1-1',
                text: 'Interested in 3BHK apartment in Banjara Hills. Budget: 1.2Cr',
                timestamp: new Date('2026-01-07T10:30:00').toISOString(),
            },
            {
                id: 'n1-2',
                text: 'Prefers properties near schools and hospitals',
                timestamp: new Date('2026-01-06T14:20:00').toISOString(),
            },
        ],
        lastCallRecord: {
            id: 'call1',
            contactId: '1',
            phoneNumber: '+91 7075721229',
            callStatus: 'Hot Call',
            systemCallResult: 'Disconnected',
            duration: '0m 45s',
            timestamp: '2026-01-19T16:00:00',
            agentName: 'Teja'
        }
    },
    {
        id: '1.1',
        name: 'A Ramu',
        phone: '+91 87654 32109',
        status: 'hot',
        assignedTo: 'Teja',
        source: 'manager',
        callStatus: 'connected',
        callDirection: 'incoming',
        lastCallTime: '2026-01-13T13:31:00',
        leadDescription: 'Interested in gated community villas.',
        notes: [],
        lastCallRecord: {
            id: 'call1.1',
            contactId: '1.1',
            phoneNumber: '+91 87654 32109',
            callStatus: 'Hot Call',
            systemCallResult: 'Connected',
            duration: '5m 12s',
            timestamp: '2026-01-13T13:31:00',
            agentName: 'Teja'
        }
    },
    {
        id: '2',
        name: 'Rahul',
        phone: '+91 76543 21098',
        status: 'hot',
        assignedTo: 'Teja',
        source: 'self',
        callStatus: 'disconnected',
        callDirection: 'incoming',
        lastCallTime: '2026-01-13T13:09:00',
        leadDescription: 'Commercial space requirement near Hitec City. 2000-3000 sq ft.',
        notes: [
            {
                id: 'n2-1',
                text: 'Looking for commercial space near Hitec City',
                timestamp: new Date('2026-01-06T14:20:00').toISOString(),
            },
        ],
        lastCallRecord: {
            id: 'call2',
            contactId: '2',
            phoneNumber: '+91 76543 21098',
            callStatus: 'Warm Call',
            systemCallResult: 'Disconnected',
            duration: '1m 20s',
            timestamp: '2026-01-13T13:09:00',
            agentName: 'Teja'
        }
    },
    {
        id: '3',
        name: 'Suresh',
        phone: '+91 65432 10987',
        status: 'cold',
        assignedTo: 'Teja',
        source: 'walk_in',
        callStatus: 'disconnected',
        callDirection: 'incoming',
        lastCallTime: '2026-01-13T13:09:00',
        leadDescription: 'First-time buyer. Needs guidance on home loan process.',
        notes: [],
        lastCallRecord: {
            id: 'call3',
            contactId: '3',
            phoneNumber: '+91 65432 10987',
            callStatus: 'Cold Call',
            systemCallResult: 'Disconnected',
            duration: '0m 15s',
            timestamp: '2026-01-13T13:09:00',
            agentName: 'Teja'
        }
    },
    {
        id: '4',
        name: 'Anil Kumar',
        phone: '+91 54321 09876',
        status: 'converted',
        assignedTo: 'Teja',
        source: 'partner',
        callStatus: 'disconnected',
        callDirection: 'outgoing',
        lastCallTime: '2026-01-13T13:09:00',
        notes: [
            {
                id: 'n3',
                text: 'Not ready to buy now. Follow up in 3 months',
                timestamp: new Date('2026-01-05T09:15:00').toISOString(),
                edited: false,
            },
        ],
        lastCallRecord: {
            id: 'call4',
            contactId: '4',
            phoneNumber: '+91 54321 09876',
            callStatus: 'Converted',
            systemCallResult: 'Disconnected',
            duration: '12m 45s',
            timestamp: '2026-01-13T13:09:00',
            agentName: 'Teja'
        }
    },
    {
        id: '5',
        name: 'Vijay',
        phone: '+91 43210 98765',
        status: 'hot',
        assignedTo: 'Teja',
        source: 'dealer',
        callStatus: 'disconnected',
        callDirection: 'outgoing',
        lastCallTime: '2026-01-13T13:31:00',
        notes: [
            {
                id: 'n4',
                text: 'Already purchased property elsewhere',
                timestamp: new Date('2026-01-04T16:45:00').toISOString(),
                edited: false,
            },
        ],
        lastCallRecord: {
            id: 'call5',
            contactId: '5',
            phoneNumber: '+91 43210 98765',
            callStatus: 'Hot Call',
            systemCallResult: 'Disconnected',
            duration: '3m 10s',
            timestamp: '2026-01-13T13:31:00',
            agentName: 'Teja'
        }
    },
    {
        id: '6',
        name: 'Karthik',
        phone: '+91 32109 87654',
        status: 'none',
        assignedTo: 'Teja',
        source: 'old_customer',
        callStatus: 'disconnected',
        callDirection: 'incoming',
        lastCallTime: '2026-01-13T13:31:00',
        notes: [],
        lastCallRecord: {
            id: 'call6',
            contactId: '6',
            phoneNumber: '+91 32109 87654',
            callStatus: 'None',
            systemCallResult: 'Disconnected',
            duration: '2m 15s',
            timestamp: '2026-01-13T13:31:00',
            agentName: 'Teja'
        }
    },
    {
        id: '7',
        name: 'Deepak',
        phone: '+91 21098 76543',
        status: 'none',
        assignedTo: 'Teja',
        source: 'agent_broker',
        callStatus: 'disconnected',
        callDirection: 'outgoing',
        lastCallTime: '2026-01-12T10:30:00',
        notes: [],
        lastCallRecord: {
            id: 'call7',
            contactId: '7',
            phoneNumber: '+91 21098 76543',
            callStatus: 'None',
            systemCallResult: 'Disconnected',
            duration: '8m 20s',
            timestamp: '2026-01-12T10:30:00',
            agentName: 'Teja'
        }
    },
];
