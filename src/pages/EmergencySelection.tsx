import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/icons.css';
import earthquakeIcon from '../assets/earthquake.svg';
import rainsIcon from '../assets/rains.svg';
import volcanoIcon from '../assets/volcano.svg';
import tsunamiIcon from '../assets/tsunami.svg';

interface EmergencyItem {
  ambito: string;
  descripcion: string;
  emergencia: string;
  emergencia_id: number;
  identificador: string;
  usuario: string;
}

const iconFor = (identificador: string) => {
  const key = String(identificador || '').toLowerCase();
  if (key.includes('sismo') || key.includes('terrem')) return 'icon icon-terremoto';
  if (key.includes('erup') || key.includes('volcan')) return 'icon icon-volcan';
  if (key.includes('lluv') || key.includes('invern') || key.includes('inun')) return 'icon icon-lluvia';
  if (key.includes('tsuna') || key.includes('tsunami')) return 'icon icon-tsunami';
  return 'icon icon-circle';
};

const iconSrcFor = (identificador: string): string | null => {
  const key = String(identificador || '').toLowerCase();
  if (key.includes('sismo') || key.includes('terrem')) return earthquakeIcon;
  if (key.includes('erup') || key.includes('volcan')) return volcanoIcon;
  if (key.includes('lluv') || key.includes('invern') || key.includes('inun')) return rainsIcon;
  if (key.includes('tsuna') || key.includes('tsunami')) return tsunamiIcon;
  return null;
};

const iconForbk = (identificador: string) => {
  const key = String(identificador || '').toLowerCase();
  if (key.includes('sismo') || key.includes('terrem')) return 'linear-gradient(to top, #f0f0f0, #ff7d7d)';
  if (key.includes('erup') || key.includes('volcan')) return 'linear-gradient(to top, #f0f0f0, #735fc1)';
  if (key.includes('lluv') || key.includes('invern') || key.includes('inun')) return 'linear-gradient(to top, #f0f0f0, #7db1ff)';
  if (key.includes('tsuna') || key.includes('tsunami')) return 'linear-gradient(to top, #f0f0f0, #42c6ff)';
  return 'linear-gradient(to top, #f0f0f0, #cccccc)';
};

const EmergencySelection: React.FC = () => {
  const navigate = useNavigate();
  const { loginResponse, datosLogin, setSelectedEmergenciaId, authFetch } = useAuth();
  const [items, setItems] = useState<EmergencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBase = process.env.REACT_APP_API_URL || '/api';

  const username = useMemo(() => {
    return datosLogin?.usuario_login || loginResponse?.usuario || '';
  }, [datosLogin?.usuario_login, loginResponse?.usuario]);

  useEffect(() => {
    const fetchEmergencias = async () => {
      if (!username) return; // wait for username to be available
      setLoading(true);
      setError(null);
      try {
        const url = `${apiBase}/emergencias/usuario/${encodeURIComponent(username)}`;
        const res = await authFetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
        const data = (await res.json()) as EmergencyItem[];
        setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar la lista');
      } finally {
        setLoading(false);
      }
    };
    fetchEmergencias();
  }, [username]);

  const handleSelect = (id: number, name: string) => {
    setSelectedEmergenciaId(id);
    try {
      localStorage.setItem('selectedEmergenciaName', name || '');
    } catch {}
    navigate('/');
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center min-vh-100" 
    style={{ backgroundColor: '#fff', color: '#0b0b0b' }}>
      <div className="text-center mb-5">
        <h1 className="fw-bold" style={{ fontSize: 36 }}>Selecciona una emergencia</h1>
        <div className="text-muted">Elige con cuál emergencia deseas trabajar</div>
      </div>

      {loading && (
        <div className="text-muted">Cargando emergencias…</div>
      )}

      {error && !loading && (
        <div className="text-danger mb-4">{error}</div>
      )}

      {!loading && !error && (
        <div className="d-flex flex-wrap justify-content-center gap-4" style={{ maxWidth: 960 }}>
          {items.map((it) => (
            <button
              key={it.emergencia_id}
              onClick={() => handleSelect(it.emergencia_id, it.emergencia)}
              className="d-flex flex-column align-items-center"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#0b0b0b'
              }}
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  borderColor: '#0b0b0b',
                  borderWidth: 2,
                  background: (iconForbk(it.identificador || it.emergencia || it.descripcion)),
                  boxShadow: '0 0 0 3px #fff',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px transparent';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px transparent';
                }}
              >
              {(() => {
                const src = iconSrcFor(it.identificador || it.emergencia || it.descripcion);
                if (!src) return null;
                return <img src={src} alt="icono" style={{ width: 70, height: 70 }} />;
              })()}
              </div>
              <div className="mt-3 text-muted" 
                   style={{ fontSize: 18, maxWidth: 'min-content' }} >{it.emergencia}</div>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-muted">No hay emergencias disponibles.</div>
      )}
    </div>
  );
};

export default EmergencySelection;
