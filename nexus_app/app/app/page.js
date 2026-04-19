'use client'
import { useState, useMemo } from 'react'
import SeisModal from '../components/SeisModal'

function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 2) return { level: 'weak', label: 'Słabe hasło', segments: 1 }
  if (score === 3) return { level: 'medium', label: 'Średnie hasło', segments: 2 }
  return { level: 'strong', label: 'Silne hasło', segments: 3 }
}

export default function RegisterPage() {
  const [form, setForm] = useState({ nick: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isAdult, setIsAdult] = useState(false)
  const [showSeis, setShowSeis] = useState(false)
  const [ageVerified, setAgeVerified] = useState(false)
  const [seisToken, setSeisToken] = useState(null)
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(null)

  const strength = useMemo(() => form.password ? getPasswordStrength(form.password) : null, [form.password])

  const isFormComplete =
    form.nick.trim() !== '' &&
    form.email.includes('@') &&
    form.password.length >= 8 &&
    /[A-Z]/.test(form.password) &&
    /[a-z]/.test(form.password) &&
    form.password === form.confirmPassword &&
    ageVerified

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    if (globalError) setGlobalError('')
  }

  const handleCheckbox = () => {
    if (!isAdult) { setIsAdult(true); setShowSeis(true) }
    else { setIsAdult(false); setAgeVerified(false); setSeisToken(null) }
  }

  const handleVerified = (token) => { setShowSeis(false); setAgeVerified(true); setSeisToken(token || null) }
  const handleCloseModal = () => { setShowSeis(false); if (!ageVerified) setIsAdult(false) }

  const validate = () => {
    const e = {}
    if (!form.nick.trim()) e.nick = 'Nick jest wymagany'
    if (!form.email.includes('@')) e.email = 'Podaj prawidłowy e-mail'
    if (form.password.length < 8) e.password = 'Hasło musi mieć min. 8 znaków'
    if (!/[A-Z]/.test(form.password)) e.password = 'Hasło musi zawierać min. 1 dużą literę'
    if (!/[a-z]/.test(form.password)) e.password = 'Hasło musi zawierać min. 1 małą literę'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Hasła się nie zgadzają'
    if (!ageVerified) e.age = 'Wymagana weryfikacja wieku przez SEIS'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    setLoading(true)
    setGlobalError('')

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick: form.nick, email: form.email, password: form.password, ageVerified, seisToken }),
      })
      const data = await res.json()
      if (!res.ok) setGlobalError(data.error || 'Coś poszło nie tak')
      else setCreated(data.user)
    } catch {
      setGlobalError('Błąd połączenia z serwerem')
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    return (
      <div className="page-wrapper">
        <div className="card">
          <div className="account-created">
            <div className="big-icon">🎉</div>
            <h2>Witaj na Nexus!</h2>
            <p>Konto zostało utworzone pomyślnie.</p>
            <p>Twój nick:</p>
            <div className="username-tag">@{created.nick}</div>
            <p style={{marginTop:'1rem', fontSize:'0.8rem', color:'var(--seis-accent)'}}>✓ Wiek zweryfikowany przez SEIS</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="card">
          <div className="logo">
            <div className="logo-mark">Nx</div>
            <span className="logo-text">Ne<span>xus</span></span>
          </div>

          <h1 className="card-title">Utwórz konto</h1>
          <p className="card-subtitle">Dołącz do tysięcy społeczności na Nexus</p>

          {globalError && <div className="global-error">{globalError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Nick</label>
              <input className={`form-input${errors.nick ? ' input-error' : ''}`} type="text" placeholder="jankowalski99" value={form.nick} onChange={handleChange('nick')} />
              {errors.nick && <p className="error-msg">{errors.nick}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Adres e-mail</label>
              <input className={`form-input${errors.email ? ' input-error' : ''}`} type="email" placeholder="jan@example.com" value={form.email} onChange={handleChange('email')} />
              {errors.email && <p className="error-msg">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Hasło</label>
              <div className="password-wrapper">
                <input className={`form-input${errors.password ? ' input-error' : ''}`} type={showPassword ? 'text' : 'password'} placeholder="Min. 8 znaków, duża i mała litera" value={form.password} onChange={handleChange('password')} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)}>
                  {showPassword
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
              {form.password && strength && (
                <>
                  <div className="strength-bar">
                    {[0,1,2].map(i => (
                      <div key={i} className={`strength-segment${i < strength.segments ? ' ' + strength.level : ''}`} />
                    ))}
                  </div>
                  <p className="strength-label">{strength.label}</p>
                </>
              )}
              {errors.password && <p className="error-msg">{errors.password}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Powtórz hasło</label>
              <div className="password-wrapper">
                <input className={`form-input${errors.confirmPassword ? ' input-error' : ''}`} type={showConfirm ? 'text' : 'password'} placeholder="Powtórz hasło" value={form.confirmPassword} onChange={handleChange('confirmPassword')} />
                <button type="button" className="password-toggle" onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
              {errors.confirmPassword && <p className="error-msg">{errors.confirmPassword}</p>}
            </div>

            <div className="divider" />

            <div className={`checkbox-wrapper${isAdult ? ' checked' : ''}`} onClick={handleCheckbox} role="checkbox" aria-checked={isAdult} tabIndex={0} onKeyDown={(e) => e.key === ' ' && handleCheckbox()}>
              <div className="checkbox-custom">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div className="checkbox-label">
                <strong>Potwierdzam, że mam ukończone 18 lat</strong><br />
                {ageVerified
                  ? <span style={{color:'var(--seis-accent)', fontSize:'0.8rem'}}>✓ Wiek zweryfikowany przez SEIS</span>
                  : <span style={{fontSize:'0.8rem'}}>Wymagana weryfikacja przez SEIS — kliknij aby zweryfikować</span>}
              </div>
            </div>

            {errors.age && <p className="error-msg" style={{marginTop:'0.5rem'}}>{errors.age}</p>}

            {!isFormComplete && (
              <p style={{fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'center', marginTop:'0.75rem'}}>
                {isAdult && !ageVerified ? '⚠ Dokończ weryfikację SEIS' : 'Wypełnij wszystkie pola i zweryfikuj wiek'}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={!isFormComplete || loading}>
              {loading ? 'Tworzę konto...' : 'Utwórz konto →'}
            </button>
          </form>

          <p className="login-link">Masz już konto? <a href="#">Zaloguj się</a></p>
        </div>
      </div>

      {showSeis && <SeisModal onClose={handleCloseModal} onVerified={handleVerified} />}
    </>
  )
}
