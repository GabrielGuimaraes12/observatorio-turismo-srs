import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

import logoObservatorioBranco from '../../assets/logo-observatorio-branco.png';
import logoPrefeituraBranco from '../../assets/logo-prefeitura-branco.png';

import { login } from '../../services/authService';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasError = false;

    setEmailError('');
    setPasswordError('');
    setLoginError('');
    setLoginSuccess('');

    if (!email.trim()) {
      setEmailError('Informe seu e-mail.');
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError('Informe sua senha.');
      hasError = true;
    }

    if (email && !email.includes('@')) {
      setEmailError('Informe um e-mail válido!');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({
        email: email.trim(),
        password,
      });

      // Guarda apenas o token da sessão.
      // A senha nunca é armazenada.
      sessionStorage.setItem('authToken', response.token);

      // Guarda os dados do usuário para serem utilizados
      // posteriormente pela área administrativa.
      sessionStorage.setItem(
        'authUser',
        JSON.stringify(response.user),
      );

      setLoginSuccess(`Login realizado com sucesso. Bem-vindo, ${response.user.name}!`);
      navigate('/admin/relatorios', { replace: true });
    } catch (error) {
      if (error instanceof Error) {
        setLoginError(error.message);
      } else {
        setLoginError('Não foi possível realizar o login.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="login-brand-content">
          <img
            src={logoObservatorioBranco}
            alt="Observatório do Turismo de Santa Rita do Sapucaí"
            className="login-observatorio-logo"
          />

          <img
            src={logoPrefeituraBranco}
            alt="Prefeitura de Santa Rita do Sapucaí"
            className="login-prefeitura-logo"
          />
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-container">
          <Link to="/" className="back-home">
            ← Voltar para o início
          </Link>

          <h2>Acesso à área administrativa</h2>

          <p className="login-subtitle">
            Entre com suas credenciais para continuar.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">E-mail</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
                setLoginError('');
                setLoginSuccess('');
              }}
              placeholder="Digite seu e-mail"
              disabled={isLoading}
            />

            {emailError && (
              <span className="login-error">
                {emailError}
              </span>
            )}

            <label htmlFor="password">Senha</label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError('');
                setLoginError('');
                setLoginSuccess('');
              }}
              placeholder="Digite sua senha"
              disabled={isLoading}
            />

            {passwordError && (
              <span className="login-error">
                {passwordError}
              </span>
            )}

            {loginError && (
              <span className="login-error">
                {loginError}
              </span>
            )}

            {loginSuccess && (
              <span className="login-success">
                {loginSuccess}
              </span>
            )}

            <a href="#" className="forgot-password">
              Esqueci minha senha
            </a>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}