import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { login } from '../services/authApi'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await login({ email, password })
      if (response.success && response.token) {
        localStorage.setItem('auth_token', response.token)
        setSuccess(response.message || 'Giriş başarılı')
        navigate('/')
      } else {
        setError(response.message || 'Giriş başarısız')
      }
    } catch (err) {
      setError('Giriş sırasında hata oluştu. Lütfen tekrar dene.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero">
          <span className="auth-kicker">İş Akışı Platformu</span>
          <h1>Akışlarını tek yerden yönet.</h1>
          <p>
            Form adımlarını sürükle-bırak oluştur, ekip ile paylaş ve her
            adımı tek panelden izle.
          </p>
          <div className="auth-metrics">
            <div>
              <strong>12+</strong>
              <span>Hazır şablon</span>
            </div>
            <div>
              <strong>98%</strong>
              <span>Memnuniyet</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Canlı destek</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <h2>Giriş Yap</h2>
            <p>Hesabına erişmek için bilgilerini gir.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              E-posta
              <input
                className="input auth-input"
                type="email"
                placeholder="ornek@firma.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Şifre
              <input
                className="input auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <div className="auth-row">
              <label className="checkbox">
                <input type="checkbox" /> Beni hatırla
              </label>
              <button className="auth-link" type="button">
                Şifremi unuttum
              </button>
            </div>
            {error ? <p className="error-text auth-alert">{error}</p> : null}
            {success ? (
              <p className="success-text auth-alert">{success}</p>
            ) : null}
            <button className="button auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Giriş yapılıyor...' : 'Giriş yap'}
            </button>
          </form>
          <div className="auth-footer">
            <span>Henüz hesabın yok mu?</span>
            <Link className="auth-link" to="/register">
              Kayıt ol
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
