import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { LatLng, Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface MapSelectorProps {
  latitud?: number | null;
  longitud?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
  placeholder?: string;
  initializeWithDefault?: boolean;
}

type SearchResult = {
  x: number;
  y: number;
  label: string;
};

const MITAD_DEL_MUNDO: [number, number] = [-0.0022, -78.4558];
const searchCache = new Map<string, SearchResult[]>();

const hasCoordinates = (latitud?: number | null, longitud?: number | null) =>
  Number.isFinite(latitud) && Number.isFinite(longitud);

const LocationMarker: React.FC<{
  latitud: number;
  longitud: number;
  onLocationChange: (lat: number, lng: number) => void;
}> = ({ latitud, longitud, onLocationChange }) => {
  const [position, setPosition] = useState<LatLng>(new LatLng(latitud, longitud));

  useEffect(() => {
    setPosition(new LatLng(latitud, longitud));
  }, [latitud, longitud]);

  useMapEvents({
    click(event) {
      setPosition(event.latlng);
      onLocationChange(event.latlng.lat, event.latlng.lng);
    },
  });

  return (
    <Marker position={position}>
      <Popup>
        Coordenadas: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
      </Popup>
    </Marker>
  );
};

const MapSelector: React.FC<MapSelectorProps> = ({
  latitud,
  longitud,
  onLocationChange,
  height = '400px',
  placeholder = 'Buscar dirección...',
  initializeWithDefault = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const mapRef = useRef<LeafletMap | null>(null);
  const initializedDefaultRef = useRef(false);

  const coordinatesAreValid = hasCoordinates(latitud, longitud);
  const effectivePosition: [number, number] = coordinatesAreValid
    ? [Number(latitud), Number(longitud)]
    : MITAD_DEL_MUNDO;
  const defaultZoom = coordinatesAreValid || initializeWithDefault ? 15 : 13;

  const handleSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setSearchMessage('Ingrese al menos 3 caracteres para buscar.');
      return;
    }

    const cacheKey = query.toLocaleLowerCase();
    const cachedResults = searchCache.get(cacheKey);
    if (cachedResults) {
      setSearchResults(cachedResults);
      setSearchMessage(cachedResults.length ? '' : 'No se encontraron lugares.');
      return;
    }

    setIsSearching(true);
    setSearchMessage('');
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '5',
        countrycodes: 'ec',
        'accept-language': 'es',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { accept: 'application/json' },
      });
      if (response.status === 429) throw new Error('rate_limit');
      if (!response.ok) throw new Error('search_failed');

      const data = await response.json();
      const results: SearchResult[] = (Array.isArray(data) ? data : [])
        .map((result: any) => ({
          x: Number(result.lon),
          y: Number(result.lat),
          label: String(result.display_name ?? ''),
        }))
        .filter((result: SearchResult) => Number.isFinite(result.x) && Number.isFinite(result.y));

      searchCache.set(cacheKey, results);
      setSearchResults(results);
      setSearchMessage(results.length ? '' : 'No se encontraron lugares.');
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setSearchResults([]);
      setSearchMessage(
        error instanceof Error && error.message === 'rate_limit'
          ? 'El servicio de búsqueda está temporalmente ocupado. Espere unos segundos e intente nuevamente.'
          : 'No se pudo consultar el lugar. Intente nuevamente.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    mapRef.current?.setView([result.y, result.x], 11);
    onLocationChange(result.y, result.x);
    setSearchQuery(result.label);
    setSearchResults([]);
    setSearchMessage('');
  };

  useEffect(() => {
    if (!coordinatesAreValid || !mapRef.current) return;
    mapRef.current.setView([Number(latitud), Number(longitud)], 16);
    const timeoutId = window.setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => window.clearTimeout(timeoutId);
  }, [coordinatesAreValid, latitud, longitud]);

  useEffect(() => {
    if (!initializeWithDefault || coordinatesAreValid || initializedDefaultRef.current) return;
    initializedDefaultRef.current = true;
    onLocationChange(MITAD_DEL_MUNDO[0], MITAD_DEL_MUNDO[1]);
  }, [coordinatesAreValid, initializeWithDefault, onLocationChange]);

  return (
    <div className="map-selector">
      <form className="mb-2 position-relative" onSubmit={handleSearch}>
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button className="btn btn-outline-secondary" type="submit" disabled={isSearching}>
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {searchMessage && <small className="d-block mt-1 text-muted">{searchMessage}</small>}

        {searchResults.length > 0 && (
          <div
            className="position-absolute bg-white border rounded shadow-sm mt-1"
            style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto', width: '100%' }}
          >
            {searchResults.map((result) => (
              <button
                key={`${result.y}-${result.x}`}
                type="button"
                className="d-block w-100 p-2 border-0 border-bottom bg-white text-start"
                onClick={() => handleResultSelect(result)}
              >
                <small className="text-muted">{result.label}</small>
              </button>
            ))}
          </div>
        )}
      </form>

      <div style={{ height, borderRadius: '4px', overflow: 'hidden' }}>
        <MapContainer
          center={effectivePosition}
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
          {(coordinatesAreValid || initializeWithDefault) && (
            <LocationMarker
              latitud={effectivePosition[0]}
              longitud={effectivePosition[1]}
              onLocationChange={onLocationChange}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapSelector;
