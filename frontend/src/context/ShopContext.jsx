
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

import { initialProducts } from '../data/products';

import {
  apiAvailable,
  authApi,
  productsApi,
  normalizeProduct,
  favoritesApi,
  cartApi,
} from '../services/api';

const ShopContext = createContext(null);

function readSession(key, fallback) {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCartItems(items = []) {
  return items.map(item => ({
    id: Number(item.product_id),
    quantity: Number(item.quantity),
  }));
}

function cartReducer(cart, action) {
  switch (action.type) {
    case 'REPLACE':
      return action.items;

    case 'ADD': {
      const found = cart.some(
        item => item.id === action.id
      );

      return found
        ? cart.map(item =>
            item.id === action.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item
          )
        : [
            ...cart,
            {
              id: action.id,
              quantity: 1,
            },
          ];
    }

    case 'REMOVE':
      return cart.filter(
        item => item.id !== action.id
      );

    case 'CHANGE':
      return action.quantity <= 0
        ? cart.filter(
            item => item.id !== action.id
          )
        : cart.map(item =>
            item.id === action.id
              ? {
                  ...item,
                  quantity: action.quantity,
                }
              : item
          );

    case 'CLEAR':
      return [];

    default:
      return cart;
  }
}

export function ShopProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);

  const [cart, dispatch] = useReducer(
    cartReducer,
    [],
    () =>
      apiAvailable
        ? []
        : readSession('nexbyte-cart', [])
  );

  const [favorites, setFavorites] = useState(() =>
    apiAvailable
      ? []
      : readSession('nexbyte-favorites', [])
  );

  const [user, setUser] = useState(() =>
    readSession('nexbyte-user', null)
  );

  const [token, setToken] = useState(() =>
    readSession('nexbyte-token', null)
  );

  const [cartOpen, setCartOpen] = useState(false);

  const [notification, setNotification] = useState('');

  const [loading, setLoading] = useState(
    Boolean(apiAvailable)
  );

  const [catalogError, setCatalogError] = useState('');

  const [favoritesLoading, setFavoritesLoading] = useState(
    Boolean(apiAvailable && token)
  );

  const [cartLoading, setCartLoading] = useState(
    Boolean(apiAvailable && token)
  );

  const [cartServerTotal, setCartServerTotal] = useState(0);

  const toast = useCallback((message) => {
    setNotification(message);
  }, []);

  // Cargar catálogo desde PostgreSQL
  useEffect(() => {
    if (!apiAvailable) return;

    let active = true;

    productsApi.list()
      .then(items => {
        if (!active) return;

        setProducts(items);
        setCatalogError('');
      })
      .catch(() => {
        if (!active) return;

        setCatalogError(
          'No fue posible obtener el catálogo del servidor.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Guardar carrito solamente en modo local
  useEffect(() => {
    if (!apiAvailable) {
      window.sessionStorage.setItem(
        'nexbyte-cart',
        JSON.stringify(cart)
      );
    }
  }, [cart]);

  // Guardar favoritos solamente en modo local
  useEffect(() => {
    if (!apiAvailable) {
      window.sessionStorage.setItem(
        'nexbyte-favorites',
        JSON.stringify(favorites)
      );
    }
  }, [favorites]);

  // Mantener usuario durante la sesión
  useEffect(() => {
    if (user) {
      window.sessionStorage.setItem(
        'nexbyte-user',
        JSON.stringify(user)
      );
    } else {
      window.sessionStorage.removeItem('nexbyte-user');
    }
  }, [user]);

  // Mantener JWT durante la sesión
  useEffect(() => {
    if (token) {
      window.sessionStorage.setItem(
        'nexbyte-token',
        JSON.stringify(token)
      );
    } else {
      window.sessionStorage.removeItem('nexbyte-token');
    }
  }, [token]);

  // Notificaciones temporales
  useEffect(() => {
    if (!notification) return;

    const timer = window.setTimeout(() => {
      setNotification('');
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notification]);

  // Cargar favoritos desde PostgreSQL
  useEffect(() => {
    if (!apiAvailable) return;

    if (!token) {
      setFavorites([]);
      setFavoritesLoading(false);
      return;
    }

    let active = true;

    setFavorites([]);
    setFavoritesLoading(true);

    favoritesApi.list(token)
      .then(response => {
        if (!active) return;

        setFavorites(
          response.data.map(
            item => Number(item.product_id)
          )
        );
      })
      .catch(() => {
        if (active) {
          toast('No fue posible cargar tus favoritos');
        }
      })
      .finally(() => {
        if (active) setFavoritesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, toast]);

  // Consultar carrito actualizado desde PostgreSQL
  const refreshCart = useCallback(async (sessionToken) => {
    const response = await cartApi.list(sessionToken);

    dispatch({
      type: 'REPLACE',
      items: normalizeCartItems(response.items),
    });

    setCartServerTotal(
      Number(response.total_clp ?? 0)
    );

    return response;
  }, []);

  // Recuperar carrito cuando inicia sesión
  useEffect(() => {
    if (!apiAvailable) return;

    dispatch({ type: 'CLEAR' });
    setCartServerTotal(0);

    if (!token) {
      setCartLoading(false);
      return;
    }

    let active = true;

    setCartLoading(true);

    cartApi.list(token)
      .then(response => {
        if (!active) return;

        dispatch({
          type: 'REPLACE',
          items: normalizeCartItems(response.items),
        });

        setCartServerTotal(
          Number(response.total_clp ?? 0)
        );
      })
      .catch(() => {
        if (active) {
          toast('No fue posible cargar el carrito');
        }
      })
      .finally(() => {
        if (active) {
          setCartLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, toast]);

  // Agregar producto al carrito
  const addToCart = useCallback(async (id) => {
    if (!apiAvailable) {
      dispatch({
        type: 'ADD',
        id,
      });

      toast('Producto agregado al carrito');
      return true;
    }

    if (!user || !token) {
      toast('Inicia sesión para agregar productos al carrito');
      return false;
    }

    if (cartLoading) {
      toast('Estamos cargando tu carrito');
      return false;
    }

    try {
      await cartApi.add(id, 1, token);
      await refreshCart(token);

      toast('Producto agregado al carrito');
      return true;
    } catch (error) {
      toast(
        error.message ||
        'No fue posible agregar el producto'
      );

      return false;
    }
  }, [
    user,
    token,
    cartLoading,
    refreshCart,
    toast,
  ]);

  // Eliminar producto del carrito
  const removeFromCart = useCallback(async (id) => {
    if (!apiAvailable) {
      dispatch({
        type: 'REMOVE',
        id,
      });

      return true;
    }

    if (!token || cartLoading) return false;

    try {
      await cartApi.remove(id, token);
      await refreshCart(token);

      toast('Producto eliminado del carrito');
      return true;
    } catch (error) {
      toast(
        error.message ||
        'No fue posible quitar el producto'
      );

      return false;
    }
  }, [
    token,
    cartLoading,
    refreshCart,
    toast,
  ]);

  // Cambiar cantidad de productos
  const changeQuantity = useCallback(async (
    id,
    quantity
  ) => {
    if (!apiAvailable) {
      dispatch({
        type: 'CHANGE',
        id,
        quantity,
      });

      return true;
    }

    if (!token || cartLoading) return false;

    if (quantity <= 0) {
      return removeFromCart(id);
    }

    try {
      await cartApi.update(
        id,
        quantity,
        token
      );

      await refreshCart(token);

      return true;
    } catch (error) {
      toast(
        error.message ||
        'No fue posible actualizar la cantidad'
      );

      return false;
    }
  }, [
    token,
    cartLoading,
    removeFromCart,
    refreshCart,
    toast,
  ]);

  // Agregar o eliminar favoritos
  const toggleFavorite = useCallback(async (id) => {
    if (!user || (apiAvailable && !token)) {
      toast('Inicia sesión para guardar favoritos');
      return false;
    }

    if (!apiAvailable) {
      setFavorites(current =>
        current.includes(id)
          ? current.filter(value => value !== id)
          : [...current, id]
      );

      return true;
    }

    if (favoritesLoading) {
      toast('Estamos cargando tus favoritos');
      return false;
    }

    try {
      if (favorites.includes(id)) {
        await favoritesApi.remove(id, token);

        setFavorites(current =>
          current.filter(value => value !== id)
        );

        toast('Producto eliminado de favoritos');
      } else {
        await favoritesApi.add(id, token);

        setFavorites(current =>
          current.includes(id)
            ? current
            : [...current, id]
        );

        toast('Producto guardado en favoritos');
      }

      return true;
    } catch (error) {
      toast(
        error.message ||
        'No fue posible actualizar tus favoritos'
      );

      return false;
    }
  }, [
    user,
    token,
    favorites,
    favoritesLoading,
    toast,
  ]);

  // Acceso de demostración sin API
  const loginDemo = useCallback((
    role = 'customer',
    name = 'Cliente NEXBYTE'
  ) => {
    if (apiAvailable) {
      throw new Error(
        'El acceso de demostración no está disponible con una API configurada.'
      );
    }

    const admin = role === 'admin';

    const demoUser = {
      id: admin ? 1 : 2,
      full_name: admin
        ? 'Administración NEXBYTE'
        : name,
      email: admin
        ? 'administracion@nexbyte.cl'
        : 'cliente@ejemplo.cl',
      role: admin ? 'admin' : 'customer',
    };

    setToken(null);
    setUser(demoUser);

    return demoUser;
  }, []);

  // Inicio de sesión real
  const login = useCallback(async ({
    email,
    password,
  }) => {
    if (!apiAvailable) {
      return loginDemo(
        'customer',
        email.split('@')[0] || 'Cliente NEXBYTE'
      );
    }

    const result = await authApi.login(
      email,
      password
    );

    setToken(result.token);
    setUser(result.user);

    return result.user;
  }, [loginDemo]);

  // Registrar cliente
  const register = useCallback(async ({
    name,
    email,
    password,
  }) => {
    if (!apiAvailable) {
      const demoUser = {
        id: Date.now(),
        full_name: name,
        email,
        role: 'customer',
      };

      setUser(demoUser);
      setToken(null);

      return demoUser;
    }

    await authApi.register(
      name,
      email,
      password
    );

    return login({
      email,
      password,
    });
  }, [login]);

  // Cerrar sesión
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setFavorites([]);

    dispatch({
      type: 'CLEAR',
    });

    setCartServerTotal(0);
    setCartOpen(false);
  }, []);

  // Crear productos desde administración
  const createProduct = useCallback(async (form) => {
    if (user?.role !== 'admin') {
      throw new Error(
        'Solo administración puede agregar productos.'
      );
    }

    let product;

    if (apiAvailable) {
      const response = await productsApi.create({
        category_id: form.category_id,
        name: form.name,
        brand: form.brand,
        sku: form.sku,
        description: form.description,
        price_clp: Number(form.price),
        stock: Number(form.stock),
        images: form.image_url
          ? [form.image_url]
          : [],
      }, token);

      product = normalizeProduct({
        ...form,
        ...response,
        image_url: form.image_url,
        description: form.description,
        price_clp: form.price,
        cat: form.cat,
      });
    } else {
      product = {
        id: Date.now(),
        name: form.name,
        brand: form.brand,
        price: Number(form.price),
        cat: form.cat,
        stock: Number(form.stock),
        image: form.image_url,
        desc: form.description,
        tag: 'NOVEDAD',
      };
    }

    setProducts(current => [
      product,
      ...current,
    ]);

    toast('Producto agregado al catálogo');

    return product;
  }, [
    token,
    user,
    toast,
  ]);

  // Total de unidades en el carrito
  const cartQuantity = useMemo(() =>
    cart.reduce(
      (total, item) =>
        total + item.quantity,
      0
    ),
    [cart]
  );

  // Total calculado localmente
  const localCartTotal = useMemo(() =>
    cart.reduce((total, item) => {
      const product = products.find(
        p => p.id === item.id
      );

      return total +
        (product?.price ?? 0) * item.quantity;
    }, 0),
    [cart, products]
  );

  // En producción se utiliza el total de PostgreSQL
  const cartTotal = apiAvailable
    ? cartServerTotal
    : localCartTotal;

  // Estado compartido por toda la aplicación
  const value = useMemo(() => ({
    products,
    cart,
    cartOpen,
    setCartOpen,
    cartQuantity,
    cartTotal,
    cartLoading,
    favorites,
    favoritesLoading,
    user,
    token,
    loading,
    catalogError,
    notification,
    addToCart,
    removeFromCart,
    changeQuantity,
    refreshCart,
    toggleFavorite,
    login,
    loginDemo,
    register,
    logout,
    createProduct,
    toast,
    apiAvailable,
  }), [
    products,
    cart,
    cartOpen,
    cartQuantity,
    cartTotal,
    cartLoading,
    favorites,
    favoritesLoading,
    user,
    token,
    loading,
    catalogError,
    notification,
    addToCart,
    removeFromCart,
    changeQuantity,
    refreshCart,
    toggleFavorite,
    login,
    loginDemo,
    register,
    logout,
    createProduct,
    toast,
  ]);

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);

  if (!context) {
    throw new Error('ShopProvider no encontrado');
  }

  return context;
}
