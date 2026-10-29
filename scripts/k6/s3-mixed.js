import http from 'k6/http';
import { check, sleep } from 'k6';

// Конфигурация нагрузки: смешанный сценарий (80% чтение / 20% запись)
export const options = {
    stages: [
        { duration: '30s', target: 20 },   // Ramp-up
        { duration: '1m', target: 20 },    // Плато
        { duration: '30s', target: 50 },   // Увеличение
        { duration: '1m', target: 50 },    // Плато
        { duration: '30s', target: 100 },  // Пиковая нагрузка
        { duration: '1m', target: 100 },   // Плато
        { duration: '30s', target: 0 },    // Ramp-down
    ],
    thresholds: {
        http_req_duration: ['p(50)<500', 'p(95)<1000', 'p(99)<2000'],
        http_req_failed: ['rate<0.05'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Сценарий S3: 80% чтение / 20% запись
export default function () {
    const isWrite = Math.random() < 0.2; // 20% шанс записи

    if (isWrite) {
        // === ЗАПИСЬ ===
        const userName = `s3_user_${__VU}_${__ITER}`;
        const email = `${userName}@loadtest.com`;

        // Регистрация
        const signUpQuery = `
            mutation {
                signUp(
                    email: "${email}"
                    name: "${userName}"
                    password: "LoadTest123!"
                    navigator: "k6"
                    locationData: { ip: "127.0.0.1", location: "Test" }
                ) {
                    user { id name }
                    token
                }
            }
        `;

        const res = http.post(`${BASE_URL}/graphql`, JSON.stringify({ query: signUpQuery }), {
            headers: { 'Content-Type': 'application/json' },
        });

        check(res, {
            'write: status 200': (r) => r.status === 200,
            'write: no errors': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return !body.errors || body.errors.length === 0;
                } catch (e) {
                    return false;
                }
            },
        });

    } else {
        // === ЧТЕНИЕ ===
        const readQuery = `
            query {
                getProducts {
                    id
                    title
                    productFor
                    cost {
                        perDay
                        perMonth
                    }
                    status
                }
            }
        `;

        const res = http.post(`${BASE_URL}/graphql`, JSON.stringify({ query: readQuery }), {
            headers: { 'Content-Type': 'application/json' },
        });

        check(res, {
            'read: status 200': (r) => r.status === 200,
            'read: no errors': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return !body.errors || body.errors.length === 0;
                } catch (e) {
                    return false;
                }
            },
        });
    }

    sleep(1);
}
