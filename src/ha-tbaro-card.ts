// ha-tbaro-card-me.ts

import { LitElement, html, css, svg, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

// Import SVG icons as strings via rollup-plugin-string
// @ts-ignore
import weatherStyles from './styles.js';
import sunIcon from './icons/sun.svg';
import rainIcon from './icons/rain.svg';
import partlyIcon from './icons/partly.svg';
import stormIcon from './icons/storm.svg';

import fr from '../locales/fr.json';
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import es from '../locales/es.json';
import de from '../locales/de.json';

// Print version to console
import { version, name } from '../package.json';
export const printVersionToConsole = () => console.info(
  `%c  ${name.toUpperCase()}  %c  Version ${version}  `,
  'color: white; font-weight: bold; background: crimson',
  'color: #000; font-weight: bold; background: #ddd',
);
printVersionToConsole();

interface Segment {
  from: number;
  to: number;
  color: string;
}

interface HassActionConfig {
  action: 'more-info' | 'navigate' | 'call-service' | 'none' | string;
  entity?: string;
  path?: string;
  service?: string;
  service_data?: Record<string, any>;
}

interface BaroCardConfig {
  entity: string;
  language?: string;
  unit?: 'hpa' | 'mm' | 'in';
  tick_color?: string;
  show_icon?: boolean;
  show_label?: boolean;    
  stroke_width?: number;
  size?: number;
  icon_size?: number;
  icon_y_offset?: number;
  angle?: 180 | 270;
  border?: 'none' | 'outer' | 'inner' | 'both';
  show_border?: boolean;
  segments?: Segment[];
  tap_action?: HassActionConfig;
  double_tap_action?: HassActionConfig;
  show_min_max?: boolean;
  show_trend?: boolean;
  history_days?: number;
  unfilled_color?: string;
  min_max_marker_size?: number;
  major_tick_width?: number;
  major_tick_length?: number;
}

@customElement('ha-tbaro-card')
export class HaTbaroCard extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ type: Object }) config!: BaroCardConfig;
  @state() private _history?: any[];
  @state() private _minHpa?: number;
  @state() private _maxHpa?: number;
  @state() private _trend?: 'up' | 'down' | 'stable';

  private _translations: Record<string, string> = {};
  private static _localeMap: Record<string, Record<string, string>> = { fr, en, ru, es, de };

  static styles = [
    css`
      :host { display: block; }
      svg { display: block; margin: auto; }
      .label {
        text-anchor: middle;
        fill: var(--primary-text-color, #000);
        font-family: sans-serif;
      }
      .trend-indicator {
        font-size: 24px;
        font-weight: bold;
        text-anchor: start;
      }
      .min-max-label {
        font-size: 10px;
        font-weight: bold;
        text-anchor: middle;
      }
      ha-card {
        cursor: pointer;
        background: var(--card-background-color, #1c1c1c);
      }
    `,
    weatherStyles
  ];

  setConfig(config: BaroCardConfig) {
    if (!config.entity) throw new Error("Entity is required");

    const lang = (config.language || this.hass?.locale?.language || 'en').toLowerCase();
    if (!HaTbaroCard._localeMap[lang]) {
      console.warn(`No translation for "${lang}", fallback to English`);
      this._translations = HaTbaroCard._localeMap['en'];
    } else {
      this._translations = HaTbaroCard._localeMap[lang];
    }

    this.config = {
      tick_color: 'var(--primary-text-color)',
      show_icon: true,
      show_label: true,
      stroke_width: 20,
      border: config.show_border ? 'outer' : 'none',
      size: 300,
      icon_size: 50,
      icon_y_offset: 0,
      angle: 270,
      unit: 'hpa',
      show_min_max: true,
      show_trend: true,
      history_days: 7,
      unfilled_color: '#333333',
      min_max_marker_size: 5, // Reduced from 8 to 5 for smaller arrows
      major_tick_width: 1.5,
      major_tick_length: 2,
      tap_action: { action: 'more-info' },
      double_tap_action: { action: 'none' },
      segments: [
        { from: 950, to: 980, color: '#3399ff' },
        { from: 980, to: 1000, color: '#4CAF50' },
        { from: 1000, to: 1020, color: '#FFD700' },
        { from: 1020, to: 1050, color: '#FF4500' }
      ],
      ...config
    };
  }

  protected async updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('hass') || changedProperties.has('config')) {
      if ((this.config.show_min_max || this.config.show_trend) && this.hass && this.config.entity) {
        await this._fetchHistory();
      }
    }
  }

  private async _fetchHistory() {
    try {
      let days = this.config.history_days ?? 7;
      if (days <= 0) {
        console.warn('Invalid history_days, using default of 7');
        days = 7;
      }
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);
      const response = await this.hass.callWS({
        type: 'history/history_during_period',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        entity_ids: [this.config.entity],
        significant_changes_only: false,
        minimal_response: false,
      });

      const historyData = response[this.config.entity] || [];
      console.log('Raw history data:', JSON.stringify(historyData, null, 2)); // Log full data with formatting
      if (historyData.length === 0) {
        console.warn('No history data for', this.config.entity);
        this._minHpa = this.rawHpa;
        this._maxHpa = this.rawHpa;
        return;
      }

      let loggedNull = false;
      let loggedUnknown = false;

      const hpaHistory = historyData.map((state: any) => {
        if (!state || !state.s || (typeof state.s !== 'string' && typeof state.s !== 'number')) {
          if (state.s === null && !loggedNull) {
            console.warn('Skipping invalid state entry (null):', JSON.stringify(state, null, 2));
            loggedNull = true;
          } else if (state.s === 'unknown' && !loggedUnknown) {
            console.warn('Skipping invalid state entry (unknown):', JSON.stringify(state, null, 2));
            loggedUnknown = true;
          }
          return null;
        }
        const val = parseFloat(state.s);
        if (isNaN(val)) {
          if (!loggedUnknown && state.s === 'unknown') {
            console.warn('Invalid state value (unknown):', JSON.stringify(state, null, 2));
            loggedUnknown = true;
          } else if (!loggedNull && state.s === null) {
            console.warn('Invalid state value (null):', JSON.stringify(state, null, 2));
            loggedNull = true;
          } else {
            console.warn('Invalid state value:', JSON.stringify(state, null, 2));
          }
          return null;
        }
        const unit = (state.a?.unit_of_measurement || 'hPa').toLowerCase().replace(/[^a-z]/g, '');
        const factor = HaTbaroCard.UNIT_TO_HPA[unit] ?? 1;
        const hpaValue = val * factor;
        console.log(`Converted ${val} ${unit} to ${hpaValue} hPa`);
        return hpaValue;
      }).filter((v: number | null) => v !== null) as number[];

      console.log('hpaHistory:', hpaHistory); // Debug processed history
      if (hpaHistory.length > 0 && this.config.show_min_max) {
        this._minHpa = Math.min(...hpaHistory);
        this._maxHpa = Math.max(...hpaHistory);
        console.log('Min/Max set:', this._minHpa, this._maxHpa);
      } else {
        console.warn('No valid history data found, falling back to current value');
        this._minHpa = this.rawHpa;
        this._maxHpa = this.rawHpa;
      }

      if (this.config.show_trend) {
        const lastDayStart = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        const lastDayHpa = hpaHistory.filter((_, idx) => new Date(historyData[idx].lu * 1000) >= lastDayStart);
        const avgLastDay = lastDayHpa.length > 0 ? lastDayHpa.reduce((a, b) => a + b, 0) / lastDayHpa.length : this.rawHpa;
        const diff = this.rawHpa - avgLastDay;
        this._trend = diff > 1 ? 'up' : diff < -1 ? 'down' : 'stable';
      }

      this._history = historyData;
    } catch (error) {
      console.error('Error fetching history for ha-tbaro-card:', error);
      this._minHpa = this.rawHpa;
      this._maxHpa = this.rawHpa;
      this._trend = undefined;
    }
  }

  private static readonly HPA_TO_MM = 0.75006156;
  private static readonly HPA_TO_IN = 0.02953;
  private static readonly MM_TO_HPA = 1 / HaTbaroCard.HPA_TO_MM;
  private static readonly IN_TO_HPA = 1 / HaTbaroCard.HPA_TO_IN;

  private static readonly UNIT_TO_HPA: Record<string, number> = {
    hpa: 1,
    mbar: 1,
    mm: HaTbaroCard.MM_TO_HPA,
    mmhg: HaTbaroCard.MM_TO_HPA,
    in: HaTbaroCard.IN_TO_HPA,
    inhg: HaTbaroCard.IN_TO_HPA,
  };

  private get rawHpa(): number {
    const s = this.hass.states[this.config.entity];
    const val = s ? parseFloat(s.state) : 1013.25;
    const key = (s?.attributes?.unit_of_measurement || 'hPa').toLowerCase().replace(/[^a-z]/g, '');
    const factor = HaTbaroCard.UNIT_TO_HPA[key] ?? 1;
    return val * factor;
  }

  get pressure(): number {
    if (this.config.unit === 'mm') return this.rawHpa * HaTbaroCard.HPA_TO_MM;
    if (this.config.unit === 'in') return this.rawHpa * HaTbaroCard.HPA_TO_IN;
    return this.rawHpa;
  }

  polar(cx: number, cy: number, r: number, angle: number) {
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  }

  describeArc(cx: number, cy: number, r: number, start: number, end: number) {
    const s = this.polar(cx, cy, r, start);
    const e = this.polar(cx, cy, r, end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  getIconDataUrl(id: string): string | undefined {
    const svgMap: Record<string, string> = { sun: sunIcon, rain: rainIcon, partly: partlyIcon, storm: stormIcon };
    const raw = svgMap[id];
    if (!raw) return undefined;
    return `data:image/svg+xml,${encodeURIComponent(raw).replace(/'/g, '%27').replace(/"/g, '%22')}`;
  }

  private getWeatherInfo(): { key: string; icon: string } {
    const hpa = this.rawHpa;
    if (hpa < 980) return { key: 'storm', icon: 'storm' };
    if (hpa < 1000) return { key: 'rain', icon: 'rain' };
    if (hpa < 1020) return { key: 'partly', icon: 'partly' };
    return { key: 'sun', icon: 'sun' };
  }

  private getMdiIcon(id: string): string {
    const map: Record<string, string> = {
      sun: 'mdi:weather-sunny',
      partly: 'mdi:weather-partly-cloudy',
      rain: 'mdi:weather-rainy',
      storm: 'mdi:weather-lightning',
    };
    return map[id] ?? 'mdi:weather-cloudy';
  }

  private _handleAction(evt: MouseEvent, actionConfig?: HassActionConfig): void {
    if (!actionConfig || actionConfig.action === 'none') return;

    evt.stopPropagation();

    const config = { ...actionConfig };

    switch (config.action) {
      case 'more-info':
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          bubbles: true,
          composed: true,
          detail: { entityId: config.entity || this.config.entity }
        }));
        break;
      case 'navigate':
        if (config.path) {
          history.pushState(null, '', config.path);
          this.dispatchEvent(new CustomEvent('hass-navigate', {
            bubbles: true,
            composed: true,
            detail: { path: config.path }
          }));
        }
        break;
      case 'call-service':
        if (config.service) {
          const [domain, service] = config.service.split('.');
          this.hass.callService(domain, service, config.service_data);
        }
        break;
      default:
        console.warn(`Unsupported action: ${config.action}`);
    }
  }

  render() {
    if (!this.config) return html``;

    const pressure = this.pressure;
    const { tick_color, size, segments, angle: gaugeAngle = 270, border = 'outer', stroke_width = 20,
            major_tick_width = 1.5, major_tick_length = 2, min_max_marker_size = 5 } = this.config; // Using config value
    const cx = 150, r = 110, cy = 150;
    const minP = 950, maxP = 1050;

    const startAngle = gaugeAngle === 180 ? Math.PI : Math.PI * 0.75;
    const endAngle = gaugeAngle === 180 ? Math.PI * 2 : Math.PI * 2.25;

    const hpaValue = this.rawHpa;
    const valueAngle = startAngle + ((hpaValue - minP) / (maxP - minP)) * (endAngle - startAngle);

    const iconSize = this.config.icon_size ?? 50;
    const iconYOffset = this.config.icon_y_offset ?? 0;

    const iconX = cx - iconSize / 2;
    const baseIconY = gaugeAngle === 180 ? cy - r / 2 - 20 : cy - iconSize / 2;
    const iconY = baseIconY + iconYOffset;

    const labelY = gaugeAngle === 180 ? cy - 25 : cy + 60;
    const pressureY = gaugeAngle === 180 ? cy : cy + 85;

    const lang = this.config.language || this.hass?.locale?.language || 'en';
    if (!Object.keys(this._translations).length || !this._translations[lang]) {
      this._translations = HaTbaroCard._localeMap[lang] || HaTbaroCard._localeMap['en'];
    }

    const weather = this.getWeatherInfo();
    const label = this._translations[weather.key] || weather.key;

    // Draw complete unfilled background arc first
    const backgroundArc = svg`<path d="${this.describeArc(cx, cy, r, startAngle, endAngle)}" 
      stroke="${this.config.unfilled_color}" 
      stroke-width="${stroke_width}" 
      fill="none" 
      stroke-linecap="round" />`;

    // Draw filled colored arcs only up to current value
    const filledArcs = segments!.map(seg => {
      const segStartAngle = startAngle + ((seg.from - minP) / (maxP - minP)) * (endAngle - startAngle);
      const segEndAngle = startAngle + ((seg.to - minP) / (maxP - minP)) * (endAngle - startAngle);
      
      if (valueAngle < segStartAngle) {
        return nothing;
      }
      
      const drawEndAngle = Math.min(valueAngle, segEndAngle);
      return svg`<path d="${this.describeArc(cx, cy, r, segStartAngle, drawEndAngle)}" 
        stroke="${seg.color}" 
        stroke-width="${stroke_width}" 
        fill="none" 
        stroke-linecap="round" />`;
    });

    const ticksHpa = [950, 960, 970, 980, 990, 1000, 1010, 1020, 1030, 1040, 1050];
    const TICK_LEN_IN = 2;

    const majorTicks = ticksHpa.map(p => {
      const a = startAngle + ((p - minP) / (maxP - minP)) * (endAngle - startAngle);
      const rOuter = r + stroke_width / 2 + major_tick_length;
      const rInner = r - stroke_width / 2 - TICK_LEN_IN;
      const p1 = this.polar(cx, cy, rOuter, a);
      const p2 = this.polar(cx, cy, rInner, a);
      return svg`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${tick_color}" stroke-width="${major_tick_width}" />`;
    });

    const labelHpa = [950, 960, 970, 980, 990, 1000, 1010, 1020, 1030, 1040, 1050];
    const labels = labelHpa.map(p => {
      const display =
        this.config.unit === 'mm'
          ? (p * HaTbaroCard.HPA_TO_MM).toFixed(0)
          : this.config.unit === 'in'
            ? (p * HaTbaroCard.HPA_TO_IN).toFixed(2)
            : p.toString();
      const a = startAngle + ((p - minP) / (maxP - minP)) * (endAngle - startAngle);
      const pt = this.polar(cx, cy, r - 20, a);
      return svg`<text x="${pt.x}" y="${pt.y}" font-size="0.6em" class="label">${display}</text>`;
    });

    const outerR = r + stroke_width / 2 + 0.5;
    const innerR = r - stroke_width / 2 - 0.5;
    const borderOuter = svg`<path d="${this.describeArc(cx, cy, outerR, startAngle, endAngle)}" stroke="#000" stroke-width="1" fill="none" />`;
    const borderInner = svg`<path d="${this.describeArc(cx, cy, innerR, startAngle, endAngle)}" stroke="#000" stroke-width="1" fill="none" />`;

    const svgIcon = svg`<image href="${this.getIconDataUrl(weather.icon)}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" />`;

    const minMaxMarkers = (() => {
      if (!this.config.show_min_max || this._minHpa === undefined || this._maxHpa === undefined) return nothing;
      const clampedMin = Math.max(minP, Math.min(maxP, this._minHpa));
      const clampedMax = Math.max(minP, Math.min(maxP, this._maxHpa));
      const minAngle = startAngle + ((clampedMin - minP) / (maxP - minP)) * (endAngle - startAngle);
      const maxAngle = startAngle + ((clampedMax - minP) / (maxP - minP)) * (endAngle - startAngle);
      
      const markerSize = min_max_marker_size; // Use config value, default 5
      const rOuter = r + stroke_width / 2 + 2; // Start at the outer edge
      const rInner = rOuter - markerSize; // Point inward toward the center

      // Create small inward-pointing arrow (triangle pointing down)
      const createArrow = (angle: number, color: string) => {
        const tip = this.polar(cx, cy, rInner, angle); // Tip points inward
        const base1 = this.polar(cx, cy, rOuter, angle - 0.2); // Base points outward
        const base2 = this.polar(cx, cy, rOuter, angle + 0.2); // Base points outward
        return svg`
          <polygon points="${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}" 
                   fill="${color}" stroke="${color}" stroke-width="0.5" />
        `;
      };
      
      return svg`
        ${createArrow(minAngle, '#5599ff')} <!-- Blue arrow for min -->
        ${createArrow(maxAngle, '#ff7755')} <!-- Red arrow for max -->
      `;
    })();

    const trendIndicator = (() => {
      if (!this.config.show_trend || this._trend === undefined) return nothing;
      const trendX = cx + 58;
      const trendY = pressureY;
      
      let symbol = '';
      let color = tick_color;
      
      if (this._trend === 'up') {
        symbol = '+';
        color = '#5599ff';
      } else if (this._trend === 'down') {
        symbol = '−';
        color = '#ff7755';
      } else {
        symbol = '=';
        color = '#888';
      }
      
      return svg`<text x="${trendX}" y="${trendY}" class="trend-indicator" fill="${color}">${symbol}</text>`;
    })();

    const viewHeight = gaugeAngle === 180 ? 180 : 300;
    const clipHeight = gaugeAngle === 180 ? (size! / 300) * 180 : 'auto';

    return html`
      <ha-card
        @click=${(e: MouseEvent) => this._handleAction(e, this.config.tap_action)}
        @dblclick=${(e: MouseEvent) => this._handleAction(e, this.config.double_tap_action)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._handleAction(e as any, this.config.tap_action);
          }
        }}
        tabindex="0"
      >
        <div style="overflow:hidden;height:${clipHeight};"></div>
        ${svg`<svg viewBox="0 0 300 ${viewHeight}" style="max-width:${size}px;height:auto">
          ${backgroundArc}
          ${filledArcs}
          ${this.config.border !== 'none' && (this.config.border === 'inner' || this.config.border === 'both') ? borderInner : nothing}
          ${this.config.border === 'outer' || this.config.border === 'both' ? borderOuter : nothing}
          ${majorTicks}
          ${labels}
          ${minMaxMarkers}
          ${this.config.show_icon ? svgIcon : nothing}
          ${this.config.show_label ? svg`<text x="${cx}" y="${labelY}" font-size="14" class="label">${label}</text>` : nothing}
          <text x="${cx}" y="${pressureY}" font-size="22" font-weight="bold" class="label">
            ${this.config.unit === 'mm'
                ? Math.round(pressure) + ' mmHg'
                : this.config.unit === 'in'
                  ? pressure.toFixed(2) + ' inHg'
                  : Math.round(pressure) + ' hPa'
            }
          </text>
          ${trendIndicator}
        </svg>`}
      </ha-card>
    `;
  }
}
