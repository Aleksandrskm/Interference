// components/MapComponent.js
import { Component } from '../core/component.js';

class MapComponent extends Component {
    constructor() {
        super();
        this.map = null;
        this.vectorLayers = [];
        this.project = 'EPSG:3857';
        this.initAttempts = 0;
    }

    render() {
        const container = this.createElement('div', {
            className: 'map-container',
            style: {
                width: '100%',
                height: '500px',
                backgroundColor: '#e9ecef',
                position: 'relative',
                display: 'block'
            }
        });

        const mapDiv = this.createElement('div', {
            id: 'map',
            style: {
                width: '100%',
                height: '100%',
                display: 'block'
            }
        });

        container.appendChild(mapDiv);
        this.element = container;

        console.log('MapComponent rendered');

        return container;
    }

    mount() {
        console.log('MapComponent mounting...');

        // Проверяем наличие OpenLayers
        if (typeof ol === 'undefined') {
            console.error('OpenLayers not loaded, waiting...');
            if (this.initAttempts < 10) {
                this.initAttempts++;
                setTimeout(() => this.mount(), 500);
            } else {
                this.showError('OpenLayers не загрузилась');
            }
            return;
        }

        console.log('OpenLayers is available');

        // Небольшая задержка для гарантии, что DOM готов
        setTimeout(() => {
            this.initMap();
        }, 100);
    }

    initMap() {
        console.log('Initializing map...');

        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found!');
            this.showError('Элемент map не найден');
            return;
        }

        // Проверяем размеры
        const rect = mapElement.getBoundingClientRect();
        console.log('Map dimensions:', rect.width, 'x', rect.height);

        if (rect.width === 0 || rect.height === 0) {
            console.warn('Map has zero size, retrying...');
            setTimeout(() => this.initMap(), 200);
            return;
        }

        // Очищаем элемент
        while (mapElement.firstChild) {
            mapElement.removeChild(mapElement.firstChild);
        }

        try {
            // Создаем слой с вашим источником тайлов
            const tileLayer = new ol.layer.Tile({
                source: new ol.source.XYZ({
                    url: 'http://185.192.247.60:8666/tiles_disk/{z}/{x}/{y}.png',
                    crossOrigin: 'anonymous',
                }),
            });

            // Создаем карту
            this.map = new ol.Map({
                layers: [tileLayer],
                target: mapElement,
                view: new ol.View({
                    center: ol.proj.fromLonLat([80, 0]),
                    zoom: 1,
                    maxZoom: 9
                }),
            });

            console.log('Map created successfully');

            // Создаем векторный слой для фигур
            this.vectorLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
                visible: true
            });

            this.map.addLayer(this.vectorLayer);

            // Обновляем размер карты
            setTimeout(() => {
                if (this.map) {
                    this.map.updateSize();
                    console.log('Map size updated');

                    // Проверяем, что карта отрисовалась
                    const viewport = mapElement.querySelector('.ol-viewport');
                    console.log('Viewport created:', !!viewport);

                    if (viewport) {
                        const canvas = viewport.querySelector('canvas');
                        console.log('Canvas created:', !!canvas);
                        if (canvas) {
                            console.log('Canvas size:', canvas.width, 'x', canvas.height);
                        }
                    }

                    // Добавляем тестовую точку
                    try {
                        const testPoint = new ol.Feature({
                            geometry: new ol.geom.Point(ol.proj.fromLonLat([80, 50]))
                        });
                        // this.vectorLayer.getSource().addFeature(testPoint);
                        console.log('Test point added');
                    } catch (err) {
                        console.warn('Could not add test point:', err);
                    }
                }
            }, 100);

            // Обработка ошибок загрузки тайлов
            tileLayer.getSource().on('tileloaderror', (event) => {
                console.warn('Tile load error:', event.tile.getKey());
                console.log('Tile server might be inaccessible. Check if http://185.192.247.60:8666 is reachable');
            });

            tileLayer.getSource().on('tileloadend', (event) => {
                console.log('Tile loaded:', event.tile.getKey());
            });

        } catch (error) {
            console.error('Error creating map:', error);
            this.showError(`Ошибка: ${error.message}`);
        }
    }

    drawRectangle(latLN, lonLN, latPV, lonPV, color = '#ff0000') {
        if (!this.map || typeof ol === 'undefined') {
            console.warn('Cannot draw rectangle: map not ready');
            return null;
        }

        try {
            const transformCoordinates = (lon, lat) => {
                return ol.proj.transform([+lon, +lat], 'EPSG:4326', this.project);
            };

            const coord = [
                transformCoordinates(lonPV, latLN),
                transformCoordinates(lonPV, latPV),
                transformCoordinates(lonLN, latPV),
                transformCoordinates(lonLN, latLN),
                transformCoordinates(lonPV, latLN)
            ];

            const polygon = new ol.Feature({
                geometry: new ol.geom.Polygon([coord])
            });

            polygon.setStyle(new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: color,
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: this.hexToRgba(color, 0.3)
                })
            }));

            if (this.vectorLayer && this.vectorLayer.getSource()) {
                this.vectorLayer.getSource().addFeature(polygon);
                console.log('Rectangle drawn');
            }

            return polygon;
        } catch (error) {
            console.error('Error drawing rectangle:', error);
            return null;
        }
    }

    addPoint(lon, lat, color = '#ff0000') {
        if (!this.map || typeof ol === 'undefined') {
            console.warn('Cannot add point: map not ready');
            return null;
        }

        try {
            const point = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([+lon, +lat]))
            });

            point.setStyle(new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 6,
                    fill: new ol.style.Fill({ color: color }),
                    stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
                })
            }));

            if (this.vectorLayer && this.vectorLayer.getSource()) {
                this.vectorLayer.getSource().addFeature(point);
                console.log(`Point added at [${lon}, ${lat}]`);
            }

            return point;
        } catch (error) {
            console.error('Error adding point:', error);
            return null;
        }
    }

    clearAll() {
        if (!this.map) return;

        if (this.vectorLayer && this.vectorLayer.getSource()) {
            this.vectorLayer.getSource().clear();
            console.log('All drawings cleared');
        }
    }

    hexToRgba(hex, alpha) {
        if (hex.startsWith('rgba')) return hex;
        if (hex.startsWith('rgb')) {
            return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        }

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    showError(message) {
        console.error('Map error:', message);
        if (this.element) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                background-color: #f8d7da;
                color: #721c24;
                border-radius: 4px;
                padding: 15px;
                text-align: center;
                font-family: sans-serif;
                z-index: 1000;
                font-size: 14px;
            `;
            errorDiv.innerHTML = `
                <strong>⚠️ Ошибка карты</strong><br>
                ${message}<br>
                <small style="font-size: 12px; margin-top: 5px; display: block;">
                    Проверьте доступность сервера: http://185.192.247.60:8666
                </small>
            `;

            const existingError = this.element.querySelector('.map-error');
            if (existingError) {
                existingError.remove();
            }
            errorDiv.className = 'map-error';
            this.element.style.position = 'relative';
            this.element.appendChild(errorDiv);
        }
    }

    unmount() {
        console.log('MapComponent unmounting...');
        if (this.map) {
            this.map.setTarget(null);
            this.map = null;
        }
    }
}

export default MapComponent;