// DataContent.js
import { Component } from '../core/component.js';

class DataContent extends Component {
    renderWithData(data) {
        const section = this.createElement('section', { className: 'data-content' });

        if (data.rss_stats && data.rss_stats.length > 0) {
            data.rss_stats.forEach(rssData => {
                const details = this.createElement('details', { className: 'details' });
                const summary = this.createElement('summary', { className: 'summary' }, `РСС ${rssData.rss_id}`);

                const fields = [
                    { label: 'Идентификатор РСС:', value: rssData.rss_id },
                    { label: 'Количество измерений с обнаруженными помехами:', value: rssData.spectrums_w_noises_cnt },
                    { label: 'Количество измерений без обнаруженных помех:', value: rssData.spectrums_wo_noises_cnt },
                    { label: 'Количество задач измерений с обнаруженными помехами:', value: rssData.sessions_w_noises_cnt },
                    { label: 'Количество задач измерений без обнаруженных помех:', value: rssData.sessions_wo_noises_cnt },
                    { label: 'Количество критичных помех:', value: rssData.crititcal_noises_cnt },
                    { label: 'Количество некритичных помех:', value: rssData.no_critical_noises_cnt },
                    { label: 'Количество каналов в полосе:', value: rssData.channels_cnt },
                    { label: 'Количество подавленных каналов:', value: rssData.channels_suppressed },
                    { label: 'Количество каналов с ухудшением:', value: rssData.channels_w_deterioration }
                ];
                details.appendChild(summary);
                fields.forEach(field => {
                    const fieldDiv = this.createElement('div', { className: 'field' }, `${field.label} ${field.value ?? 0}`);
                    details.appendChild(fieldDiv);
                });


                section.appendChild(details);
            });
        }

        return section;
    }
}

export default DataContent;