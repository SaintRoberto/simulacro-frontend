import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { LatLng, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface MapSelectorProps {
  latitud?: number;
  longitud?: number;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
  placeholder?: string;
}

const MapSelector: React.FC<MapSelectorProps> = ({
  latitud,
  longitud,
  onLocationChange,
  height = '400px',
  placeholder = 'Buscar dirección...'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // Centro inicial (Quito, Ecuador)
  const defaultCenter: [number, number] = latitud && longitud
    ? [latitud, longitud]
    : [-0.0014, -78.4678]; // Centro de Quito, Ecuador

  const defaultZoom = latitud && longitud ? 14 : 13;

  // Componente para manejar clics en el mapa
  const LocationMarker = () => {
    const [position, setPosition] = useState<LatLng | null>(
      latitud && longitud ? new LatLng(latitud, longitud) : null
    );

    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        onLocationChange(e.latlng.lat, e.latlng.lng);
      },
    });

    return position === null ? null : (
      <Marker position={position}>
        <Popup>
          Coordenadas: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </Popup>
      </Marker>
    );
  };

  // Función de búsqueda
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const provider = new OpenStreetMapProvider();
      const results = await provider.search({ query });
      setSearchResults(results);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Manejar selección de resultado de búsqueda
  const handleResultSelect = (result: any) => {
    if (mapRef.current) {
      const lat = result.y;
      const lng = result.x;
      mapRef.current.setView([lat, lng], 16);
      onLocationChange(lat, lng);
      setSearchQuery(result.label);
      setSearchResults([]);
    }
  };

  // Efecto para actualizar el mapa cuando cambian las coordenadas externas
  useEffect(() => {
    if (latitud && longitud && mapRef.current) {
      mapRef.current.setView([latitud, longitud], 16);
      // Forzar re-render del mapa
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [latitud, longitud]);

  return (
    <div className="map-selector">
      {/* Campo de búsqueda */}
      <div className="mb-2 position-relative">
        <input
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          style={{ borderRadius: '4px' }}
        />
        {isSearching && (
          <div className="position-absolute top-50 end-0 translate-middle-y me-2">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Buscando...</span>
            </div>
          </div>
        )}

        {/* Resultados de búsqueda */}
        {searchResults.length > 0 && (
          <div
            className="position-absolute bg-white border rounded shadow-sm mt-1"
            style={{
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto',
              width: '100%'
            }}
          >
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="p-2 border-bottom cursor-pointer hover-bg-light"
                style={{ cursor: 'pointer' }}
                onClick={() => handleResultSelect(result)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <small className="text-muted">{result.label}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div style={{ height, borderRadius: '4px', overflow: 'hidden' }}>
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          ref={(map) => {
            mapRef.current = map;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationMarker />
        </MapContainer>
      </div>

    

      
    </div>
  );
};

export default MapSelector;