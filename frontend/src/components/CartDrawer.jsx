
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useShop } from '../context/ShopContext';
import { ordersApi } from '../services/api';
import { ProductImage } from './ProductImage';
import { currencyCLP } from '../utils/format';

export function CartDrawer() {
  const {
    cartOpen,
    setCartOpen,
    cart,
    products,
    cartQuantity,
    cartTotal,
    cartLoading,
    removeFromCart,
    changeQuantity,
    token,
    user,
    toast,
    apiAvailable,
  } = useShop();

  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cartOpen) return;

    const close = event => {
      if (event.key === 'Escape' && !submitting) {
        setCartOpen(false);
      }
    };

    document.addEventListener('keydown', close);

    return () => {
      document.removeEventListener('keydown', close);
    };
  }, [cartOpen, setCartOpen, submitting]);

  async function handleCheckout() {
    if (submitting || cartLoading || !cart.length) return;

    if (!user || !token) {
      toast('Inicia sesión para registrar tu pedido');
      setCartOpen(false);
      navigate('/login');
      return;
    }

    if (!apiAvailable) {
      toast('La API de pedidos no está configurada');
      return;
    }

    const confirmed = window.confirm(
      '¿Confirmar este pedido de NEXBYTE?\n\n' +
      `Total: ${currencyCLP(cartTotal)}\n\n` +
      'El pedido quedará registrado y descontará stock. ' +
      'Esta versión no realiza cobros ni procesa pagos.'
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError('');

    try {
      const items = cart.map(item => ({
        product_id: Number(item.id),
        quantity: Number(item.quantity),
      }));

      const order = await ordersApi.create(items, token);

      setCartOpen(false);

      // El backend del Hito 3 registra el pedido,
      // pero no elimina automáticamente el carrito.
      // Lo vaciamos únicamente después de recibir
      // la confirmación del pedido.

      let pendingRemovals = 0;

      for (const item of cart) {
        const removed = await removeFromCart(item.id);

        if (!removed) {
          pendingRemovals += 1;
        }
      }

      if (pendingRemovals > 0) {
        toast(
          `Pedido N° ${order.id} registrado. ` +
          'Algunos productos no pudieron quitarse del carrito.'
        );
      } else {
        toast(
          `Pedido N° ${order.id} registrado correctamente`
        );
      }

      navigate('/mis-pedidos');
    } catch (problem) {
      setError(
        problem.message ||
        'No fue posible registrar el pedido. ' +
        'Revisa tu historial antes de volver a intentarlo.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!cartOpen) return null;

  return (
    <div
      className="overlay"
      onClick={event => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          setCartOpen(false);
        }
      }}
    >
      <section
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        <div className="drawerHeader">
          <h2>
            Tu carrito <span>({cartQuantity})</span>
          </h2>

          <button
            type="button"
            className="close"
            onClick={() => setCartOpen(false)}
            disabled={submitting}
            aria-label="Cerrar carrito"
          >
            ×
          </button>
        </div>

        {cartLoading && (
          <p className="muted">Actualizando carrito...</p>
        )}

        {cart.length ? (
          <>
            {cart.map(item => {
              const product = products.find(
                p => p.id === item.id
              );

              if (!product) return null;

              return (
                <div
                  className="drawerProduct"
                  key={item.id}
                >
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                  />

                  <div>
                    <Link
                      to={`/productos/${product.id}`}
                      onClick={() => setCartOpen(false)}
                    >
                      <b>{product.name}</b>
                    </Link>

                    <br />

                    <span className="muted">
                      {currencyCLP(product.price)}
                    </span>

                    <div className="cartControls">
                      <button
                        type="button"
                        aria-label="Reducir cantidad"
                        disabled={submitting || cartLoading}
                        onClick={() =>
                          changeQuantity(
                            item.id,
                            item.quantity - 1
                          )
                        }
                      >
                        −
                      </button>

                      {item.quantity}

                      <button
                        type="button"
                        aria-label="Aumentar cantidad"
                        disabled={submitting || cartLoading}
                        onClick={() =>
                          changeQuantity(
                            item.id,
                            item.quantity + 1
                          )
                        }
                      >
                        +
                      </button>

                      <button
                        type="button"
                        disabled={submitting || cartLoading}
                        onClick={() =>
                          removeFromCart(item.id)
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <h3>
              Total: {currencyCLP(cartTotal)}
            </h3>

            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              className="btn btnPrimary"
              style={{ width: '100%' }}
              disabled={submitting || cartLoading}
              onClick={handleCheckout}
            >
              {submitting
                ? 'Registrando pedido...'
                : 'Confirmar pedido'}
            </button>

            <p className="hint">
              El pedido se registrará en NEXBYTE y
              descontará stock. No se realizan pagos
              ni cobros en esta versión.
            </p>
          </>
        ) : (
          <div
            className="empty"
            style={{ marginTop: 30 }}
          >
            <h2>Tu carrito está vacío</h2>

            <p>
              Explora el catálogo y agrega un producto.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
