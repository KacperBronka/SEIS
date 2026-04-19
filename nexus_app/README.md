# Nexus App

Przykładowa aplikacja(prosta imitacja discorda) implementująca API SEIS wraz z zapisem tokenów.

## Wymagania

- Docker + Docker Compose
- lub: Node.js 20+ i dostęp do PostgreSQL

## Szybki start (Docker Compose)

To najprostszy sposób uruchomienia całego środowiska: aplikacja, baza i Adminer.

1. Przejdź do katalogu projektu:

```bash
cd nexus_app
```

2. Uruchom usługi:

```bash
docker compose up --build
```

3. Otwórz aplikację:

- App: http://localhost:3000
- Adminer: http://localhost:8080

4. Zatrzymanie usług:

```bash
docker compose down
```

Jeśli chcesz zatrzymać i usunąć wolumen z danymi bazy:

```bash
docker compose down -v
```

## Uruchomienie lokalne (bez Dockera dla aplikacji)

Możesz uruchomić frontend/API lokalnie i podłączyć go do Postgresa.

1. Przejdź do katalogu aplikacji:

```bash
cd app
```

2. Zainstaluj zależności:

```bash
npm install
```

3. Utwórz plik `.env` w katalogu `app/`:

```env
DATABASE_URL="postgresql://nexus:nexus_secret@localhost:5432/nexus_db"
SEIS_API_URL="http://130.61.44.50:2000/users/verify-age"
```

4. Wygeneruj klienta Prisma i uruchom migracje:

```bash
npx prisma generate
npx prisma migrate deploy
```

5. Uruchom aplikację:

```bash
npm run dev
```

6. Otwórz: http://localhost:3000

## Baza danych

Model użytkownika (`prisma/schema.prisma`) zawiera:

- `nick` (unikalny)
- `email` (unikalny)
- `passwordHash`
- `ageVerified`
- `seisToken`

## Endpointy API

- `POST /api/verify-age`
  - body: `{ "code": "ABC123" }`
  - sprawdza pełnoletność przez SEIS

- `POST /api/register`
  - body: `{ "nick": "...", "email": "...", "password": "...", "ageVerified": true, "seisToken": "..." }`
  - tworzy konto użytkownika

# # Komendy pomocnicze

W katalogu `app/`:

```bash
npm run dev
npm run build
npm run start
npx prisma studio
```
