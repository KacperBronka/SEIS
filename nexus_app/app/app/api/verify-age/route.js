export async function POST(request) {
  console.log('=== VERIFY-AGE ENDPOINT HIT ===')
  try {
    const body = await request.json()
    const { code } = body
    console.log('Otrzymany kod:', code)

    if (!code || code.trim().length !== 6) {
      return Response.json({ age_check: false, error: 'Kod musi miec dokladnie 6 znakow' }, { status: 400 })
    }

    const seisUrl = process.env.SEIS_API_URL || 'http://130.61.44.50:2000/users/verify-age'
    console.log('Wysylam do SEIS:', seisUrl)

    let seisResponse
    try {
      seisResponse = await fetch(seisUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_age: 18, code: code.trim(), meta: 'Nexus' }),
        signal: AbortSignal.timeout(60000)
      })
      console.log('SEIS status:', seisResponse.status)

      const responseText = await seisResponse.text()
      console.log('SEIS odpowiedz:', responseText)

      let parsed = {}
      try { parsed = JSON.parse(responseText) } catch {}

      if (!seisResponse.ok) {
        const errMsg = (parsed.error || '').toLowerCase()
        if (errMsg.includes('invalid') || errMsg.includes('no longer active')) {
          return Response.json({ age_check: false, error: 'Kod jest nieprawidlowy lub wygasl — wygeneruj nowy kod w mObywatel' }, { status: 200 })
        } else if (errMsg.includes('age') || errMsg.includes('wiek')) {
          return Response.json({ age_check: false, error: 'Nie spelniasz wymagan wiekowych — musisz miec ukonezone 18 lat' }, { status: 200 })
        } else {
          return Response.json({ age_check: false, error: 'Blad serwera SEIS — sprobuj ponownie za chwile' }, { status: 200 })
        }
      }

      const verified = parsed.age_check === true
      const token = parsed.token || null
      console.log('Wynik weryfikacji:', verified, 'Token:', token)

      if (verified) {
        return Response.json({ age_check: true, token, error: null })
      } else {
        return Response.json({ age_check: false, token: null, error: 'Nie spelniasz wymagan wiekowych — musisz miec ukonezone 18 lat' })
      }

    } catch (fetchErr) {
      console.log('SEIS niedostepny:', fetchErr.message)
      if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
        return Response.json({ age_check: false, error: 'Serwer SEIS nie odpowiada — przekroczono czas oczekiwania' }, { status: 200 })
      }
      return Response.json({ age_check: false, error: 'Serwer SEIS jest chwilowo niedostepny — sprobuj za chwile' }, { status: 200 })
    }

  } catch (err) {
    console.error('Nieoczekiwany blad:', err.message)
    return Response.json({ age_check: false, error: 'Wystapil nieoczekiwany blad — sprobuj ponownie' }, { status: 200 })
  }
}
