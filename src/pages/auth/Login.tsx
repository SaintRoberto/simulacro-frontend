import React, { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { useNavigate, Link } from 'react-router-dom';
import { classNames } from 'primereact/utils';
import { Message } from 'primereact/message';
import { useAuth } from '../../context/AuthContext';

export const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    user: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  // Al cargar la pantalla de login, eliminar cualquier token previo
  useEffect(() => {
    localStorage.removeItem('token');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const ok = await login(formData.user, formData.password);
      if (ok) {
        navigate('/');
      } else {
        setError('Credenciales inválidas. Por favor, intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 auth-bg">
      <Card className="w-100 auth-card p-3 p-md-4" style={{ maxWidth: 420 }}>
        <div className="auth-header mb-3">
          <div className="brand-badge mb-3">
            <i className="pi pi-shield"></i>
          </div>
          <h4 className="mb-1">Bienvenido</h4>
          <div className="text-muted">Ingresa para continuar</div>
        </div>
        {error && (
          <div className="mb-3">
            <Message severity="error" text={error} />
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div className="field">
            <label htmlFor="user" className="form-label mb-1">Usuario</label>
            <InputText
              id="user"
              name="user"
              type="user"
              value={formData.user}
              onChange={handleChange}
              className={classNames('w-100', { 'p-invalid': error })}
              required
            />
          </div>
          
          <div className="field">
            <label htmlFor="password" className="form-label mb-1">Contraseña</label>
            <Password
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              toggleMask
              feedback={false}
              className={classNames('w-100', { 'p-invalid': error })}
              inputStyle={{ width: '100%' }}
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className="d-flex justify-content-end mb-3">
            <Link to="/forgot-password" className="small text-primary text-decoration-none">
              ¿Olvidó su contraseña?
            </Link>
          </div>
          
          <Button 
            type="submit" 
            label="Iniciar Sesión" 
            icon="pi pi-sign-in"
            loading={loading}
            className="w-100"
          />
          
          <div className="text-center mt-3">
            <span className="text-muted">¿No tienes una cuenta? </span>
            <Link to="/register" className="fw-medium text-decoration-none text-primary">
              Regístrate
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
};
