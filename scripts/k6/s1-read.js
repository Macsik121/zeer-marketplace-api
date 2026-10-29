import http from 'k6/http';
import { check, sleep } from 'k6';

// Конфигурация нагрузки
export const options = {
    stages: [
        { duration: '30s', target: 10 },   // Ramp-up
        { duration: '1m', target: 10 },    // Плато
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

// Сценарий S1: 100% чтение
export default function () {
    // Получение списка продуктов (чтение)
    const query = `
        query {
            getProducts {
                id
                title
                productFor
                cost {
                    perDay
                    perMonth
                    perYear
                }
                imageURL
                status
            }
        }
    `;

    const payload = JSON.stringify({ query });
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${BASE_URL}/graphql`, payload, params);

    // Проверяем, что в ответе нет ошибок GraphQL
    const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'no GraphQL errors': (r) => {
            try {
                const body = JSON.parse(r.body);
                return !body.errors || body.errors.length === 0;
            } catch (e) {
                return false;
            }
        },
        'has products': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.getProducts && body.data.getProducts.length > 0;
            } catch (e) {
                return false;
            }
        },
    });

    sleep(1);
}
