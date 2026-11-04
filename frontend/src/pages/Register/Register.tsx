
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../services/authService';
import '../Login/Login.css';

export function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        invitationToken,
      });

      navigate('/login', {
        replace: true,
        state: {
          message: 'Cadastro realizado com sucesso! Faça seu login.',
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível realizar o cadastro.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="login-brand-content">
          <h1>Observatório do Turismo</h1>
          <p>Santa Rita do Sapucaí</p>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-container">
          <Link to="/" className="back-home">
            ← Voltar para o início
          </Link>

          <h2>Criar conta</h2>

          <p className="login-subtitle">
            Preencha seus dados para acessar a plataforma.
            Se recebeu um convite, informe o token.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="register-name">Nome completo</label>
            <input
              id="register-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={60}
              required
              disabled={loading}
              autoComplete="name"
            />

            <label htmlFor="register-email">E-mail</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />

            <label htmlFor="register-password">Senha</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              disabled={loading}
              autoComplete="new-password"
              aria-describedby="password-requirements"
            />

            <p id="password-requirements" className="login-subtitle">
              Mínimo de 8 caracteres, incluindo uma letra maiúscula,
              um número e um caractere especial (!@#$%^&*).
            </p>

            <label htmlFor="register-invitation">
              Token de convite (opcional)
            </label>
            <input
              id="register-invitation"
              value={invitationToken}
              onChange={(event) =>
                setInvitationToken(event.target.value)
              }
              disabled={loading}
              autoComplete="off"
              placeholder="Cole o token recebido"
            />

            {error && (
              <p role="alert" className="login-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </form>

          <p style={{ marginTop: 20 }}>
            Já possui conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
