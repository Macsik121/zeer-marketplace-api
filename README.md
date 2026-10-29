# Baseline Testing Guide

Этот документ описывает процесс подготовки и выполнения baseline-замеров для ЛР0.

## Предварительные требования

- Docker и Docker Compose
- k6 (инструмент нагрузочного тестирования)
- Node.js 14+

### Установка k6

```bash
# Windows (через Chocolatey)
choco install k6

# Или скачайте с https://k6.io/docs/getting-started/installation/
```

## Шаг 1: Запуск окружения

```bash
# Запуск PostgreSQL и API
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f api
```

## Шаг 2: Генерация тестовых данных

```bash
# Установка зависимостей (если не установлены)
npm install

# Запуск seed-скрипта (генерация 50k пользователей)
node scripts/seed.js
```

Ожидаемый результат:
- 50,000 пользователей
- ~16,000 подписок
- 300 ключей (по 100 на продукт)
- 60 промокодов (по 20 на продукт)
- 5,000 записей логов

## Шаг 3: Нагрузочное тестирование

### Сценарий S1: 100% чтение

```bash
k6 run scripts/k6/s1-read.js
```

Ожидаемые метрики:
- p50 latency < 500ms
- p95 latency < 1000ms
- p99 latency < 2000ms
- Error rate < 5%

### Сценарий S2: 100% запись

```bash
k6 run scripts/k6/s2-write.js
```

Ожидаемые метрики:
- p50 latency < 500ms
- p95 latency < 1500ms
- p99 latency < 3000ms
- Error rate < 10%

### Сценарий S3: смешанный (80% чтение / 20% запись)

```bash
k6 run scripts/k6/s3-mixed.js
```

## Шаг 4: Сбор метрик

### Docker Stats

Во время тестирования в отдельном терминале:

```bash
# Мониторинг контейнеров
docker stats zeer_api zeer_postgres

# Пример вывода:
CONTAINER ID   NAME            CPU %   MEM USAGE / LIMIT   NET I/O
abc123         zeer_api        45.2%   350MiB / 512MiB     1.2GB / 800MB
def456         zeer_postgres   30.1%   280MiB / 512MiB     800MB / 1.2GB
```

### k6 Results

k6 автоматически выводит:
- `http_req_duration`: latency (p50, p95, p99)
- `http_reqs`: общее количество запросов
- `http_req_failed`: процент ошибок
- `iteration_duration`: время полной итерации

## Шаг 5: Сохранение результатов

Создайте файл `baseline-results.md` с результатами:

```markdown
# Baseline Results (ЛР0)

Date: [дата замера]
Environment:
  - OS: Windows 11
  - CPU: [ваш CPU]
  - RAM: [ваш RAM]
  - Node: v22.23.2
  - PostgreSQL: 15-alpine

## S1: 100% Read
- Throughput: [запросов/сек]
- Latency p50: [ms]
- Latency p95: [ms]
- Latency p99: [ms]
- Error rate: [%]
- CPU (api): [%]
- RAM (api): [MB]

## S2: 100% Write
[аналогично]

## S3: Mixed 80/20
[аналогично]
```

## Остановка окружения

```bash
# Остановка контейнеров
docker-compose down

# С удалением данных (для полного сброса)
docker-compose down -v
```

## Troubleshooting

### Ошибка подключения к БД

```bash
# Проверьте, что PostgreSQL запущен
docker-compose ps postgres

# Проверьте логи
docker-compose logs postgres
```

### Медленные запросы

```sql
-- Подключитесь к БД
docker exec -it zeer_postgres psql -U postgres -d zeer_db

-- Проверьте индексы
\di

-- Проверьте статистику запросов
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

### Высокое потребление памяти

```bash
# Проверьте лимиты в docker-compose.yml
# При необходимости увеличьте memory limits
```
