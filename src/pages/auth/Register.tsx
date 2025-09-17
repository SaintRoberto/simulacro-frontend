import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { useNavigate, Link } from 'react-router-dom';
import { classNames } from 'primereact/utils';
import { Message } from 'primereact/message';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful registration
      navigate('/login', { state: { registrationSuccess: true } });
    } catch (err) {
      setError('Error al registrar el usuario. Por favor, intente nuevamente.');
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

  const passwordHeader = <h6>Ingrese una contraseña segura</h6>;
  const passwordFooter = (
    <React.Fragment>
      <p className="mt-2">Requisitos:</p>
      <ul className="pl-2 ml-2 mt-0" style={{ lineHeight: '1.5' }}>
        <li>Mínimo 8 caracteres</li>
        <li>Al menos una letra mayúscula</li>
        <li>Al menos un número</li>
        <li>Al menos un carácter especial</li>
      </ul>
    </React.Fragment>
  );

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 auth-bg">
      <Card className="w-100 auth-card p-3 p-md-4" style={{ maxWidth: 480 }}>
        <div className="auth-header mb-3">
          <div className="brand-badge mb-3">
            <i className="pi pi-user-plus"></i>
          </div>
          <h4 className="mb-1">Crear cuenta</h4>
          <div className="text-muted">Configura tu acceso en segundos</div>
        </div>
        {error && (
          <div className="mb-3">
            <Message severity="error" text={error} />
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div className="field">
            <label htmlFor="name" className="block text-900 font-medium mb-2">
              Nombre Completo
            </label>
            <InputText
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-100"
              placeholder="Tu nombre completo"
              required
            />
          </div>
          
          <div className="field">
            <label htmlFor="email" className="block text-900 font-medium mb-2">
              Correo Electrónico
            </label>
            <InputText
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-100"
              placeholder="tu@correo.com"
              required
            />
          </div>
          
          <div className="field">
            <label htmlFor="password" className="block text-900 font-medium mb-2">
              Contraseña
            </label>
            <Password
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              toggleMask
              header={passwordHeader}
              footer={passwordFooter}
              className="w-100"
              inputStyle={{ width: '100%' }}
              placeholder="••••••••"
              required
            />
            <div className="form-hint mt-1">Mínimo 8 caracteres</div>
          </div>
          
          <div className="field">
            <label htmlFor="confirmPassword" className="block text-900 font-medium mb-2">
              Confirmar Contraseña
            </label>
            <Password
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              toggleMask
              feedback={false}
              className="w-100"
              inputStyle={{ width: '100%' }}
              placeholder="••••••••"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            label="Registrarse" 
            icon="pi pi-user-plus"
            loading={loading}
            className="w-100"
          />
          
          <div className="text-center mt-3">
            <span className="text-muted">¿Ya tienes una cuenta? </span>
            <Link to="/login" className="fw-medium text-decoration-none text-primary">
              Iniciar Sesión
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
};
