# Dokumentacja API SEIS (Single Endpoint Id Service)

Główny serwis obsługujący generowanie 6-cyfrowych kodów dostępu, weryfikację wieku w czasie rzeczywistym oraz zarządzanie danymi użytkowników za pomocą WebSockets.

## 1. Health Check
Sprawdzenie statusu serwera.

* **Endpoint:** `GET /`
* **Sukces (200 OK):**
    ```json
    { "error": null, "status": "ok", "message": "SEIS is up and running" }
    ```

---

## 2. Endpointy Użytkownika (`/users`)

### POST `/users/code`
Generuje unikalny, **6-cyfrowy kod** powiązany z aktywną sesją Socket.io użytkownika.

* **Body (JSON):** `{ "id_uid": "string" }`
* **Sukces (200 OK):** `{ "code": "123456", "error": null }`
* **Błędy:** `400` (brak ID), `404` (brak aktywnego połączenia socket).

### POST `/users/clear-code`
Unieważnia kod przypisany do użytkownika.

* **Body (JSON):** `{ "id_uid": "string" }`
* **Sukces (200 OK):** Status 200.

### POST `/users/verify-age`
Proces weryfikacji wieku wymagający interakcji użytkownika w czasie rzeczywistym.

* **Body (JSON):**
    ```json
    {
      "requested_age": 18,
      "code": "123456",
      "meta": "Nazwa Serwisu"
    }
    ```
* **Logika działania:**
    1. System wysyła do klienta zdarzenie socket `accept-request` z nazwą serwisu (`meta`).
    2. System czeka **30 sekund** na odpowiedź `accept-ok` od klienta.
    3. Po otrzymaniu zgody, system sprawdza wiek w bazie danych.
* **Odpowiedź (200 OK):** `{ "error": null, "age_check": true/false }`

### POST `/users/get-user-data`
Pobiera dane profilowe na podstawie UID.

* **Body (JSON):** `{ "id_uid": "string" }`
* **Sukces (200 OK):** `{ "error": null, "user": { "name": "...", "age": 25 } }`

---

## 3. Komunikacja Socket.io (Klient)

Aby system działał poprawnie, aplikacja klienta musi obsługiwać następujące zdarzenia:

### Rejestracja sesji
Zaraz po połączeniu z serwerem, klient musi zarejestrować swoje ID:
* **Emit:** `socket.emit("register", userId)`
* **Nasłuchiwanie:** `socket.on("register_response", ...)`

### Obsługa prośby o weryfikację
Gdy zewnętrzny podmiot wywoła `/verify-age`, serwer wyśle do klienta:
* **Zdarzenie:** `accept-request`
* **Dane:** `"Nazwa Serwisu"` (przekazane w `meta`)

### Potwierdzenie (Akceptacja)
Gdy użytkownik kliknie przycisk "Akceptuj" w aplikacji, należy wysłać:
* **Emit:** `socket.emit("accept-ok", code)`
    * `code`: 6-cyfrowy kod, który jest aktualnie weryfikowany.

---

## 4. Konfiguracja (`src/config.js`)

Podstawowe parametry środowiska i logiki biznesowej serwera znajdują się w pliku konfiguracyjnym:

* **PORT:** `80` – Port, na którym nasłuchuje aplikacja.
* **HOST:** `'localhost'` – Adres hosta serwera.
* **CODE_LIFESPAN:** `300000` (5 minut) – Czas ważności wygenerowanego 6-cyfrowego kodu dostępu (zapisany jako `5 * 60 * 1000` ms).
* **CODE_GARBAGE_COLLECTOR_INTERVAL:** `10000` (10 sekund) – Interwał czasowy, co jaki uruchamia się mechanizm czyszczący (Garbage Collector), usuwający nieaktywne i przeterminowane kody z systemu (zapisany jako `10_000` ms).

---

## 5. Specyfikacja techniczna

* **Format kodu:** String, 6 cyfr.
* **Czas życia kodu:** 5 minut (zgodnie z `CODE_LIFESPAN`).
* **Garbage Collection:** Automatyczne usuwanie wygasłych kodów następuje w tle co 10 sekund (zgodnie z `CODE_GARBAGE_COLLECTOR_INTERVAL`).
* **Timeout weryfikacji:** 30 sekund (po tym czasie prośba o akceptację jest automatycznie odrzucana).
* **Zarządzanie sesjami:** Serwer automatycznie usuwa powiązania socketowe przy rozłączeniu klienta (`disconnect`).