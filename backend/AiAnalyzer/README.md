# AiAnalyzer

Skrypt do okresowej analizy aktywności użytkowników pod kątem podejrzanych wzorców logowania. Model jest trenowany na danych generowanych proceduralnie i jest w fazie prototypu.
Aplikacja:

- pobiera dane z MySQL z ostatnich 7 dni,
- wylicza cechy behawioralne per użytkownik,
- uruchamia model ML z pliku `model.pkl`,
- zapisuje oflagowanych użytkowników do plików CSV,
- wykonuje skan od razu po starcie i następnie co 12 godzin.

## Struktura projektu

- `analyzer.py` - główny skrypt analizy i harmonogram.
- `train-model.py` - skrypt treningu przykładowego modelu i zapis do `model.pkl`.
- `config.json` - konfiguracja połączenia z bazą MySQL.
- `model.pkl` - wytrenowany model używany przez analizator.

## Wymagania

- Python 3.9+
- Dostęp do bazy MySQL z tabelą `activity`

Tabela `activity` powinna zawierać co najmniej kolumny:

- `user_id`
- `date` (czas zdarzenia)
- `verification_successful` (informacja o sukcesie/weryfikacji)

## Instalacja zależności

W katalogu projektu uruchom:

```bash
pip install pandas scikit-learn joblib schedule mysql-connector-python
```

## Konfiguracja (`config.json`)

Przykład:

```json
{
	"host": "localhost",
	"port": 3307,
	"user": "seis",
	"password": "seis_password",
	"database": "seis"
}
```

Opis pól:

- `host` - adres hosta MySQL (np. `localhost` albo adres serwera).
- `port` - port serwera MySQL (liczba całkowita, np. `3306` lub `3307`).
- `user` - nazwa użytkownika bazy.
- `password` - hasło użytkownika bazy.
- `database` - nazwa bazy danych.

Wszystkie powyższe klucze są wymagane. Brak któregoś z nich zatrzyma uruchomienie.

## Uruchomienie

### 1. (Opcjonalnie) wytrenuj model

Jeżeli nie masz pliku `model.pkl`, uruchom:

```bash
python train-model.py
```

### 2. Uruchom analizator

```bash
python analyzer.py
```

Po starcie skrypt:

1. ładuje konfigurację z `config.json`,
2. ładuje model z `model.pkl`,
3. wykonuje natychmiastowy skan,
4. planuje kolejne skany co 12 godzin.

Zatrzymanie działania: `Ctrl+C`.

## Wyniki i logi

- Logi działania trafiają do pliku `analyzer.log`.
- Wyniki trafiają do katalogu `scan_results` jako:

```text
scan_YYYYMMDD_HHMMSS.csv
```

Każdy rekord CSV zawiera:

- `user_id`
- `probability`
- `reason`
- `flagged_at`

Jeśli podczas skanu nie wykryto podejrzanych użytkowników, plik CSV nie zostanie utworzony.

## Najczęstsze problemy

- `Config file not found`:
	sprawdź, czy plik `config.json` istnieje w katalogu projektu.
- `Missing keys in config.json`:
	uzupełnij brakujące klucze w konfiguracji.
- `Model file not found: model.pkl`:
	uruchom `python train-model.py` lub skopiuj gotowy model do katalogu projektu.
- Błąd połączenia MySQL:
	zweryfikuj `host`, `port`, `user`, `password`, `database` i dostęp sieciowy.
