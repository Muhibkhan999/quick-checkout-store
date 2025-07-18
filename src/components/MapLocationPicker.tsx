import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation } from 'lucide-react';

interface MapLocationPickerProps {
  onLocationSelect: (address: string, coordinates?: [number, number]) => void;
  initialAddress?: string;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({ 
  onLocationSelect, 
  initialAddress = '' 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [manualAddress, setManualAddress] = useState(initialAddress);
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');

  // For demonstration - in production you'd get this from Supabase secrets
  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-74.006, 40.7128], // NYC default
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add click handler to place marker
    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      
      // Remove existing marker
      if (marker.current) {
        marker.current.remove();
      }

      // Add new marker
      marker.current = new mapboxgl.Marker()
        .setLngLat([lng, lat])
        .addTo(map.current!);

      setSelectedCoordinates([lng, lat]);

      // Reverse geocoding to get address
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const address = data.features[0].place_name;
          setManualAddress(address);
        }
      } catch (error) {
        console.error('Error getting address:', error);
      }
    });
  };

  useEffect(() => {
    if (isMapMode && mapboxToken) {
      initializeMap();
    }
    
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [isMapMode, mapboxToken]);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          if (map.current) {
            map.current.flyTo({
              center: [longitude, latitude],
              zoom: 15
            });

            // Remove existing marker
            if (marker.current) {
              marker.current.remove();
            }

            // Add marker at current location
            marker.current = new mapboxgl.Marker()
              .setLngLat([longitude, latitude])
              .addTo(map.current);

            setSelectedCoordinates([longitude, latitude]);

            // Get address for current location
            if (mapboxToken) {
              try {
                const response = await fetch(
                  `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}`
                );
                const data = await response.json();
                
                if (data.features && data.features.length > 0) {
                  const address = data.features[0].place_name;
                  setManualAddress(address);
                }
              } catch (error) {
                console.error('Error getting address:', error);
              }
            }
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleUseSelectedLocation = () => {
    if (isMapMode && selectedCoordinates) {
      onLocationSelect(manualAddress, selectedCoordinates);
    } else {
      onLocationSelect(manualAddress);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Delivery Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={!isMapMode ? "default" : "outline"}
            onClick={() => setIsMapMode(false)}
            size="sm"
          >
            Manual Entry
          </Button>
          <Button
            variant={isMapMode ? "default" : "outline"}
            onClick={() => setIsMapMode(true)}
            size="sm"
          >
            Map Selection
          </Button>
        </div>

        {isMapMode && !mapboxToken && (
          <div className="space-y-2">
            <Label htmlFor="mapboxToken">Mapbox Public Token (Required for Maps)</Label>
            <Input
              id="mapboxToken"
              type="password"
              placeholder="Enter your Mapbox public token"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Get your token from{' '}
              <a 
                href="https://mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
        )}

        {isMapMode && mapboxToken ? (
          <div className="space-y-4">
            <div className="h-64 w-full rounded-lg border">
              <div ref={mapContainer} className="h-full w-full rounded-lg" />
            </div>
            <Button
              variant="outline"
              onClick={handleGetCurrentLocation}
              className="w-full"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Use My Current Location
            </Button>
            {selectedCoordinates && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedCoordinates[1].toFixed(6)}, {selectedCoordinates[0].toFixed(6)}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="address">Delivery Address</Label>
            <textarea
              id="address"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter your full delivery address including street, city, postal code"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              rows={4}
            />
          </div>
        )}

        <Button 
          onClick={handleUseSelectedLocation}
          className="w-full"
          disabled={!manualAddress.trim()}
        >
          Use This Location
        </Button>
      </CardContent>
    </Card>
  );
};

export default MapLocationPicker;