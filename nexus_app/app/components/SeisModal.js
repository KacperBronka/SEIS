'use client'
import { useState } from 'react'

export default function SeisModal({ onClose, onVerified }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      setError('Kod musi mieć dokładnie 6 znaków')
      return
    }
    setError('')
    setLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      const res = await fetch('/api/verify-age', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const data = await res.json()

      if (data.age_check === true) {
        setSuccess(true)
        setTimeout(() => onVerified(data.token || null), 1800)
      } else {
        setError(data.error || 'Weryfikacja nie powiodła się — spróbuj ponownie')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Przekroczono czas oczekiwania (60s) — serwer SEIS nie odpowiada')
      } else {
        setError('Błąd połączenia z serwerem SEIS — sprawdź połączenie internetowe')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)
    setCode(val)
    if (error) setError('')
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} disabled={loading}>✕</button>

        {!success ? (
          <>
            <div className="seis-badge"><span className="seis-dot" />SEIS — Weryfikacja</div>
            <h2 className="modal-title">Potwierdź swój wiek</h2>
            <p className="modal-desc">
              Otwórz aplikację <strong>mObywatel</strong> i wygeneruj jednorazowy kod SEIS (6 znaków).
              Żadne Twoje dane osobowe nie zostaną przekazane tej platformie.
            </p>

            <input
              className={`code-input${error ? ' input-error' : ''}`}
              type="text"
              placeholder="ABC123"
              value={code}
              onChange={handleCodeChange}
              autoFocus
              disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleVerify()}
              style={{textTransform:'uppercase'}}
            />

            {error && (
              <div style={{
                background: 'rgba(237,66,69,0.1)',
                border: '1px solid rgba(237,66,69,0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.75rem',
                fontSize: '0.85rem',
                color: 'var(--error)',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                {error}
              </div>
            )}

            {loading && (
              <p style={{fontSize:'0.78rem', color:'var(--text-muted)', textAlign:'center', marginBottom:'0.75rem'}}>
                ⏳ Oczekiwanie na odpowiedź serwera SEIS... (max 60s)
              </p>
            )}

            <p className="code-hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              Kod jest jednorazowy i wygasa po kilku minutach
            </p>

            <button className="btn-seis" onClick={handleVerify} disabled={code.length !== 6 || loading}>
              {loading
                ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    <Spinner />Weryfikuję...
                  </span>
                : 'Zweryfikuj wiek →'}
            </button>

            <div className="modal-footer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Platforma nie otrzymuje Twoich danych osobowych
            </div>
          </>
        ) : (
          <div className="success-state">
            <div className="success-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <p className="success-title">Wiek potwierdzony ✓</p>
            <p className="success-desc">Twoje dane pozostały w systemie państwowym.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{animation:'spin 0.7s linear infinite'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}
