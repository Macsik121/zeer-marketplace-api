const products = [
    {
        id: 1,
        title: 'hwid spoofer',
        productFor: 'Apex Legends',
        costPerDay: 15,
        viewedToday: 2,
        buyings: [],
        workingTime: new Date(),
        changes: [
            {
                version: '1,1',
                created: new Date(),
                description: 'I want something just like this'
            },
            {
                version: '1,03',
                created: new Date(),
                description: 'asdf'
            },
            {
                version: '1,02',
                created: new Date(),
                description: 'asdf'
            },
            {
                version: '1,01',
                created: new Date(),
                description: 'Фишка свободна. Попса, в том числе, просветляет сет.'
            }
        ],
        imageURL: '/images/hwid-spoofer.png',
        imageURLdashboard: '/images/apex-legends.png',
        description: 'Действительно, алеаторика дает цикл...',
        avatar: '/images/apex-logo.png',
        reloading: 'week',
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        },
        isBought: false
    },
    {
        id: 2,
        title: 'zeer-changer',
        productFor: 'CS:GO',
        costPerDay: 15,
        viewedToday: 0,
        buyings: [],
        description: 'Действительно, алеаторика дает цикл...',
        workingTime: new Date(),
        changes: [],
        imageURL: '/images/zeer-changer.png',
        imageURLdashboard: '/images/CS-GO.png',
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        },
        isBought: false
    },
    {
        id: 3,
        title: 'Damage Plus',
        productFor: 'Cross Fire',
        costPerDay: 15,
        viewedToday: 0,
        description: 'Действительно, алеаторика дает цикл...',
        workingTime: new Date(),
        buyings: [],
        changes: [],
        imageURL: '/images/tournament.png',
        imageURLdashboard: '/images/damage_plus.png',
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        },
        isBought: false
    },
    {
        id: 4,
        title: 'esp + wallhack',
        productFor: 'Unkown',
        costPerDay: 14,
        viewedToday: 0,
        description: 'Действительно, алеаторика дает цикл...',
        buyings: [],
        workingTime: new Date(),
        changes: [],
        imageURL: '/images/esp_wallhack.png',
        imageURLdashboard: '/images/esp_wallhack.png',
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        },
        isBought: false
    },
    {
        id: 5,
        title: 'tournament',
        productFor: 'PUBG',
        costPerDay: 15,
        viewedToday: 0,
        description: 'Действительно, алеаторика дает цикл...',
        workingTime: new Date(),
        buyings: [],
        changes: [],
        imageURL: '/images/tournament.png',
        importURLdashboard: '/images/CS-GO.png',
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        },
        isBought: false
    },
];

db.users.drop();
db.users.insertOne({email: ''});
db.users.deleteOne({email: ''});

db.products.drop();
db.products.createIndex({ viewedToday: 1 });
db.products.insertMany(products);
