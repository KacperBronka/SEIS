
## Dokumentacja endpointów

Poniższe przykłady zakładają bazowy URL:

```text
http://localhost:2000
```

---

## GET /

### Opis

Endpoint health-check.

### Przykładowy request

```bash
curl -X GET http://localhost:2000/
```

### Przykładowa odpowiedź 200

```json
{
	"error": null,
	"status": "ok",
	"message": "SEIS is up and running"
}
```

---

## POST /users/get-user-data

### Opis

Pobiera dane użytkownika po `id_uid`.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/users/get-user-data \
	-H "Content-Type: application/json" \
	-d '{
		"id_uid": "ABC123456"
	}'
```

### Przykładowa odpowiedź 200

```json
{
	"error": null,
	"user": {
		"id": 1,
		"gov_id": "ABC123456",
		"name": "Jan",
		"surname": "Kowalski",
		"pesel": "85031204558"
	}
}
```

### Przykładowa odpowiedź 404

```json
{
	"error": "User with id(NIEISTNIEJE123) has not been found",
	"user": null
}
```

---

## POST /users/code

### Opis

Generuje (lub odnawia) 6-cyfrowy kod weryfikacyjny dla zalogowanego użytkownika socketowego.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/users/code \
	-H "Content-Type: application/json" \
	-d '{
		"id_uid": "ABC123456"
	}'
```

### Przykładowa odpowiedź 200

```json
{
	"code": "482913",
	"error": null
}
```

### Przykładowa odpowiedź 404 (brak socketa)

```json
{
	"code": null,
	"error": "No socket assigned to the user id"
}
```

---

## POST /users/clear-code

### Opis

Usuwa aktywny kod użytkownika.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/users/clear-code \
	-H "Content-Type: application/json" \
	-d '{
		"id_uid": "ABC123456"
	}'
```

### Przykładowa odpowiedź 200

Brak body (status HTTP 200).

### Przykładowa odpowiedź 404

```json
{
	"error": "User with id(NIEISTNIEJE123) has not been found"
}
```

---

## POST /users/verify-age

### Opis

Weryfikuje wiek użytkownika po kodzie i akceptacji po stronie socketa. Dodatkowo zwraca token aktywności.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/users/verify-age \
	-H "Content-Type: application/json" \
	-d '{
		"requested_age": 18,
		"code": "482913",
		"meta": "Panel Obywatela"
	}'
```

### Przykładowa odpowiedź 200 (akceptacja)

```json
{
	"error": null,
	"age_check": true,
	"token": "k9m5f3p1z7..."
}
```

### Przykładowa odpowiedź 200 (odmowa/timeout)

```json
{
	"error": "User denied or timeout",
	"age_check": false,
	"token": null
}
```

### Przykładowa odpowiedź 400

```json
{
	"error": "Code is invalid or no longer active",
	"age_check": false,
	"token": null
}
```

### Przykładowa odpowiedź 410

```json
{
	"error": "User socket disconnected",
	"age_check": false,
	"token": null
}
```

---

## POST /family/create

### Opis

Tworzy rodzinę i ustawia użytkownika jako rodzica.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/family/create \
	-H "Content-Type: application/json" \
	-d '{
		"id_uid": "ABC123456",
		"family_name": "Rodzina Kowalskich",
		"email": "jan@example.com"
	}'
```

### Przykładowa odpowiedź 200

```json
{
	"family_id": 1,
	"family_name": "Rodzina Kowalskich",
	"join_code": "FAMEX001",
	"role": "parent",
	"members": [
		{
			"id_uid": "ABC123456",
			"name": "Jan Kowalski",
			"role": "parent"
		}
	],
	"pending_requests": [],
	"error": null
}
```

### Przykładowa odpowiedź 409

```json
{
	"error": "User is already a member of a family"
}
```

---

## POST /family/join

### Opis

Wysyła prośbę dziecka o dołączenie do rodziny po kodzie dołączenia.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/family/join \
	-H "Content-Type: application/json" \
	-d '{
		"id_uid": "DEF987654",
		"join_code": "FAMEX001"
	}'
```

### Przykładowa odpowiedź 200

```json
{
	"error": null,
	"family_name": "Rodzina Kowalskich",
	"parent_name": "Jan Kowalski"
}
```

### Przykładowa odpowiedź 404

```json
{
	"error": "Invalid join code"
}
```

### Przykładowa odpowiedź 409

```json
{
	"error": "A pending request already exists for this user"
}
```

---

## POST /family/status

### Opis

Zwraca status członkostwa użytkownika w rodzinie.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/family/status \
	-H "Content-Type: application/json" \
	-d '{
		"id_uid": "ABC123456"
	}'
```

### Przykładowa odpowiedź 200 (rodzic)

```json
{
	"in_family": true,
	"family_id": 1,
	"family_name": "Rodzina Kowalskich",
	"role": "parent",
	"join_code": "FAMEX001",
	"members": [
		{
			"id_uid": "ABC123456",
			"name": "Jan Kowalski",
			"role": "parent"
		},
		{
			"id_uid": "DEF987654",
			"name": "Anna Nowak",
			"role": "child"
		}
	],
	"pending_requests": []
}
```

### Przykładowa odpowiedź 200 (brak rodziny)

```json
{
	"in_family": false,
	"family_id": null,
	"family_name": null,
	"role": null,
	"members": [],
	"pending_requests": []
}
```

---

## POST /family/approve

### Opis

Akceptuje oczekującą prośbę dziecka o dołączenie do rodziny.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/family/approve \
	-H "Content-Type: application/json" \
	-d '{
		"parent_id": "ABC123456",
		"child_id": "DEF987654",
		"family_id": 1
	}'
```

### Przykładowa odpowiedź 200

```json
{
	"ok": true,
	"error": null
}
```

### Przykładowa odpowiedź 403

```json
{
	"error": "Unauthorized: you are not the parent of this family"
}
```

### Przykładowa odpowiedź 404

```json
{
	"error": "No pending request found for this child"
}
```

---

## POST /family/decline

### Opis

Odrzuca oczekującą prośbę dziecka o dołączenie do rodziny.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/family/decline \
	-H "Content-Type: application/json" \
	-d '{
		"parent_id": "ABC123456",
		"child_id": "DEF987654",
		"family_id": 1
	}'
```

### Przykładowa odpowiedź 200

```json
{
	"ok": true,
	"error": null
}
```

### Przykładowa odpowiedź 404

```json
{
	"error": "No pending request found for this child"
}
```

---

## POST /family/remove

### Opis

Usuwa dziecko z rodziny.

### Przykładowy request

```bash
curl -X POST http://localhost:2000/family/remove \
	-H "Content-Type: application/json" \
	-d '{
		"parent_id": "ABC123456",
		"child_id": "DEF987654"
	}'
```

### Przykładowa odpowiedź 200

```json
{
	"ok": true,
	"error": null
}
```

### Przykładowa odpowiedź 400

```json
{
	"error": "Family owner cannot be removed"
}
```

### Przykładowa odpowiedź 404

```json
{
	"error": "Child is not a member of this family"
}
```

---

## Walidacja requestów

Endpointy `POST` używają walidacji `express-validation` (Joi).
Przykładowy błąd walidacji (status 400):

```json
{
	"statusCode": 400,
	"error": "Bad Request",
	"message": "Validation Failed",
	"details": {
		"body": [
			{
				"message": "\"id_uid\" is required"
			}
		]
	}
}
```
