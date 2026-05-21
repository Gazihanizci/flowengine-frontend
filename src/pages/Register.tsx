import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { register } from '../services/authApi'
import { User, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Register() {
  const navigate = useNavigate()
  const [adSoyad, setAdSoyad] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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
      {/* Ambient Animated Blobs */}
      <div className="auth-blob auth-blob-1"></div>
      <div className="auth-blob auth-blob-2"></div>
      <div className="auth-blob auth-blob-3"></div>

      <div className="auth-shell">
        <motion.section 
          className="auth-hero"
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
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
        </motion.section>

        <motion.section 
          className="auth-card"
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="auth-card-header">
            <h2>Kayıt Ol</h2>
            <p>Yeni hesap oluşturmak için bilgilerini gir.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label">
              Ad Soyad
              <div className="auth-input-wrapper">
                <User className="auth-input-icon-left" />
                <input
                  className="input auth-input"
                  type="text"
                  placeholder="Ad Soyad"
                  value={adSoyad}
                  onChange={(event) => setAdSoyad(event.target.value)}
                  required
                />
              </div>
            </label>
            <label className="auth-label">
              E-posta
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon-left" />
                <input
                  className="input auth-input"
                  type="email"
                  placeholder="ornek@firma.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>
            <label className="auth-label">
              Şifre
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon-left" />
                <input
                  className="input auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            {error ? <p className="error-text auth-alert">{error}</p> : null}
            {success ? (
              <p className="success-text auth-alert">{success}</p>
            ) : null}
            <motion.button 
              className="button auth-submit" 
              type="submit" 
              disabled={isLoading}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 20px rgba(37, 99, 235, 0.2)' }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                'Kayıt yapılıyor...'
              ) : (
                <>
                  <UserPlus size={18} />
                  Kayıt ol
                </>
              )}
            </motion.button>
          </form>
          <div className="auth-footer">
            <span>Zaten hesabın var mı?</span>
            <Link className="auth-link" to="/login">
              Giriş yap
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  )
}