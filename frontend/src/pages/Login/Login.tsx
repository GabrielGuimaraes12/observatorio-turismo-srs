import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

import logoObservatorioBranco from '../../assets/logo-observatorio-branco.png';
import logoPrefeituraBranco from '../../assets/logo-prefeitura-branco.png';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>){
    event.preventDefault();

    let hasError = false;

    setEmailError('');
    setPasswordError('');

    if(!email.trim()){
        setEmailError('Informe seu e-mail.');
        hasError = true;
    }

    if(!password.trim()){
        setPasswordError('Informe sua senha.');
        hasError = true;
    }

    if (email && !email.includes('@')){
        setEmailError('Informe um e-mail válido!');
        hasError = true;
    }

    if (hasError){
        return;
    }

    console.log('Dados de login:', {
        email, password
    });
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
            }}
              placeholder="Digite seu e-mail"
            />

            {emailError && (<span className="login-error">
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
            }}
              placeholder="Digite sua senha"
            />

            {passwordError && (
                <span className="login-error">
                    {passwordError}
                </span>
            )}

            <a href="#" className="forgot-password">
              Esqueci minha senha
            </a>

            <button type="submit" className="login-button">
              Entrar
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}