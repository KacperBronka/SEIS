# SEIS — Single Endpoint ID Service

> **Koniec z wysyłaniem dowodów osobistych.** SEIS zastępuje przesyłanie skanów dokumentów tożsamości jednorazowym kodem weryfikacyjnym — szybko, bezpiecznie i bez udostępniania wrażliwych danych.

---

## 📺 Demo

[![SEIS Demo](https://img.shields.io/badge/▶%20Obejrzyj%20demo-YouTube-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=YT_VIDEO_GOES_HERE)

---

## 🧩 Czym jest SEIS?

SEIS (Single Endpoint ID Service) to usługa weryfikacji tożsamości nowej generacji. Zamiast przesyłać skan lub zdjęcie dowodu osobistego do każdego serwisu z osobna, użytkownik generuje **jednorazowy kod weryfikacyjny**, który potwierdza jego tożsamość — bez ujawniania danych dokumentu.

### Problem, który rozwiązujemy

| Dotychczas                               | Z SEIS                                  |
| ---------------------------------------- | --------------------------------------- |
| Użytkownik wysyła skan dowodu          | Użytkownik wysyła kod weryfikacyjny   |
| Dane dokumentu trafiają do wielu miejsc | Dane pozostają wyłącznie w SEIS      |
| Ryzyko wycieku danych                    | Zero ekspozycji wrażliwych danych      |
| Długi proces weryfikacji                | Weryfikacja w sekundy                   |
| Brak kontroli nad swoimi danymi          | Pełna kontrola po stronie użytkownika |

---

## ⚙️ Jak to działa?

```
┌─────────────┐     1. Żądanie weryfikacji     ┌──────────────┐
│   Serwis X  │ ─────────────────────────────► │     SEIS     │
│  (partner)  │                                │   Endpoint   │
└─────────────┘ ◄───────────────────────────── └──────┬───────┘
       │          4. Wynik: verified/rejected          │
       │                                               │ 2. Generowanie kodu
       │                                               ▼
       │                                       ┌──────────────┐
       │         3. Użytkownik wpisuje kod      │  Użytkownik  │
       └───────────────────────────────────────│  (aplikacja) │
                                               └──────────────┘
```

1. **Partner** (serwis, firma) wysyła żądanie weryfikacji do SEIS.
2. **SEIS** generuje jednorazowy kod i wysyła go do użytkownika (SMS / aplikacja / e-mail).
3. **Użytkownik** wprowadza kod w interfejsie partnera.
4. **SEIS** potwierdza tożsamość — partner otrzymuje wynik `verified` lub `rejected`, bez żadnych danych osobowych.

---

## 🚀 Szybki start

---

## 🔌 API — Przykład użycia

### Sprawdzenie wyniku weryfikacji

```http
GET /users/verify-age?code={code_id}
```

**Odpowiedź:**

```json
{
  "age_check": true,
  "error": null
}
```

---

## 🛡️ Bezpieczeństwo

- **Zero-knowledge** — SEIS nigdy nie przesyła danych dokumentu do partnera.
- **Kody jednorazowe** — każdy kod wygasa po użyciu lub po upływie czasu ważności.
- **Szyfrowanie end-to-end** — komunikacja wyłącznie przez HTTPS/TLS 1.3.
- **Audyt dostępu** — pełne logi weryfikacji dostępne dla użytkownika.
- **RODO/GDPR** — architektura zaprojektowana zgodnie z zasadą privacy by design.

---

## 📁 Struktura projektu

```
seis/
├── src/
│   ├── api/          # Endpointy REST
│   ├── core/         # Logika weryfikacji i generowania kodów
│   ├── services/     # Integracje (SMS, e-mail, push)
│   └── utils/        # Pomocnicze funkcje
├── tests/
├── docs/             # Dokumentacja API (OpenAPI)
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 📄 Licencja

Projekt objęty licencją [APACHE 2.0](./LICENSE).

---

## 📬 Kontakt

Pytania? Napisz do nas: **hello@seis.dev** lub otwórz [Issue](../../issues/new).

---

<p align="center">
  <sub>Zbudowane z myślą o prywatności użytkowników. SEIS — Twoja tożsamość, Twoje dane.</sub>
</p>
