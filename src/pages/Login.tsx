import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { login } from '../services/authApi'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Login() {
  const navigate = useNavigate()
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
        </motion.section>

        <motion.section 
          className="auth-card"
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="auth-card-header">
            <h2>Giriş Yap</h2>
            <p>Hesabına erişmek için bilgilerini gir.</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
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
            <div className="auth-row">
              <label className="auth-checkbox-label">
                <input type="checkbox" className="auth-checkbox-input" />
                <span className="auth-custom-checkbox"></span>
                <span>Beni hatırla</span>
              </label>
            </div>
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
                'Giriş yapılıyor...'
              ) : (
                <>
                  <LogIn size={18} />
                  Giriş yap
                </>
              )}
            </motion.button>
          </form>
          <div className="auth-footer">
            <span>Henüz hesabın yok mu?</span>
            <Link className="auth-link" to="/register">
              Kayıt ol
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  )
}