// ha-tbaro-card-me.ts
//custom version

import { LitElement, html, css, svg, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
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

interface BaroCardConfig {
  entity: string;
  language?: string;
  unit?: 'hpa' | 'mm' | 'in';
  needle_color?: string;
  tick_color?: string;
  show_icon?: boolean;
  show_label?: boolean;    
  stroke_width?: number;
  size?: number;
  icon_size?: number;
  icon_y_offset?: number;
  angle?: 180 | 270;
  border?: 'none' | 'outer' | 'inner' | 'both';
  segments?: Segment[];
}

@customElement('ha-tbaro-card')
export class HaTbaroCard extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ type: Object }) config!: BaroCardConfig;

  private _translations: Record<string, string> = {};
  private static _localeMap: Record<string, Record<string, string>> = { fr, en, ru, es, de };

  static styles = [
    css`
      :host { display: block; }
      svg { display: block; margin: auto; }
      .label {
        text-anchor: middle;
        fill: #000;
        font-family: sans-serif;
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

    // Default values with spread for overrides
    this.config = {
      needle_color: 'var(--primary-color)',
      tick_color: 'var(--primary-text-color)',
      show_icon: true,
      show_label: true,
      stroke_width: 20,
      border: 'outer',
      size: 300,
      icon_size: 50,
      icon_y_offset: 0,
      angle: 270,
      unit: 'hpa',
      segments: [
        { from: 950, to: 980, color: '#3399ff' },
        { from: 980, to: 1000, color: '#4CAF50' },
        { from: 1000, to: 1020, color: '#FFD700' },
        { from: 1020, to: 1050, color: '#FF4500' }
      ],
      ...config
    };
  }

  private static readonly HPA_TO_MM  = 0.75006156;
  private static readonly HPA_TO_IN  = 0.02953;
  private static readonly MM_TO_HPA  = 1 / HaTbaroCard.HPA_TO_MM;
  private static readonly IN_TO_HPA  = 1 / HaTbaroCard.HPA_TO_IN;

  /** Conversion multipliers for units to hPa */
  private static readonly UNIT_TO_HPA: Record<string, number> = {
    hpa:   1,
    mbar:  1,
    mm:    HaTbaroCard.MM_TO_HPA,
    mmhg:  HaTbaroCard.MM_TO_HPA,
    in:    HaTbaroCard.IN_TO_HPA,
    inhg:  HaTbaroCard.IN_TO_HPA,
  };

  private get rawHpa(): number {
    const s = this.hass.states[this.config.entity];
    const val = s ? parseFloat(s.state) : 1013.25;
    const key = (s?.attributes?.unit_of_measurement || 'hPa')
                  .toLowerCase().replace(/[^a-z]/g, '');
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

  render() {
    if (!this.config) return html``;

    const pressure = this.pressure;
    const { needle_color, tick_color, size, segments, angle: gaugeAngle = 270, border = 'outer' } = this.config;
    const stroke_width = this.config.stroke_width ?? 20;
    const cx = 150, r = 110, cy = 150;
    const minP = 950, maxP = 1050;

    // Start and end angles based on semicircle or 270° gauge
    const startAngle = gaugeAngle === 180 ? Math.PI : Math.PI * 0.75;
    const endAngle = gaugeAngle === 180 ? Math.PI * 2 : Math.PI * 2.25;

    const hpaValue = this.rawHpa;
    const valueAngle = startAngle + ((hpaValue - minP) / (maxP - minP)) * (endAngle - startAngle);

    const iconSize = this.config.icon_size ?? 50;
    const iconYOffset = this.config.icon_y_offset ?? 0;

    // Center icon horizontally and adjust vertically based on gauge type
    const iconX = cx - iconSize / 2;
    const baseIconY = gaugeAngle === 180 ? cy - r / 2 : cy - iconSize / 2;
    const iconY = baseIconY + iconYOffset;

    // Label positions
    const labelY = gaugeAngle === 180 ? cy - 25 : cy + 60;
    const pressureY = gaugeAngle === 180 ? cy : cy + 85;

    // Determine translations if missing
    const lang = this.config.language || this.hass?.locale?.language || 'en';
    if (!Object.keys(this._translations).length || !this._translations[lang]) {
      this._translations = HaTbaroCard._localeMap[lang] || HaTbaroCard._localeMap['en'];
    }

    // Weather info for icon and label
    const weather = this.getWeatherInfo();
    const label = this._translations[weather.key] || weather.key;

    // Draw colored segments of gauge
    const arcs = segments!.map(seg => {
      const aStart = startAngle + ((seg.from - minP) / (maxP - minP)) * (endAngle - startAngle);
      const aEnd = startAngle + ((seg.to - minP) / (maxP - minP)) * (endAngle - startAngle);
      return svg`<path d="${this.describeArc(cx, cy, r, aStart, aEnd)}" stroke="${seg.color}" stroke-width="${stroke_width}" fill="none" />`;
    });

    // Tick marks
    const ticksHpa = [950, 960, 970, 980, 990, 1000, 1010, 1020, 1030, 1040, 1050];
    const TICK_WIDTH = 1;
    const TICK_LEN_OUT = 1;
    const TICK_LEN_IN = 2;

    const ticks = ticksHpa.map(p => {
      const a = startAngle + ((p - minP) / (maxP - minP)) * (endAngle - startAngle);
      const rOuter = r + stroke_width / 2 + TICK_LEN_OUT;
      const rInner = r - stroke_width / 2 - TICK_LEN_IN;
      const p1 = this.polar(cx, cy, rOuter, a);
      const p2 = this.polar(cx, cy, rInner, a);
      return svg`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${tick_color}" stroke-width="${TICK_WIDTH}" />`;
    });

    // Labels
    const labelHpa = [960, 980, 1000, 1020, 1040];
    const labels = labelHpa.map(p => {
      const display =
        this.config.unit === 'mm'
          ? (p * HaTbaroCard.HPA_TO_MM).toFixed(0)
          : this.config.unit === 'in'
            ? (p * HaTbaroCard.HPA_TO_IN).toFixed(2)
            : p.toString();
      const a = startAngle + ((p - minP) / (maxP - minP)) * (endAngle - startAngle);
      const pt = this.polar(cx, cy, r - 36, a);
      return svg`<text x="${pt.x}" y="${pt.y}" font-size="0.9em" font-weight="bolder" class="label">${display}</text>`;
    });

    // Needle
    const needle = (() => {
      const needleLength = gaugeAngle === 180 ? r - 5 : r - 35;
      const baseLength = gaugeAngle === 180 ? 80 : 16;
      const tip = this.polar(cx, cy, needleLength, valueAngle);
      const base = this.polar(cx, cy, baseLength, valueAngle);
      const sideAngle = valueAngle + Math.PI / 2;
      const offset = gaugeAngle === 180 ? 7 : 5;
      const baseL = { x: base.x + Math.cos(sideAngle) * offset, y: base.y + Math.sin(sideAngle) * offset };
      const baseR = { x: base.x - Math.cos(sideAngle) * offset, y: base.y - Math.sin(sideAngle) * offset };
      const dot = gaugeAngle === 180 ? nothing : svg`<circle cx="${cx}" cy="${cy}" r="10" fill="${tick_color}" />`;
      return svg`<polygon points="${tip.x},${tip.y} ${baseL.x},${baseL.y} ${baseR.x},${baseR.y}" fill="${needle_color}" />${dot}`;
    })();

    // Border arcs
    const outerR = r + stroke_width / 2 + 0.5;
    const innerR = r - stroke_width / 2 - 0.5;
    const borderOuter = svg`<path d="${this.describeArc(cx, cy, outerR, startAngle, endAngle)}" stroke="#000" stroke-width="1" fill="none" />`;
    const borderInner = svg`<path d="${this.describeArc(cx, cy, innerR, startAngle, endAngle)}" stroke="#000" stroke-width="1" fill="none" />`;

    // Icon as SVG <image>
    const svgIcon = svg`<image href="${this.getIconDataUrl(weather.icon)}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" />`;

    // Render card
    const viewHeight = gaugeAngle === 180 ? 180 : 300;
    const clipHeight = gaugeAngle === 180 ? (size! / 300) * 180 : 'auto';

    return html`
      <ha-card>
        <div style="overflow:hidden;height:${clipHeight};"></div>
        ${svg`<svg viewBox="0 0 300 ${viewHeight}" style="max-width:${size}px;height:auto">
          ${this.config.border !== 'none' && (this.config.border === 'inner' || this.config.border === 'both') ? borderInner : nothing}
          ${this.config.border === 'outer' || this.config.border === 'both' ? borderOuter : nothing}
          ${arcs}
          ${ticks}
          ${labels}
          ${needle}
          ${svgIcon}
          ${this.config.show_label ? html`<text x="${cx}" y="${labelY}" font-size="14" class="label">${label}</text>` : nothing}
          <text x="${cx}" y="${pressureY}" font-size="22" font-weight="bold" class="label">
            ${this.config.unit === 'mm'
                ? Math.round(pressure) + ' mm'
                : this.config.unit === 'in'
                  ? Math.round(pressure) + ' inHg'
                  : Math.round(pressure) + ' hPa'
            }
          </text>
        </svg>`}
      </ha-card>
    `;
  }
}
