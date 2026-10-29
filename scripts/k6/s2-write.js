import http from 'k6/http';
import { check, sleep } from 'k6';

// Конфигурация нагрузки
export const options = {
    stages: [
        { duration: '30s', target: 5 },    // Ramp-up (меньше для записи)
        { duration: '1m', target: 5 },     // Плато
        { duration: '30s', target: 20 },   // Увеличение
        { duration: '1m', target: 20 },    // Плато
        { duration: '30s', target: 50 },   // Пиковая нагрузка
        { duration: '1m', target: 50 },    // Плато
        { duration: '30s', target: 0 },    // Ramp-down
    ],
    thresholds: {
        http_req_duration: ['p(50)<500', 'p(95)<1500', 'p(99)<3000'],
        http_req_failed: ['rate<0.1'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Сценарий S2: 100% запись (регистрация + покупка)
export default function () {
    const userId = __VU;
    const iteration = __ITER;
    const userName = `load_test_user_${userId}_${iteration}`;
    const email = `${userName}@loadtest.com`;

    // 1. Регистрация пользователя
    const signUpQuery = `
        mutation {
            signUp(
                email: "${email}"
                name: "${userName}"
                password: "LoadTest123!"
                navigator: "k6"
                locationData: { ip: "127.0.0.1", location: "Test" }
            ) {
                user { id name email }
                token
                message
            }
        }
    `;

    const signUpRes = http.post(`${BASE_URL}/graphql`, JSON.stringify({ query: signUpQuery }), {
        headers: { 'Content-Type': 'application/json' },
    });

    const signUpSuccess = check(signUpRes, {
        'signUp status 200': (r) => r.status === 200,
        'signUp successful': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.signUp && body.data.signUp.token;
            } catch (e) {
                return false;
            }
        },
    });

    if (!signUpSuccess) {
        console.log('SignUp failed for:', userName);
        return;
    }

    const token = JSON.parse(signUpRes.body).data.signUp.token;

    sleep(1);

    // 2. Покупка продукта
    const buyQuery = `
        mutation {
            buyProduct(
                title: "Aim Assist Pro"
                name: "${userName}"
                navigator: "k6"
                productCost: 100
                days: 30
                locationData: { ip: "127.0.0.1", location: "Test" }
            ) {
                id
                title
            }
        }
    `;

    const buyRes = http.post(`${BASE_URL}/graphql`, JSON.stringify({ query: buyQuery }), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    check(buyRes, {
        'buyProduct status 200': (r) => r.status === 200,
        'buyProduct successful': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.buyProduct && body.data.buyProduct.id;
            } catch (e) {
                return false;
            }
        },
    });

    sleep(2);
}
