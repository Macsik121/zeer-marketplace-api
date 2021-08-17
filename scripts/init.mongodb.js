const currentDate = new Date();
const logo = '/images/trash.jpg';
const products = [
    {
        id: 1,
        title: 'hwid spoofer',
        productFor: 'Apex Legends',
        costPerDay: 12,
        workingTime: new Date(),
        timeBought: 0,
        currentDate,
        peopleBought: [],
        keys: {
            all: [],
            active: [],
            unactive: []
        },
        changes: [
            {
                version: '1,1',
                created: new Date(),
                description: 'I want something just like this'
            },
            {
                version: '1,03',
                created: new Date('2021-07-19T15:31:42.991+00:00'),
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
        imageURLdashboard: '/images/morgh.jpg',
        description: 'Собственное подмножество в принципе трансформирует разрыв функции. Векторное поле непредсказуемо.',
        logo,
        reloading: 'Еженедельно',
        locks: 0,
        promocodes: {
            all: [],
            active: [],
            unactive: []
        },
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        }
    },
    {
        id: 2,
        title: 'zeer-changer',
        productFor: 'CS:GO',
        costPerDay: 10,
        description: 'Собственное подмножество в принципе трансформирует разрыв функции. Векторное поле непредсказуемо.',
        changes: [],
        imageURL: '/images/zeer-changer.png',
        imageURLdashboard: "/images/i'm10.jpg",
        workingTime: new Date('2021-07-19T15:32:46.991+00:00'),
        timeBought: 0,
        currentDate,
        locks: 0,
        peopleBought: [],
        logo,
        reloading: 'Еженедельно',
        keys: {
            all: [],
            active: [],
            unactive: []
        },
        promocodes: {
            all: [],
            active: [],
            unactive: []
        },
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        }
    },
    {
        id: 3,
        title: 'Damage Plus',
        productFor: 'Cross Fire',
        costPerDay: 15,
        description: 'Собственное подмножество в принципе трансформирует разрыв функции. Векторное поле непредсказуемо.',
        workingTime: new Date(),
        changes: [],
        imageURL: '/images/tournament.png',
        logo,
        imageURLdashboard: '/images/graphics-card.jpg',
        timeBought: 0,
        currentDate,
        locks: 0,
        peopleBought: [],
        reloading: 'Еженедельно',
        keys: {
            all: [],
            active: [],
            unactive: []
        },
        promocodes: {
            all: [],
            active: [],
            unactive: []
        },
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        }
    },
    {
        id: 4,
        title: 'esp + wallhack',
        productFor: 'Unknown',
        costPerDay: 14,
        description: 'Собственное подмножество в принципе трансформирует разрыв функции. Векторное поле непредсказуемо.',
        workingTime: new Date(),
        changes: [],
        imageURL: '/images/esp_wallhack.png',
        imageURLdashboard: '/images/esp_wallhack.png',
        logo,
        timeBought: 0,
        currentDate,
        locks: 0,
        peopleBought: [],
        reloading: 'Еженедельно',
        keys: {
            all: [],
            active: [],
            unactive: []
        },
        promocodes: {
            all: [],
            active: [],
            unactive: []
        },
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        },
    },
    {
        id: 5,
        title: 'tournament',
        productFor: 'PUBG',
        costPerDay: 15,
        description: 'Собственное подмножество в принципе трансформирует разрыв функции. Векторное поле непредсказуемо.',
        workingTime: new Date(),
        changes: [],
        imageURL: '/images/tournament.png',
        imageURLdashboard: '/images/tournament.png',
        logo,
        timeBought: 0,
        currentDate,
        reloading: 'Еженедельно',
        locks: 0,
        peopleBought: [],
        keys: {
            all: [],
            active: [],
            unactive: []
        },
        promocodes: {
            all: [],
            active: [],
            unactive: []
        },
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        },
    },
    {
        id: 6,
        title: 'Not HWID spoofer',
        productFor: 'Apex',
        costPerDay: 20,
        workingTime: new Date(),
        timeBought: 0,
        keys: {
            all: [],
            active: [],
            unactive: []
        },
        currentDate,
        changes: [
            {
                version: '1,01',
                created: new Date(),
                description: 'Фишка свободна. Попса, в том числе, просветляет сет.'
            }
        ],
        imageURL: '/images/hwid-spoofer.png',
        imageURLdashboard: '/images/graphics-card.jpg',
        description: 'Собственное подмножество в принципе трансформирует разрыв функции. Векторное поле непредсказуемо.',
        logo,
        reloading: 'Еженедельно',
        locks: 0,
        peopleBought: [],
        promocodes: {
            all: [],
            active: [],
            unactive: []
        },
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        }
    },
    {
        id: 7,
        title: 'hwid spofer2',
        productFor: 'Apex Legends',
        costPerDay: 12,
        workingTime: new Date(),
        timeBought: 0,
        currentDate,
        keys: {
            all: [],
            active: [],
            unactive: []
        },
        changes: [
            {
                version: '1,1',
                created: new Date(),
                description: 'I want something just like this'
            },
            {
                version: '1,03',
                created: new Date('2021-07-19T15:31:42.991+00:00'),
                description: 'asdf'
            },
            {
                version: '1,02',
                created: new Date(),
                description: 'asdf'
            }
        ],
        imageURL: '/images/hwid-spoofer.png',
        imageURLdashboard: '/images/morgh.jpg',
        description: 'Собственное подмножество в принципе трансформирует разрыв функции. Векторное поле непредсказуемо.',
        logo,
        reloading: 'Еженедельно',
        locks: 0,
        peopleBought: [],
        promocodes: {
            all: [],
            active: [],
            unactive: []
        },
        characteristics: {
            version: 'Все у кого есть античит BE / EAC',
            osSupport: 'Windows (x64 only): Windows 10 Only (stable build)',
            cpuSupport: ['Intel', 'AMD'],
            gameMode: 'Любой',
            developer: 'Zeer',
            supportedAntiCheats: 'BattlEye (BE), Easy Anti-Cheat (EAC)',
        }
    },
];

const answers = [
    {
        sort: 'Базовые',
        answers: [
            {
                title: 'Миксолидийский что-то',
                answer: 'Пентатоника имитирует хамбакер.',
                usefulRate: 0,
                rateCount: 0        
            },
            {
                title: 'Живая сессия имеет сонорный',
                answer: 'Пентатоника имитирует хамбакер. Пентатоника имитирует хамбакер.',
                usefulRate: 25,
                rateCount: 0
            },
            {
                title: 'Soem title right here',
                answer: 'Ответ на вопрос здесь. Это просто тестовый ответ и я не знаю, что написать, поэтому пишу это',
                usefulRate: 75,
                rateCount: 0        
            },
            {
                title: 'Заголовок Ответа',
                answer: 'Ответ на вопрос. сорпов ан тевтО. Не знаю, что писать. ьтасип отч, юанз еН',
                usefulRate: 100,
                rateCount: 0
            },
            {
                title: 'Как будет выглядить пятый элемент',
                answer: 'Спам. Спам. Спам. Спам.',
                usefulRate: 66,
                rateCount: 0
            }
        ]
    },
    {
        sort: 'Оплата и активация',
        answers: [
            {
                title: 'Мелодический аккорд современников',
                answer: 'Пентатоника имитирует хамбакер. Пенатоника имитирует хамбакер. Пенатоника имитирует хамбакер.',
                usefulRate: 0,
                rateCount: 0
            },
            {
                title: 'Название ответа на вопрос',
                answer: '',
                usefulRate: 32,
                rateCount: 0
            }
        ]
    },
    {
        sort: 'Конфиги',
        answers: [
            {
                title: 'I want something just like this',
                answer: 'Пишем ответ на вопрос здесь',
                usefulRate: 0,
                rateCount: 0
            },
            {
                title: 'Lorem ipsum dolor sit amet',
                answer: 'Пример того, как будет выглядеть 76% одобрения пользователей',
                usefulRate: 76,
                rateCount: 0
            }
        ]
    },
    {
        sort: 'Название раздела отображается вот так',
        answers: [
            {
                title: 'Zeer: online marketplace',
                answer: 'Делается огромный сайт...',
                usefulRate: 51,
                rateCount: 0
            },
            {
                title: 'Второй ответ в этом разделе',
                answer: '?',
                usefulRate: 99,
                rateCount: 0
            },
            {
                title: 'Пример, как будут отображатся 3 ответа на вопрос в одном разделе',
                answer: 'Суши, роллы. Суши, роллы. Текст. Текст. Текст.',
                usefulRate: 66,
                rateCount: 0
            }
        ]
    }
];

db.products.drop();
db.products.insertMany(products);
db.products.createIndex({ timeBought: 1 })

db.answersFAQ.drop();
db.answersFAQ.insertMany(answers);
