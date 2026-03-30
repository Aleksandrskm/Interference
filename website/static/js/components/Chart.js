// Универсальный компонент для графиков
class Chart {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.canvas = null;
        this.ctx = null;
        this.tooltip = null;
        this.animationFrame = null;
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
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.tooltip.style.color = 'white';
        this.tooltip.style.padding = '8px 12px';
        this.tooltip.style.borderRadius = '4px';
        this.tooltip.style.fontSize = '12px';
        this.tooltip.style.pointerEvents = 'none';
        this.tooltip.style.zIndex = '1000';
        this.tooltip.style.display = 'none';
        this.container.style.position = 'relative';
        this.container.appendChild(this.tooltip);
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dataPoint = this.getDataPointAt(x);
        if (dataPoint) {
            this.showTooltip(e.clientX, e.clientY, dataPoint);
        } else {
            this.hideTooltip();
        }
    }

    getDataPointAt(x) {
        if (!this.config.data.labels.length) return null;

        const width = this.canvas.width;
        const padding = this.getPadding();
        const chartWidth = width - padding.left - padding.right;
        const step = chartWidth / (this.config.data.labels.length - 1);

        const dataIndex = Math.round((x - padding.left) / step);

        if (dataIndex >= 0 && dataIndex < this.config.data.labels.length) {
            const dataset = this.config.data.datasets[0];
            return {
                label: this.config.data.labels[dataIndex],
                value: dataset.data[dataIndex],
                index: dataIndex
            };
        }
        return null;
    }

    showTooltip(clientX, clientY, dataPoint) {
        const labelFormatter = this.config.options?.plugins?.tooltip?.callbacks?.label;
        const labelText = labelFormatter
            ? labelFormatter({ raw: dataPoint.value })
            : `${dataPoint.value}`;

        this.tooltip.innerHTML = `
            <strong>${dataPoint.label} МГц</strong><br>
            ${labelText}
        `;
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = `${clientX + 10}px`;
        this.tooltip.style.top = `${clientY + 10}px`;
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    getPadding() {
        return {
            left: 60,
            right: 30,
            top: 30,
            bottom: 50
        };
    }

    draw() {
        if (!this.ctx || this.canvas.width === 0) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const padding = this.getPadding();
        const width = this.canvas.width;
        const height = this.canvas.height;
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        this.drawAxes(padding, width, height, chartWidth, chartHeight);
        this.drawGrid(padding, chartWidth, chartHeight);
        this.drawData(padding, chartWidth, chartHeight);
        this.drawLabels(padding, chartWidth, chartHeight);
    }

    drawAxes(padding, width, height, chartWidth, chartHeight) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;

        // Y axis
        this.ctx.moveTo(padding.left, padding.top);
        this.ctx.lineTo(padding.left, padding.top + chartHeight);
        // X axis
        this.ctx.moveTo(padding.left, padding.top + chartHeight);
        this.ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        this.ctx.stroke();

        // Arrows
        this.ctx.beginPath();
        // Y arrow
        this.ctx.moveTo(padding.left - 5, padding.top);
        this.ctx.lineTo(padding.left, padding.top - 5);
        this.ctx.lineTo(padding.left + 5, padding.top);
        this.ctx.fill();

        // X arrow
        this.ctx.beginPath();
        this.ctx.moveTo(padding.left + chartWidth, padding.top + chartHeight - 5);
        this.ctx.lineTo(padding.left + chartWidth + 5, padding.top + chartHeight);
        this.ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight + 5);
        this.ctx.fill();
    }

    drawGrid(padding, chartWidth, chartHeight) {
        const yTicks = 5;
        const xTicks = Math.min(10, this.config.data.labels.length);

        this.ctx.save();
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 0.5;

        // Horizontal grid lines
        for (let i = 0; i <= yTicks; i++) {
            const y = padding.top + (chartHeight / yTicks) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(padding.left, y);
            this.ctx.lineTo(padding.left + chartWidth, y);
            this.ctx.stroke();
        }

        // Vertical grid lines
        for (let i = 0; i <= xTicks; i++) {
            const x = padding.left + (chartWidth / xTicks) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, padding.top);
            this.ctx.lineTo(x, padding.top + chartHeight);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawData(padding, chartWidth, chartHeight) {
        const dataset = this.config.data.datasets[0];
        const data = dataset.data;

        if (!data.length) return;

        const minValue = Math.min(...data);
        const maxValue = Math.max(...data);
        const valueRange = maxValue - minValue || 1;

        const points = data.map((value, index) => {
            const x = padding.left + (chartWidth / (data.length - 1)) * index;
            const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            return { x, y, value };
        });

        // Draw line
        this.ctx.beginPath();
        this.ctx.strokeStyle = dataset.borderColor;
        this.ctx.lineWidth = dataset.borderWidth;

        points.forEach((point, i) => {
            if (i === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        });
        this.ctx.stroke();

        // Fill area
        if (dataset.fill) {
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, padding.top + chartHeight);
            points.forEach(point => {
                this.ctx.lineTo(point.x, point.y);
            });
            this.ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
            this.ctx.closePath();
            this.ctx.fillStyle = dataset.backgroundColor;
            this.ctx.fill();
        }

        // Draw points
        if (dataset.pointRadius > 0) {
            points.forEach(point => {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, dataset.pointRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = dataset.borderColor;
                this.ctx.fill();
            });
        }
    }

    drawLabels(padding, chartWidth, chartHeight) {
        const labels = this.config.data.labels;
        const dataset = this.config.data.datasets[0];
        const data = dataset.data;

        if (!labels.length) return;

        const minValue = Math.min(...data);
        const maxValue = Math.max(...data);

        // X axis labels
        const xTickCount = Math.min(8, labels.length);
        for (let i = 0; i <= xTickCount; i++) {
            const index = Math.floor((labels.length - 1) * (i / xTickCount));
            const x = padding.left + (chartWidth / xTickCount) * i;

            this.ctx.save();
            this.ctx.fillStyle = '#666';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(labels[index], x, padding.top + chartHeight + 20);
            this.ctx.restore();
        }

        // Y axis labels
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

        // Axis titles
        this.ctx.save();
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px sans-serif';

        // X axis title
        const xTitle = this.config.options?.scales?.x?.title?.text || 'X';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(xTitle, padding.left + chartWidth / 2, this.canvas.height - 10);

        // Y axis title
        const yTitle = this.config.options?.scales?.y?.title?.text || 'Y';
        this.ctx.save();
        this.ctx.translate(20, padding.top + chartHeight / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.textAlign = 'center';
        this.ctx.fillText(yTitle, 0, 0);
        this.ctx.restore();

        this.ctx.restore();

        // Chart title
        if (this.config.options?.plugins?.legend?.position === 'top') {
            this.ctx.save();
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(dataset.label, this.canvas.width / 2, 20);
            this.ctx.restore();
        }
    }

    updateData(newData) {
        this.config.data = newData;
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

export default Chart;