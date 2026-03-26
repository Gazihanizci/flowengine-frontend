import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { register } from '../services/authApi'

export default function Register() {
  const navigate = useNavigate()
  const [adSoyad, setAdSoyad] = useState('')
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
      const response = await register({ adSoyad, email, password })
      if (response.success && response.token) {
        localStorage.setItem('auth_token', response.token)
        setSuccess(response.message || 'Kayıt başarılı')
        navigate('/')
      } else {
        setError(response.message || 'Kayıt başarısız')
      }
    } catch (err) {
      setError('Kayıt sırasında hata oluştu. Lütfen tekrar dene.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-hero">
          <span className="auth-kicker">İş Akışı Platformu</span>
          <h1>Hızlıca hesabını oluştur.</h1>
          <p>
            Dakikalar içinde akışlarını paylaş, ekibinle organize ol ve süreçleri
            otomatikleştir.
          </p>
          <div className="auth-metrics">
            <div>
              <strong>3 dk</strong>
              <span>Kurulum süresi</span>
            </div>
            <div>
              <strong>120+</strong>
              <span>Aktif ekip</span>
            </div>
            <div>
              <strong>%100</strong>
              <span>Bulut güvenliği</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <h2>Kayıt Ol</h2>
            <p>Yeni hesap oluşturmak için bilgilerini gir.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Ad Soyad
              <input
                className="input auth-input"
                type="text"
                placeholder="Ad Soyad"
                value={adSoyad}
                onChange={(event) => setAdSoyad(event.target.value)}
                required
              />
            </label>
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
            {error ? <p className="error-text auth-alert">{error}</p> : null}
            {success ? (
              <p className="success-text auth-alert">{success}</p>
            ) : null}
            <button className="button auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Kayıt yapılıyor...' : 'Kayıt ol'}
            </button>
          </form>
          <div className="auth-footer">
            <span>Zaten hesabın var mı?</span>
            <Link className="auth-link" to="/login">
              Giriş yap
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
