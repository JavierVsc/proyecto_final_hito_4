
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SidePanel } from '../components/SidePanel';
import { useShop } from '../context/ShopContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { authApi, apiRequest, ordersApi } from '../services/api';
import { currencyCLP } from '../utils/format';

function formatDate(date) {
  if (!date) return 'Fecha no disponible';

  return new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function Profile() {
  useDocumentTitle('Mi perfil');

  const {
    user,
    token,
    favorites,
    toast,
    apiAvailable,
  } = useShop();

  const [profile, setProfile] = useState(user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(apiAvailable));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(
    user?.full_name || ''
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    let active = true;

    setProfile(user);
    setFullName(user.full_name || '');
    setOrders([]);

    if (!apiAvailable || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    Promise.allSettled([
      authApi.profile(token),
      ordersApi.list(token),
    ])
      .then(([profileResult, ordersResult]) => {
        if (!active) return;

        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
          setFullName(profileResult.value.full_name);
        } else {
          setError(
            'No fue posible actualizar los datos del perfil.'
          );
        }

        if (ordersResult.status === 'fulfilled') {
          setOrders(ordersResult.value.data || []);
        } else {
          setError(
            'No fue posible consultar toda la información de la cuenta.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, token, apiAvailable]);

  function openEditor() {
    setFullName(profile?.full_name || '');
    setError('');
    setEditing(true);
  }

  function cancelEditor() {
    setEditing(false);
    setFullName(profile?.full_name || '');
    setError('');
  }

  async function saveProfile(event) {
    event.preventDefault();

    const name = fullName.trim();

    if (name.length < 2 || name.length > 120) {
      setError('El nombre debe tener entre 2 y 120 caracteres.');
      return;
    }

    if (!apiAvailable || !token) {
      setError('La conexión con la API no está disponible.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await apiRequest('/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          full_name: name,
        }),
      });

      setProfile(updated);
      setFullName(updated.full_name);
      setEditing(false);

      toast('Perfil actualizado correctamente');
    } catch (problem) {
      setError(
        problem.message ||
        'No fue posible actualizar el perfil.'
      );
    } finally {
      setSaving(false);
    }
  }

  const currentProfile = profile || user;
  const recentOrders = orders.slice(0, 3);

  return (
    <>
      <div className="breadcrumb">
        <Link to="/">Inicio</Link> / Mi cuenta / Perfil
      </div>

      <div className="accountLayout">
        <SidePanel />

        <div className="mainpanel">
          <div className="adminHeader">
            <div>
              <span className="eyebrow">
                CUENTA {currentProfile?.role === 'admin'
                  ? 'ADMINISTRADOR'
                  : 'CLIENTE'}
              </span>

              <h1 className="pageTitle">
                Mi perfil
              </h1>
            </div>

            {!editing && (
              <button
                type="button"
                className="btn btnLight"
                onClick={openEditor}
              >
                Editar perfil
              </button>
            )}
          </div>

          {loading && (
            <p className="muted">
              Actualizando información de la cuenta...
            </p>
          )}

          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}

          <div className="profileHero">
            <span
              className="avatarIcon large"
              role="img"
              aria-label="Silueta genérica de usuario"
            />

            <div>
              <h2>
                {currentProfile?.full_name}
              </h2>

              <p>
                {currentProfile?.email}
              </p>

              <span
                className="pill"
                style={{
                  background: '#e3f7ff',
                  color: '#157aac',
                  padding: '5px 9px',
                  fontSize: 10,
                }}
              >
                {currentProfile?.role === 'admin'
                  ? 'Administración NEXBYTE'
                  : 'Cuenta de cliente'}
              </span>
            </div>
          </div>

          {editing && (
            <form onSubmit={saveProfile}>
              <h3 className="sectionMini">
                Editar información personal
              </h3>

              <label className="field">
                Nombre completo

                <input
                  className="input"
                  type="text"
                  minLength={2}
                  maxLength={120}
                  required
                  value={fullName}
                  onChange={event =>
                    setFullName(event.target.value)
                  }
                />
              </label>

              <p className="muted">
                Correo electrónico: {currentProfile?.email}
              </p>

              <div className="adminSubmit">
                <button
                  type="button"
                  className="btn btnLight"
                  onClick={cancelEditor}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn btnPrimary"
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando...'
                    : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}

          <div className="stats">
            <div className="stat">
              <b>
                {String(orders.length).padStart(2, '0')}
              </b>

              <small>Pedidos</small>
            </div>

            <div className="stat">
              <b>
                {String(favorites.length).padStart(2, '0')}
              </b>

              <small>Favoritos</small>
            </div>

            <div className="stat">
              <b>00</b>
              <small>Direcciones guardadas</small>
            </div>
          </div>

          <h3 className="sectionMini">
            Mis pedidos recientes
          </h3>

          {recentOrders.length === 0 ? (
            <div className="empty">
              <h2>Sin pedidos registrados</h2>

              <p>
                Todavía no tienes pedidos en NEXBYTE.
              </p>

              <Link
                className="btn btnPrimary"
                to="/productos"
              >
                Explorar productos
              </Link>
            </div>
          ) : (
            <div>
              {recentOrders.map(order => (
                <div
                  className="notice"
                  key={order.id}
                >
                  <b>
                    Pedido N° {order.id}
                  </b>

                  <p>
                    Fecha: {formatDate(order.created_at)}
                  </p>

                  <p>
                    Estado: {order.status}
                  </p>

                  <p>
                    Total: {currencyCLP(order.total_clp)}
                  </p>
                </div>
              ))}

              <p>
                <Link
                  className="viewAll"
                  to="/mis-pedidos"
                >
                  Ver todos mis pedidos →
                </Link>
              </p>
            </div>
          )}

          <div className="notice">
            NEXBYTE es el único vendedor.
            Las cuentas cliente no pueden crear productos.
          </div>
        </div>
      </div>
    </>
  );
}
