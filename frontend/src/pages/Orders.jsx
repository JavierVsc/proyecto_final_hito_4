
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SidePanel } from '../components/SidePanel';
import { useShop } from '../context/ShopContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { currencyCLP } from '../utils/format';
import { ordersApi } from '../services/api';

function formatDate(date) {
  if (!date) return 'Fecha no disponible';

  return new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Orders() {
  useDocumentTitle('Mis pedidos');

  const { token, apiAvailable } = useShop();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(
    Boolean(apiAvailable)
  );
  const [error, setError] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [details, setDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!apiAvailable || !token) {
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setError('');

    ordersApi.list(token)
      .then(response => {
        if (!active) return;

        setOrders(response.data || []);
      })
      .catch(problem => {
        if (!active) return;

        setError(
          problem.message ||
          'No fue posible obtener tus pedidos.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, apiAvailable]);

  async function toggleDetails(orderId) {
    if (selectedOrder === orderId) {
      setSelectedOrder(null);
      return;
    }

    setSelectedOrder(orderId);

    if (details[orderId]) return;

    setDetailLoading(true);
    setError('');

    try {
      const response = await ordersApi.detail(
        orderId,
        token
      );

      setDetails(current => ({
        ...current,
        [orderId]: response,
      }));
    } catch (problem) {
      setError(
        problem.message ||
        'No fue posible consultar el pedido.'
      );
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="accountLayout">
      <SidePanel />

      <div className="mainpanel">
        <span className="eyebrow">
          MI CUENTA
        </span>

        <h1 className="pageTitle">
          Mis pedidos
        </h1>

        <p className="muted">
          Consulta los pedidos registrados en NEXBYTE.
        </p>

        {loading && (
          <p className="muted">
            Cargando pedidos...
          </p>
        )}

        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}

        {!loading && orders.length === 0 && (
          <div className="empty">
            <h2>No hay pedidos registrados</h2>

            <p>
              Cuando confirmes una compra,
              aparecerá en esta sección.
            </p>

            <Link
              className="btn btnPrimary"
              to="/productos"
            >
              Explorar catálogo
            </Link>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div>
            <p className="muted">
              {orders.length} pedido(s) registrado(s)
            </p>

            {orders.map(order => {
              const isOpen = selectedOrder === order.id;
              const detail = details[order.id];

              return (
                <div
                  className="mainpanel"
                  key={order.id}
                  style={{
                    marginTop: 16,
                    border: '1px solid #dce5ef',
                    borderRadius: 12,
                    padding: 18,
                  }}
                >
                  <div
                    className="adminHeader"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <span className="eyebrow">
                        PEDIDO N° {order.id}
                      </span>

                      <h2
                        style={{
                          fontSize: 20,
                          margin: '8px 0',
                        }}
                      >
                        {currencyCLP(order.total_clp)}
                      </h2>

                      <p className="muted">
                        {formatDate(order.created_at)}
                      </p>

                      <p>
                        Estado: <b>{order.status}</b>
                      </p>
                    </div>

                    <button
                      className="btn btnLight"
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        toggleDetails(order.id)
                      }
                    >
                      {isOpen
                        ? 'Ocultar detalle'
                        : 'Ver detalle'}
                    </button>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 18 }}>
                      <h3 className="sectionMini">
                        Productos del pedido
                      </h3>

                      {detailLoading && !detail && (
                        <p className="muted">
                          Cargando detalle...
                        </p>
                      )}

                      {detail?.items?.map(item => (
                        <div
                          key={item.product_id}
                          style={{
                            padding: '12px 0',
                            borderBottom:
                              '1px solid #e5eaf0',
                          }}
                        >
                          <b>
                            {item.product_name_snapshot}
                          </b>

                          <p className="muted">
                            Cantidad: {item.quantity}
                          </p>

                          <p>
                            Precio unitario:{' '}
                            {currencyCLP(
                              item.unit_price_clp
                            )}
                          </p>

                          <p>
                            Subtotal:{' '}
                            <b>
                              {currencyCLP(
                                item.unit_price_clp *
                                item.quantity
                              )}
                            </b>
                          </p>
                        </div>
                      ))}

                      {detail && (
                        <h3 style={{ marginTop: 16 }}>
                          Total del pedido:{' '}
                          {currencyCLP(detail.total_clp)}
                        </h3>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          className="notice"
          style={{ marginTop: 24 }}
        >
          Los pedidos se registran en PostgreSQL.
          Esta versión académica no procesa pagos
          ni realiza cobros.
        </div>
      </div>
    </div>
  );
}
