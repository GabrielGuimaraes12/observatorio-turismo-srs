import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  activateUser,
  createInvitation,
  deactivateUser,
  getInvitations,
  getUsers,
  ManagementApiError,
  revokeInvitation,
  type CreatedInvitation,
  type Invitation,
  type InvitationRole,
  type ManagementUser,
  type UserRole,
} from '../../services/managementService';

import './HRDashboard.css';

const HR_USER_ROLES: UserRole[] = [
  'HR',
  'ADMIN',
  'BUSINESS',
  'USER',
];

const ADMIN_USER_ROLES: UserRole[] = [
  'BUSINESS',
  'USER',
];

interface ManagementDashboardProps {
  mode?: 'HR' | 'ADMIN';
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Data indisponível'
    : date.toLocaleDateString('pt-BR');
}

export function HRDashboard({
  mode = 'HR',
}: ManagementDashboardProps) {
  const isHR = mode === 'HR';

  const availableRoles = isHR
    ? HR_USER_ROLES
    : ADMIN_USER_ROLES;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    'invitations' | 'users' | 'logs'
  >('invitations');

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationError, setInvitationError] = useState('');
  const [invitationSuccess, setInvitationSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [invitationRole, setInvitationRole] =
    useState<InvitationRole>(isHR ? 'ADMIN' : 'BUSINESS');
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [createdInvitation, setCreatedInvitation] =
    useState<CreatedInvitation | null>(null);

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    isHR ? 'HR' : 'BUSINESS',
  );
  const [users, setUsers] = useState<ManagementUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [usersSuccess, setUsersSuccess] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  const currentUserId = (() => {
    try {
      const stored = sessionStorage.getItem('authUser');
      return stored ? (JSON.parse(stored) as { id?: string }).id : undefined;
    } catch {
      return undefined;
    }
  })();

  const handleApiError = useCallback(
    (error: unknown, setMessage: (message: string) => void) => {
      if (error instanceof ManagementApiError && error.status === 401) {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('authUser');
        navigate('/login', { replace: true });
        return;
      }

      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a operação.',
      );
    },
    [navigate],
  );

  // Consultar convites pendentes
  useEffect(() => {
    let active = true;

    getInvitations()
      .then((data) => {
        if (active) setInvitations(data);
      })
      .catch((error: unknown) => {
        if (active) handleApiError(error, setInvitationError);
      })
      .finally(() => {
        if (active) setInvitationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [handleApiError]);

  // Consultar usuários do perfil selecionado
  useEffect(() => {
    let active = true;

    getUsers(selectedRole)
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch((error: unknown) => {
        if (active) handleApiError(error, setUsersError);
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedRole, handleApiError]);

  function changeRole(role: UserRole) {
    setSelectedRole(role);
    setUsers([]);
    setUsersError('');
    setUsersSuccess('');
    setUsersLoading(true);
  }

  async function handleCreateInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setInvitationError('');
    setInvitationSuccess('');
    setCreatingInvitation(true);

    try {
      const result = await createInvitation(
        email,
        isHR ? invitationRole : 'BUSINESS',
      );

      setCreatedInvitation(result);
      setEmail('');
      setCopyFeedback('');

      const updated = await getInvitations();
      setInvitations(updated);
    } catch (error) {
      handleApiError(error, setInvitationError);
    } finally {
      setCreatingInvitation(false);
    }
  }

  async function handleRevokeInvitation(id: string) {
    setInvitationError('');
    setInvitationSuccess('');
    setRevokingId(id);

    try {
      await revokeInvitation(id);

      setInvitations((current) =>
        current.filter((invitation) => invitation.id !== id),
      );

      setInvitationSuccess('Convite revogado com sucesso.');
    } catch (error) {
      handleApiError(error, setInvitationError);
    } finally {
      setRevokingId(null);
    }
  }

  async function handleToggleUser(user: ManagementUser) {
    if (user.id === currentUserId) return;
    if (!availableRoles.includes(user.role)) return;

    setBusyUserId(user.id);
    setUsersError('');
    setUsersSuccess('');

    try {
      if (user.isActive) {
        await deactivateUser(user.id);
      } else {
        await activateUser(user.id);
      }

      const updated = await getUsers(selectedRole);
      setUsers(updated);

      setUsersSuccess(
        user.isActive
          ? 'Usuário desativado com sucesso.'
          : 'Usuário reativado com sucesso.',
      );
    } catch (error) {
      handleApiError(error, setUsersError);
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleCopyToken() {
    if (!createdInvitation) return;

    try {
      await navigator.clipboard.writeText(createdInvitation.token);
      setCopyFeedback('Token copiado!');
    } catch {
      setCopyFeedback('Não foi possível copiar automaticamente.');
    }
  }

  return (
    <div className="hr-dashboard">
      <header className="hr-header">
        <div>
          <p className="hr-eyebrow">OBSERVATÓRIO DO TURISMO</p>
          <h1>{isHR ? 'Dashboard RH' : 'Dashboard ADMIN'}</h1>
          <p>Gerenciamento de convites e contas da plataforma.</p>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        {!isHR && (
          <>
            <Link to="/admin/relatorios" className="hr-home-link">
              Gerenciar relatórios
            </Link>
            <Link to="/admin/indicadores" className="hr-home-link">
              Gerenciar indicadores
            </Link>
          </>
        )}

        <Link to="/" className="hr-home-link">
        Voltar ao início
        </Link>
    </div>
      </header>

      <main className="hr-main">
        <nav className="hr-tabs" aria-label={isHR ? 'Áreas do RH' : 'Áreas do ADMIN'}>
          <button
            type="button"
            className={activeTab === 'invitations' ? 'active' : ''}
            onClick={() => setActiveTab('invitations')}
          >
            Convites
          </button>

          <button
            type="button"
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Usuários
          </button>

          <button
            type="button"
            className={activeTab === 'logs' ? 'active' : ''}
            onClick={() => setActiveTab('logs')}
          >
            Logs
          </button>
        </nav>

        {activeTab === 'invitations' && (
          <section className="hr-panel">
            <h2>Criar convite</h2>

            <p>
              {isHR
                ? 'O RH pode convidar usuários dos perfis HR e ADMIN.'
                : 'O ADMIN pode convidar somente usuários BUSINESS.'}
              {' '}O token será exibido apenas uma vez.
            </p>

            <form className="hr-form" onSubmit={handleCreateInvitation}>
              <div className="hr-field">
                <label htmlFor="invitation-email">E-mail do convidado</label>
                <input
                  id="invitation-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={creatingInvitation}
                  placeholder="usuario@exemplo.com"
                />
              </div>

              <div className="hr-field">
                {isHR ? (
                  <>
                    <label htmlFor="invitation-role">Perfil do convite</label>
                    <select
                      id="invitation-role"
                      value={invitationRole}
                      onChange={(event) =>
                        setInvitationRole(event.target.value as InvitationRole)
                      }
                      disabled={creatingInvitation}
                    >
                      <option value="HR">HR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </>
                ) : (
                  <>
                    <span>Perfil do convite</span>
                    <strong>BUSINESS</strong>
                  </>
                )}
              </div>

              <button
                type="submit"
                className="hr-primary-button"
                disabled={creatingInvitation}
              >
                {creatingInvitation ? 'Criando...' : 'Criar convite'}
              </button>
            </form>

            {invitationError && (
              <p role="alert" className="hr-error">{invitationError}</p>
            )}

            {invitationSuccess && (
              <p role="status" className="hr-success">{invitationSuccess}</p>
            )}

            <h2>Convites pendentes</h2>

            {invitationsLoading ? (
              <p role="status">Carregando convites...</p>
            ) : invitations.length === 0 ? (
              <p>Nenhum convite pendente.</p>
            ) : (
              <div className="hr-table-wrapper">
                <table className="hr-table">
                  <thead>
                    <tr>
                      <th>E-mail</th>
                      <th>Perfil</th>
                      <th>Expira em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((invitation) => (
                      <tr key={invitation.id}>
                        <td>{invitation.email}</td>
                        <td>{invitation.role}</td>
                        <td>{formatDate(invitation.expiresAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="hr-danger-button"
                            disabled={revokingId === invitation.id}
                            onClick={() =>
                              void handleRevokeInvitation(invitation.id)
                            }
                          >
                            {revokingId === invitation.id
                              ? 'Revogando...'
                              : 'Revogar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'users' && (
          <section className="hr-panel">
            <h2>Gerenciar usuários</h2>
            <p>Consulte e gerencie as contas cadastradas.</p>

            <div className="hr-role-tabs">
              {availableRoles.map((role) => (
                <button
                  type="button"
                  key={role}
                  className={selectedRole === role ? 'active' : ''}
                  onClick={() => changeRole(role)}
                >
                  {role}
                </button>
              ))}
            </div>

            {usersError && (
              <p role="alert" className="hr-error">{usersError}</p>
            )}

            {usersSuccess && (
              <p role="status" className="hr-success">{usersSuccess}</p>
            )}

            {usersLoading ? (
              <p role="status">Carregando usuários...</p>
            ) : users.length === 0 ? (
              <p>Nenhum {selectedRole} cadastrado.</p>
            ) : (
              <div className="hr-table-wrapper">
                <table className="hr-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Criado em</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>{user.isActive ? 'Ativo' : 'Inativo'}</td>
                        <td>
                          <button
                            type="button"
                            className={
                              user.isActive
                                ? 'hr-danger-button'
                                : 'hr-primary-button'
                            }
                            disabled={
                              user.id === currentUserId ||
                              busyUserId === user.id
                            }
                            onClick={() => void handleToggleUser(user)}
                          >
                            {busyUserId === user.id
                              ? 'Processando...'
                              : user.isActive
                                ? 'Desativar'
                                : 'Reativar'}
                          </button>

                          {user.id === currentUserId && (
                            <small> Sua conta</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'logs' && (
          <section className="hr-panel">
            <h2>Logs de contas</h2>
            <p role="status">
              Logs ainda não disponíveis.
            </p>
            <p>
              A visualização será integrada quando o backend
              disponibilizar o endpoint de consulta dos logs.
            </p>
          </section>
        )}
      </main>

      {createdInvitation && (
        <div className="hr-modal-backdrop">
          <div
            className="hr-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="token-modal-title"
          >
            <h2 id="token-modal-title">Convite criado!</h2>

            <p>
              Copie o token e envie ao usuário por um canal seguro.
              Ele não poderá ser consultado novamente depois
              que esta janela for fechada.
            </p>

            <p>
              <strong>Convidado:</strong> {createdInvitation.email}
            </p>

            <p>
              <strong>Perfil:</strong> {createdInvitation.role}
            </p>

            <code className="hr-token">
              {createdInvitation.token}
            </code>

            <button
              type="button"
              className="hr-primary-button"
              onClick={() => void handleCopyToken()}
            >
              Copiar token
            </button>

            {copyFeedback && (
              <p role="status">{copyFeedback}</p>
            )}

            <button
              type="button"
              className="hr-secondary-button"
              onClick={() => {
                setCreatedInvitation(null);
                setCopyFeedback('');
              }}
            >
              Copiei, fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
