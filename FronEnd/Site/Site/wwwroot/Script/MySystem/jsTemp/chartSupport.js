//#region Chart OpenSource - Chart.js

function randomBlueToRedHex_HSV() {
    const hue = 240 - Math.random() * 240;
    const saturation = 1.0;
    const value = 1.0;

    const c = value * saturation;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = value - c;

    let r, g, b;
    if (hue < 60) [r, g, b] = [c, x, 0];
    else if (hue < 120) [r, g, b] = [x, c, 0];
    else if (hue < 180) [r, g, b] = [0, c, x];
    else if (hue < 240) [r, g, b] = [0, x, c];
    else[r, g, b] = [c, 0, x];

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    const toHex = v => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getUniqueValues(list, key) {
    return [...new Set((list || []).map(item => item[key]))];
}

function normalizeChartType(type) {
    const t = (type || '').toLowerCase();

    if (t === 'pie') return 'pie';
    if (t === 'doughnut') return 'doughnut';
    if (t.includes('line') || t.includes('spline')) return 'line';
    if (t.includes('bar') || t.includes('column')) return 'bar';
    if (t.includes('area')) return 'line';

    return 'bar';
}

function chartDataSourceToChartJs(dataSource, colorRange, ctype) {
    dataSource = dataSource || [];
    colorRange = colorRange || [];

    const chartType = normalizeChartType(ctype);
    const sValues = getUniqueValues(dataSource, 'sValue');
    const xValues = getUniqueValues(dataSource, 'xValue');

    if (chartType === 'pie' || chartType === 'doughnut') {
        const labels = dataSource.map(x => x.xValue);
        const total = dataSource.reduce((sum, item) => sum + Number(item.yValue || 0), 0);

        const values = dataSource.map(item => {
            if (!total) return 0;
            return Math.round(Number(item.yValue || 0) * 100 / total);
        });

        const colors = dataSource.map((_, i) =>
            colorRange[i] || randomBlueToRedHex_HSV()
        );

        return {
            labels: labels,
            datasets: [{
                label: sValues[0] || '',
                data: values,
                backgroundColor: colors,
                borderWidth: 1
            }]
        };
    }

    const datasets = sValues.map((s, index) => {
        const color = colorRange[index] || randomBlueToRedHex_HSV();

        const values = xValues.map(x => {
            const item = dataSource.find(r => r.sValue === s && r.xValue === x);
            return item ? Number(item.yValue || 0) : 0;
        });

        return {
            label: s,
            data: values,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 2,
            tension: ctype && ctype.toLowerCase().includes('spline') ? 0.4 : 0,
            fill: ctype && ctype.toLowerCase().includes('area') ? true : false
        };
    });

    return {
        labels: xValues,
        datasets: datasets
    };
}

function PaintBase(id, type, dataSource, title, colorRange, pointClick) {
    const el = document.getElementById(id);
    if (!el) return;

    if (window.__chartsOpenSource == null) {
        window.__chartsOpenSource = {};
    }

    if (window.__chartsOpenSource[id]) {
        window.__chartsOpenSource[id].destroy();
        delete window.__chartsOpenSource[id];
    }

    el.innerHTML = '';

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    el.appendChild(canvas);

    const chartType = normalizeChartType(type);
    const chartData = chartDataSourceToChartJs(dataSource, colorRange, type);

    const total = (dataSource || []).reduce((sum, item) => sum + Number(item.yValue || 0), 0);

    const config = {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: !!title,
                    text: title
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const label = ctx.dataset.label || ctx.label || '';
                            const value = ctx.raw || 0;

                            if (chartType === 'pie' || chartType === 'doughnut') {
                                return `${label}: ${value}%`;
                            }

                            return `${label}: ${Number(value).toLocaleString('vi-VN')}`;
                        },
                        footer: function () {
                            if (chartType === 'pie' || chartType === 'doughnut') {
                                return `Tổng: ${total.toLocaleString('vi-VN')}`;
                            }
                            return '';
                        }
                    }
                }
            },
            onHover: function (event, elements) {
                canvas.style.cursor = elements.length ? 'pointer' : 'default';
            },
            onClick: function (event, elements, chart) {
                if (!elements.length) return;

                const item = elements[0];
                const datasetIndex = item.datasetIndex;
                const index = item.index;

                const payload = {
                    chart: chart,
                    datasetIndex: datasetIndex,
                    pointIndex: index,
                    label: chart.data.labels[index],
                    value: chart.data.datasets[datasetIndex].data[index],
                    dataset: chart.data.datasets[datasetIndex]
                };

                if (typeof pointClick === 'function') {
                    pointClick(payload);
                }
            },
            scales: chartType === 'pie' || chartType === 'doughnut'
                ? {}
                : {
                    x: {
                        ticks: {
                            // Tự xoay nhãn tới 50° khi chật để không đè nhau; nhãn quá dài cắt bớt (tooltip vẫn hiện đủ tên).
                            autoSkip: false,
                            maxRotation: 50,
                            minRotation: 0,
                            callback: function (value) {
                                var lbl = this.getLabelForValue ? this.getLabelForValue(value) : value;
                                lbl = (lbl == null ? '' : String(lbl));
                                return lbl.length > 22 ? lbl.slice(0, 21) + '…' : lbl;
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return Number(value).toLocaleString('vi-VN');
                            }
                        }
                    }
                }
        }
    };

    window.__chartsOpenSource[id] = new Chart(canvas, config);
}

//#endregion