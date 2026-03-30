/**
 * Класс, содержащий методы для работы с проекцией карты.
 */
export class ViewUtils {

    /**
     * Устанавливает проекцию карты. Если проекция уже установлена, то функция ничего не делает.
     * @param {ol.Map} map - объект карты.
     * @param {string} projection - код проекции, например 'EPSG:4326', 'EPSG:3857'.
     */
    static setProjection(map, projection) {
        // Получаем свойства текущего представления карты.
        const properties = map.getView().getProperties();
        // Получаем последнюю установленную проекцию или используем проекцию по умолчанию.
        const lastProjection = properties['projection'] || 'EPSG:3857';
        // Если проекция уже установлена, то ничего не делаем.
        if (lastProjection === projection) { return; }
        // Устанавливаем новую проекцию.
        properties['projection'] = projection;
        // Если центральная точка установлена, то переводим ее в новую проекцию.
        if (properties['center']) {
            properties['center'] = ol.proj.transform(properties['center'], lastProjection, projection);
        }
        // Создаем новое представление с новыми свойствами.
        const view = new ol.View(properties)
        // Устанавливаем уровень приближения или используем уровень по умолчанию.
        view.setZoom(properties['zoom'] || 1);
        // Устанавливаем новое представление на карту.
        map.setView(view);

        // Переводим слои в новую проекцию.
        this.transformLayersProjection(map, lastProjection, projection);
    }

    /**
     * Переводит слои в новую проекцию.
     * @param {ol.Map} map - объект карты.
     * @param {string} lastProjection - код проекции последней установленной карты.
     * @param {string} projection - код проекции новой карты.
     */
    static transformLayersProjection(map, lastProjection, projection) {
        // Получаем все слои карты.
        const layers = map.getLayers();
        // Переводим слои в новую проекцию.
        layers.forEach((layer) => {
            if (layer instanceof ol.layer.Vector) {
                this.transformLayerProjection(layer, lastProjection, projection);
            }
        });
    };

    /**
     * Переводит геометрию слоя в новую проекцию.
     * @param {ol.layer.Vector} layer - слой, геометрия которого нужно перевести.
     * @param {string} lastProjection - код проекции последней установленной карты.
     * @param {string} projection - код проекции новой карты.
     */
    static transformLayerProjection(layer, lastProjection, projection) {
        // Получаем источник слоя.
        const source = layer.getSource();
        // Переводим геометрию слоя в новую проекцию.
        source.forEachFeature((feature) => {
            feature.setGeometry(feature.getGeometry().transform(lastProjection, projection));
        })
    }

    /**
     * Получает объект проекции карты.
     * @param {ol.Map} map - объект карты.
     * @returns {ol.proj.Projection} - объект проекции карты.
     */
    static getProjection(map) {
        return map.getView().getProjection();
    }

    /**
     * Получает код проекции карты.
     * @param {ol.Map} map - объект карты.
     * @returns {string} - код проекции карты.
     */
    static getProjectionCode(map) {
        return map.getView().getProjection().getCode();
    }
}