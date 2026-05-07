// components/SpectrumChart.js
// Специальный компонент для отображения спектрограмм с прямоугольниками сигналов и помех

export class SpectrumChart {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.canvas = null;
        this.ctx = null;
        this.tooltip = null;
        this.init();
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.createTooltip();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        this.resize();
        this.bindEvents();
    }

    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.style.position = 'fixed';
        this.tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        this.tooltip.style.color = 'white';
        this.tooltip.style.padding = '8px 12px';
        this.tooltip.style.borderRadius = '6px';
        this.tooltip.style.fontSize = '12px';
        this.tooltip.style.fontFamily = 'monospace';
        this.tooltip.style.pointerEvents = 'none';
        this.tooltip.style.zIndex = '10000';
        this.tooltip.style.display = 'none';
        this.tooltip.style.whiteSpace = 'nowrap';
        document.body.appendChild(this.tooltip);
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.draw();
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            this.hideTooltip();
            return;
        }

        const dataPoint = this.getDataPointAt(x, y);
        if (dataPoint) {
            this.showTooltip(e.clientX, e.clientY, dataPoint);
        } else {
            this.hideTooltip();
        }
    }

    getDataPointAt(x, y) {
        const data = this.config.data;
        if (!data || !data.length) return null;

        const padding = { left: 60, right: 30, top: 30, bottom: 50 };
        const width = this.canvas.width;
        const chartWidth = width - padding.left - padding.right;

        if (x < padding.left || x > padding.left + chartWidth) return null;

        const chartHeight = this.canvas.height - padding.top - padding.bottom;
        if (y < padding.top || y > padding.top + chartHeight) return null;

        const step = chartWidth / (data.length - 1);
        const mouseXInChart = x - padding.left;
        let dataIndex = Math.round(mouseXInChart / step);
        dataIndex = Math.max(0, Math.min(dataIndex, data.length - 1));

        const { f1MHz, f2MHz } = this.config;
        const freq = f1MHz + (f2MHz - f1MHz) * (dataIndex / (data.length - 1));

        return {
            label: freq.toFixed(3),
            value: data[dataIndex],
            index: dataIndex
        };
    }

    showTooltip(clientX, clientY, dataPoint) {
        this.tooltip.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">${dataPoint.label} МГц</div>
            <div style="color: #64b5f6;">Амплитуда: ${dataPoint.value.toFixed(2)} дБ</div>
        `;
        this.tooltip.style.display = 'block';

        const tooltipRect = this.tooltip.getBoundingClientRect();
        let left = clientX + 15;
        let top = clientY + 15;

        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = clientX - tooltipRect.width - 15;
        }
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = clientY - tooltipRect.height - 15;
        }
        if (left < 10) left = 10;
        if (top < 10) top = 10;

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    draw() {
        if (!this.ctx || this.canvas.width === 0 || this.canvas.height === 0) return;
        if (!this.config.data || !this.config.data.length) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const padding = { left: 60, right: 30, top: 30, bottom: 50 };
        const width = this.canvas.width;
        const height = this.canvas.height;
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        this.drawAxes(padding, chartWidth, chartHeight);
        this.drawGrid(padding, chartWidth, chartHeight);
        this.drawRectangles(padding, chartWidth, chartHeight);
        this.drawData(padding, chartWidth, chartHeight);
        this.drawLabels(padding, chartWidth, chartHeight);
    }

    drawAxes(padding, chartWidth, chartHeight) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;

        this.ctx.moveTo(padding.left, padding.top);
        this.ctx.lineTo(padding.left, padding.top + chartHeight);
        this.ctx.moveTo(padding.left, padding.top + chartHeight);
        this.ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(padding.left - 5, padding.top);
        this.ctx.lineTo(padding.left, padding.top - 5);
        this.ctx.lineTo(padding.left + 5, padding.top);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(padding.left + chartWidth, padding.top + chartHeight - 5);
        this.ctx.lineTo(padding.left + chartWidth + 5, padding.top + chartHeight);
        this.ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight + 5);
        this.ctx.fill();
    }

    drawGrid(padding, chartWidth, chartHeight) {
        const yTicks = 5;
        const xTicks = 8;

        this.ctx.save();
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 0.5;

        for (let i = 0; i <= yTicks; i++) {
            const y = padding.top + (chartHeight / yTicks) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(padding.left, y);
            this.ctx.lineTo(padding.left + chartWidth, y);
            this.ctx.stroke();
        }

        for (let i = 0; i <= xTicks; i++) {
            const x = padding.left + (chartWidth / xTicks) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, padding.top);
            this.ctx.lineTo(x, padding.top + chartHeight);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawRectangles(padding, chartWidth, chartHeight) {
        const { usefulSignals = [], noises = [], f1MHz, f2MHz, data } = this.config;

        if (usefulSignals.length === 0 && noises.length === 0) {
            return;
        }

        const minValue = Math.min(...data);
        const maxValue = Math.max(...data);
        const valueRange = maxValue - minValue || 1;

        const drawRect = (rect, color, label) => {
            let rectF1 = rect.f1;
            let rectF2 = rect.f2;

            if (rectF1 > 1e6) rectF1 = rectF1 / 1e6;
            if (rectF2 > 1e6) rectF2 = rectF2 / 1e6;

            if (rectF2 < f1MHz || rectF1 > f2MHz) return;

            const x1 = padding.left + ((rectF1 - f1MHz) / (f2MHz - f1MHz)) * chartWidth;
            const x2 = padding.left + ((rectF2 - f1MHz) / (f2MHz - f1MHz)) * chartWidth;

            const rectX = Math.max(padding.left, Math.min(x1, x2));
            const rectWidth = Math.abs(x2 - x1);

            if (rectWidth <= 1) return;

            let yTop = padding.top;
            let rectHeight = chartHeight;

            if (rect.max !== undefined && rect.max > minValue) {
                const boundedMax = Math.min(Math.max(rect.max, minValue), maxValue);
                const normalizedY = (boundedMax - minValue) / valueRange;
                yTop = padding.top + chartHeight - normalizedY * chartHeight;
                rectHeight = padding.top + chartHeight - yTop;
            }

            // Рисуем заливку
            this.ctx.save();
            this.ctx.globalAlpha = 0.25;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(rectX, yTop, rectWidth, rectHeight);

            // Рисуем сплошную рамку (убрали пунктир)
            this.ctx.globalAlpha = 0.8;
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([]); // Сплошная линия
            this.ctx.strokeRect(rectX, yTop, rectWidth, rectHeight);

            // Подпись
            if (rectWidth > 30) {
                this.ctx.globalAlpha = 0.9;
                this.ctx.font = '10px sans-serif';
                this.ctx.fillStyle = color;
                this.ctx.textAlign = 'center';
                const textX = rectX + rectWidth / 2;
                const textY = yTop - 5;
                if (textY > padding.top + 10) {
                    this.ctx.fillText(label, textX, textY);
                }
            }

            this.ctx.restore();
        };

        usefulSignals.forEach(signal => {
            if (signal.f1 && signal.f2 && signal.f1 !== 0 && signal.f2 !== 0) {
                drawRect(signal, '#4caf50', 'Сигнал');
            }
        });

        noises.forEach(noise => {
            if (noise.f1 && noise.f2 && noise.f1 !== 0 && noise.f2 !== 0) {
                drawRect(noise, '#f44336', 'Помеха');
            }
        });
    }

    drawData(padding, chartWidth, chartHeight) {
        const data = this.config.data;
        if (!data.length) return;

        const minValue = Math.min(...data);
        const maxValue = Math.max(...data);
        const valueRange = maxValue - minValue || 1;

        const points = data.map((value, index) => {
            const x = padding.left + (chartWidth / (data.length - 1)) * index;
            const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            return { x, y, value };
        });

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#2196f3';
        this.ctx.lineWidth = 1.5;

        points.forEach((point, i) => {
            if (i === 0) this.ctx.moveTo(point.x, point.y);
            else this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, padding.top + chartHeight);
        points.forEach(point => {
            this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
        this.ctx.fill();
    }

    drawLabels(padding, chartWidth, chartHeight) {
        const data = this.config.data;
        const { f1MHz, f2MHz } = this.config;

        if (!data.length) return;

        const minValue = Math.min(...data);
        const maxValue = Math.max(...data);

        const xTickCount = 8;
        for (let i = 0; i <= xTickCount; i++) {
            const freq = f1MHz + (f2MHz - f1MHz) * (i / xTickCount);
            const x = padding.left + (chartWidth / xTickCount) * i;

            this.ctx.save();
            this.ctx.fillStyle = '#666';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(freq.toFixed(2), x, padding.top + chartHeight + 20);
            this.ctx.restore();
        }

        const yTickCount = 5;
        for (let i = 0; i <= yTickCount; i++) {
            const value = minValue + (maxValue - minValue) * (i / yTickCount);
            const y = padding.top + chartHeight - (chartHeight / yTickCount) * i;

            this.ctx.save();
            this.ctx.fillStyle = '#666';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(value.toFixed(1), padding.left - 8, y + 3);
            this.ctx.restore();
        }

        this.ctx.save();
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px sans-serif';

        this.ctx.textAlign = 'center';
        this.ctx.fillText('Частота (МГц)', padding.left + chartWidth / 2, this.canvas.height - 10);

        this.ctx.save();
        this.ctx.translate(20, padding.top + chartHeight / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Амплитуда (дБ)', 0, 0);
        this.ctx.restore();

        this.ctx.restore();
    }

    update(config) {
        this.config = { ...this.config, ...config };
        this.draw();
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
    }
}

export default SpectrumChart;