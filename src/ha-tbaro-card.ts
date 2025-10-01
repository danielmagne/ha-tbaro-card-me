// ha-tbaro-card-me.ts
// Custom Home Assistant card for displaying a barometer gauge
// Built using LitElement for reactive rendering
// Date: October 01, 2025

import { LitElement, html, css, svg, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

// Import SVG icons as strings via rollup-plugin-string
// @ts-ignore: Allow importing SVG as strings
import weatherStyles from './styles.js'; // External styles for weather visuals
import sunIcon from './icons/sun.svg';   // Icon for sunny weather
import rainIcon from './icons/rain.svg';  // Icon for rainy weather
import partlyIcon from './icons/partly.svg'; // Icon for partly cloudy weather
import stormIcon from './icons/storm.svg';   // Icon for stormy weather

import fr from '../locales/fr.json'; // French translations
import en from '../locales/en.json'; // English translations
import ru from '../locales/ru.json'; // Russian translations
import es from '../locales/es.json'; // Spanish translations
import de from '../locales/de.json'; // German translations

// Print version and name to console from package.json for debugging
import { version, name } from '../package.json';
export const printVersionToConsole = () => {};
printVersionToConsole();

// Interface for defining pressure range segments with colors
interface Segment {
  from: number; // Starting pressure value (hPa)
  to: number;   // Ending pressure value (hPa)
  color: string; // Color for the segment
}

// Interface for Home Assistant action configurations
interface HassActionConfig {
  action: 'more-info' | 'navigate' | 'call-service' | 'none' | string; // Action type
  entity?: string; // Optional entity ID for the action
  path?: string;   // Optional navigation path
  service?: string; // Optional service to call
  service_data?: Record<string, any>; // Optional data for service call
}

// Configuration interface for the barometer card
interface BaroCardConfig {
  entity: string; // Required entity ID for the barometer sensor
  language?: string; // Optional language code (e.g., 'en', 'fr')
  unit?: 'hpa' | 'mm' | 'in'; // Optional pressure unit (default: 'hpa')
  tick_color?: string; // Optional color for tick marks
  show_icon?: boolean; // Optional flag to show weather icon
  show_label?: boolean; // Optional flag to show weather label
  stroke_width?: number; // Optional width of the gauge arc
  size?: number; // Optional size of the card (in pixels)
  icon_size?: number; // Optional size of the weather icon
  icon_y_offset?: number; // Optional vertical offset for the icon
  angle?: 180 | 270; // Optional gauge angle (180° or 270°, default: 270)
  border?: 'none' | 'outer' | 'inner' | 'both'; // Optional border style
  show_border?: boolean; // Optional flag to show border
  segments?: Segment[]; // Optional array of pressure segments
  tap_action?: HassActionConfig; // Optional action on tap
  double_tap_action?: HassActionConfig; // Optional action on double tap
  show_min_max?: boolean; // Optional flag to show min/max markers
  show_trend?: boolean; // Optional flag to show trend indicator
  history_days?: number; // Optional number of days for history data
  unfilled_color?: string; // Optional color for unfilled gauge area
  min_max_marker_size?: number; // Optional size of min/max markers
  major_tick_width?: number; // Optional width of major tick marks
  major_tick_length?: number; // Optional length of major tick marks
}

// Custom element definition for the barometer card
@customElement('ha-tbaro-card')
export class HaTbaroCard extends LitElement {
  @property({ attribute: false }) hass: any; // Home Assistant object for state and API access
  @property({ type: Object }) config!: BaroCardConfig; // Configuration object
  @state() private _history?: any[]; // State for historical pressure data
  @state() private _minHpa?: number; // State for minimum pressure value
  @state() private _maxHpa?: number; // State for maximum pressure value
  @state() private _trend?: 'up' | 'down' | 'stable'; // State for pressure trend

  private _translations: Record<string, string> = {}; // Storage for localized strings
  private static _localeMap: Record<string, Record<string, string>> = { fr, en, ru, es, de }; // Mapping of language codes to translation objects

  // Define CSS styles for the card
  static styles = [
    css`
      :host { display: block; } // Ensure card is block-level
      svg { display: block; margin: auto; } // Center SVG element
      .label {
        text-anchor: middle; // Center text horizontally
        fill: var(--primary-text-color, #000); // Use theme text color
        font-family: sans-serif; // Default font family
      }
      .trend-indicator {
        font-size: 24px; // Size of trend indicator text
        font-weight: bold; // Bold styling for trend
        text-anchor: start; // Align trend text to the left
      }
      .min-max-label {
        font-size: 10px; // Small font for min/max labels
        font-weight: bold; // Bold styling for min/max
        text-anchor: middle; // Center min/max labels
      }
      ha-card {
        cursor: pointer; // Indicate clickable card
        background: var(--card-background-color, #1c1c1c); // Use theme background
      }
    `,
    weatherStyles // Include external weather-related styles
  ];

  // Set up the card configuration with defaults
  setConfig(config: BaroCardConfig) {
    if (!config.entity) throw new Error("Entity is required"); // Validate entity presence

    const lang = (config.language || this.hass?.locale?.language || 'en').toLowerCase(); // Determine language
    if (!HaTbaroCard._localeMap[lang]) {
      this._translations = HaTbaroCard._localeMap['en']; // Fallback to English if language not supported
    } else {
      this._translations = HaTbaroCard._localeMap[lang]; // Set translations for the language
    }

    this.config = {
      tick_color: 'var(--primary-text-color)', // Default tick color from theme
      show_icon: true, // Show weather icon by default
      show_label: true, // Show weather label by default
      stroke_width: 20, // Default gauge arc width
      border: config.show_border ? 'outer' : 'none', // Default border based on show_border
      size: 300, // Default card size
      icon_size: 50, // Default icon size
      icon_y_offset: 0, // Default icon vertical offset
      angle: 270, // Default gauge angle
      unit: 'hpa', // Default pressure unit
      show_min_max: true, // Show min/max markers by default
      show_trend: true, // Show trend indicator by default
      history_days: 7, // Default history period
      unfilled_color: '#333333', // Default unfilled gauge color
      min_max_marker_size: 5, // Default min/max marker size
      major_tick_width: 1.5, // Default major tick width
      major_tick_length: 2, // Default major tick length
      tap_action: { action: 'more-info' }, // Default tap action
      double_tap_action: { action: 'none' }, // Default double tap action
      segments: [
        { from: 950, to: 980, color: '#3399ff' }, // Low pressure segment
        { from: 980, to: 1000, color: '#4CAF50' }, // Normal low segment
        { from: 1000, to: 1020, color: '#FFD700' }, // Normal high segment
        { from: 1020, to: 1050, color: '#FF4500' } // High pressure segment
      ],
      ...config // Merge with provided config to override defaults
    };
  }

  // Update lifecycle hook to fetch history when hass or config changes
  protected async updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('hass') || changedProperties.has('config')) {
      if ((this.config.show_min_max || this.config.show_trend) && this.hass && this.config.entity) {
        await this._fetchHistory(); // Fetch historical data if required
      }
    }
  }

  // Fetch historical pressure data from Home Assistant
  private async _fetchHistory() {
    try {
      let days = this.config.history_days ?? 7; // Default to 7 days if not set
      if (days <= 0) {
        days = 7; // Ensure positive days
      }
      const endTime = new Date(); // Current time
      const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000); // Start time based on days
      const response = await this.hass.callWS({
        type: 'history/history_during_period',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        entity_ids: [this.config.entity],
        significant_changes_only: false, // Include all changes
        minimal_response: false, // Include detailed response
      });

      const historyData = response[this.config.entity] || [];
      if (historyData.length === 0) {
        this._minHpa = this.rawHpa; // Set min/max to current if no history
        this._maxHpa = this.rawHpa;
        return;
      }

      let loggedNull = false;
      let loggedUnknown = false;

      const hpaHistory = historyData.map((state: any) => {
        if (!state || !state.s || (typeof state.s !== 'string' && typeof state.s !== 'number')) {
          if (state.s === null && !loggedNull) {
            loggedNull = true; // Log null state once
          } else if (state.s === 'unknown' && !loggedUnknown) {
            loggedUnknown = true; // Log unknown state once
          }
          return null;
        }
        const val = parseFloat(state.s);
        if (isNaN(val)) {
          if (!loggedUnknown && state.s === 'unknown') {
            loggedUnknown = true; // Log unknown if not already logged
          } else if (!loggedNull && state.s === null) {
            loggedNull = true; // Log null if not already logged
          }
          return null;
        }
        const unit = (state.a?.unit_of_measurement || 'hPa').toLowerCase().replace(/[^a-z]/g, '');
        const factor = HaTbaroCard.UNIT_TO_HPA[unit] ?? 1; // Convert to hPa
        const hpaValue = val * factor;
        return hpaValue;
      }).filter((v: number | null) => v !== null) as number[];

      if (hpaHistory.length > 0 && this.config.show_min_max) {
        this._minHpa = Math.min(...hpaHistory); // Calculate minimum pressure
        this._maxHpa = Math.max(...hpaHistory); // Calculate maximum pressure
      } else {
        this._minHpa = this.rawHpa; // Fallback to current if no valid history
        this._maxHpa = this.rawHpa;
      }

      if (this.config.show_trend) {
        const lastDayStart = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Start of last day
        const lastDayHpa = hpaHistory.filter((_, idx) => new Date(historyData[idx].lu * 1000) >= lastDayStart);
        const avgLastDay = lastDayHpa.length > 0 ? lastDayHpa.reduce((a, b) => a + b, 0) / lastDayHpa.length : this.rawHpa; // Average pressure of last day
        const diff = this.rawHpa - avgLastDay; // Difference from current to average
        this._trend = diff > 1 ? 'up' : diff < -1 ? 'down' : 'stable'; // Determine trend
      }

      this._history = historyData; // Store history data
    } catch (error) {
      this._minHpa = this.rawHpa; // Fallback on error
      this._maxHpa = this.rawHpa;
      this._trend = undefined; // Clear trend on error
    }
  }

  // Conversion factors for pressure units
  private static readonly HPA_TO_MM = 0.75006156; // hPa to mmHg conversion
  private static readonly HPA_TO_IN = 0.02953;    // hPa to inHg conversion
  private static readonly MM_TO_HPA = 1 / HaTbaroCard.HPA_TO_MM; // mmHg to hPa conversion
  private static readonly IN_TO_HPA = 1 / HaTbaroCard.HPA_TO_IN; // inHg to hPa conversion

  // Mapping of units to hPa conversion factors
  private static readonly UNIT_TO_HPA: Record<string, number> = {
    hpa: 1,
    mbar: 1,
    mm: HaTbaroCard.MM_TO_HPA,
    mmhg: HaTbaroCard.MM_TO_HPA,
    in: HaTbaroCard.IN_TO_HPA,
    inhg: HaTbaroCard.IN_TO_HPA,
  };

  // Get raw pressure value in hPa from the entity state
  private get rawHpa(): number {
    const s = this.hass.states[this.config.entity];
    const val = s ? parseFloat(s.state) : 1013.25; // Default to 1013.25 hPa if state unavailable
    const key = (s?.attributes?.unit_of_measurement || 'hPa').toLowerCase().replace(/[^a-z]/g, '');
    const factor = HaTbaroCard.UNIT_TO_HPA[key] ?? 1; // Convert to hPa
    return val * factor;
  }

  // Get pressure value in the configured unit
  get pressure(): number {
    if (this.config.unit === 'mm') return this.rawHpa * HaTbaroCard.HPA_TO_MM;
    if (this.config.unit === 'in') return this.rawHpa * HaTbaroCard.HPA_TO_IN;
    return this.rawHpa; // Default to hPa
  }

  // Calculate polar coordinates for SVG drawing
  polar(cx: number, cy: number, r: number, angle: number) {
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  }

  // Generate SVG arc path description
  describeArc(cx: number, cy: number, r: number, start: number, end: number) {
    const s = this.polar(cx, cy, r, start);
    const e = this.polar(cx, cy, r, end);
    const largeArc = end - start > Math.PI ? 1 : 0; // Determine if arc is greater than 180°
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  // Get data URL for the weather icon
  getIconDataUrl(id: string): string | undefined {
    const svgMap: Record<string, string> = { sun: sunIcon, rain: rainIcon, partly: partlyIcon, storm: stormIcon };
    const raw = svgMap[id];
    if (!raw) return undefined;
    return `data:image/svg+xml,${encodeURIComponent(raw).replace(/'/g, '%27').replace(/"/g, '%22')}`;
  }

  // Determine weather condition based on pressure
  private getWeatherInfo(): { key: string; icon: string } {
    const hpa = this.rawHpa;
    if (hpa < 980) return { key: 'storm', icon: 'storm' };
    if (hpa < 1000) return { key: 'rain', icon: 'rain' };
    if (hpa < 1020) return { key: 'partly', icon: 'partly' };
    return { key: 'sun', icon: 'sun' };
  }

  // Map weather condition to Material Design icon
  private getMdiIcon(id: string): string {
    const map: Record<string, string> = {
      sun: 'mdi:weather-sunny',
      partly: 'mdi:weather-partly-cloudy',
      rain: 'mdi:weather-rainy',
      storm: 'mdi:weather-lightning',
    };
    return map[id] ?? 'mdi:weather-cloudy'; // Default to cloudy if no match
  }

  // Handle user actions (tap, double tap, etc.)
  private _handleAction(evt: MouseEvent, actionConfig?: HassActionConfig): void {
    if (!actionConfig || actionConfig.action === 'none') return; // Exit if no action

    evt.stopPropagation(); // Prevent event bubbling

    const config = { ...actionConfig }; // Create a copy to avoid mutation

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
          history.pushState(null, '', config.path); // Update browser history
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
          this.hass.callService(domain, service, config.service_data); // Call HA service
        }
        break;
      default:
    }
  }

  // Render the card
  render() {
    if (!this.config) return html``; // Return empty if config is not set

    const pressure = this.pressure; // Current pressure in configured unit
    const { tick_color, size, segments, angle: gaugeAngle = 270, border = 'outer', stroke_width = 20,
            major_tick_width = 1.5, major_tick_length = 2, min_max_marker_size = 5 } = this.config;
    const cx = 150, r = 110, cy = 150; // Center and radius for SVG gauge
    const minP = 950, maxP = 1050; // Minimum and maximum pressure range

    const startAngle = gaugeAngle === 180 ? Math.PI : Math.PI * 0.75; // Starting angle based on gauge orientation
    const endAngle = gaugeAngle === 180 ? Math.PI * 2 : Math.PI * 2.25; // Ending angle based on gauge orientation

    const hpaValue = this.rawHpa; // Raw pressure value in hPa
    const valueAngle = startAngle + ((hpaValue - minP) / (maxP - minP)) * (endAngle - startAngle); // Angle for current value

    const iconSize = this.config.icon_size ?? 50; // Default icon size
    const iconYOffset = this.config.icon_y_offset ?? 0; // Default icon offset

    const iconX = cx - iconSize / 2; // X position for weather icon
    const baseIconY = gaugeAngle === 180 ? cy - r / 2 - 20 : cy - iconSize / 2; // Base Y for icon
    const iconY = baseIconY + iconYOffset; // Adjusted Y for icon

    const labelY = gaugeAngle === 180 ? cy - 25 : cy + 60; // Y position for weather label
    const pressureY = gaugeAngle === 180 ? cy : cy + 60; // Y position for pressure value (moved upward)

    const lang = this.config.language || this.hass?.locale?.language || 'en'; // Determine language
    if (!Object.keys(this._translations).length || !this._translations[lang]) {
      this._translations = HaTbaroCard._localeMap[lang] || HaTbaroCard._localeMap['en']; // Set translations
    }

    const weather = this.getWeatherInfo(); // Get current weather condition
    const label = this._translations[weather.key] || weather.key; // Get localized weather label

    // Draw complete unfilled background arc
    const backgroundArc = svg`<path d="${this.describeArc(cx, cy, r, startAngle, endAngle)}" 
      stroke="${this.config.unfilled_color}" 
      stroke-width="${stroke_width}" 
      fill="none" 
      stroke-linecap="round" />`;

    // Draw filled colored arcs up to the current value
    const filledArcs = segments!.map(seg => {
      const segStartAngle = startAngle + ((seg.from - minP) / (maxP - minP)) * (endAngle - startAngle);
      const segEndAngle = startAngle + ((seg.to - minP) / (maxP - minP)) * (endAngle - startAngle);
      
      if (valueAngle < segStartAngle) {
        return nothing; // Skip if value is below segment start
      }
      
      const drawEndAngle = Math.min(valueAngle, segEndAngle);
      return svg`<path d="${this.describeArc(cx, cy, r, segStartAngle, drawEndAngle)}" 
        stroke="${seg.color}" 
        stroke-width="${stroke_width}" 
        fill="none" 
        stroke-linecap="round" />`;
    });

    const ticksHpa = [950, 960, 970, 980, 990, 1000, 1010, 1020, 1030, 1040, 1050]; // Pressure tick values
    const TICK_LEN_IN = 2; // Inner tick length

    // Draw major tick marks
    const majorTicks = ticksHpa.map(p => {
      const a = startAngle + ((p - minP) / (maxP - minP)) * (endAngle - startAngle);
      const rOuter = r + stroke_width / 2 + major_tick_length; // Outer radius
      const rInner = r - stroke_width / 2 - TICK_LEN_IN; // Inner radius
      const p1 = this.polar(cx, cy, rOuter, a);
      const p2 = this.polar(cx, cy, rInner, a);
      return svg`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${tick_color}" stroke-width="${major_tick_width}" />`;
    });

    // Draw pressure value labels
    const labelHpa = [950, 960, 970, 980, 990, 1000, 1010, 1020, 1030, 1040, 1050];
    const labels = labelHpa.map(p => {
      const display =
        this.config.unit === 'mm'
          ? (p * HaTbaroCard.HPA_TO_MM).toFixed(0)
          : this.config.unit === 'in'
            ? (p * HaTbaroCard.HPA_TO_IN).toFixed(2)
            : p.toString();
      const a = startAngle + ((p - minP) / (maxP - minP)) * (endAngle - startAngle);
      const pt = this.polar(cx, cy, r - 20, a); // Position labels inside gauge
      return svg`<text x="${pt.x}" y="${pt.y}" font-size="0.6em" class="label">${display}</text>`;
    });

    const outerR = r + stroke_width / 2 + 0.5; // Outer radius for border
    const innerR = r - stroke_width / 2 - 0.5; // Inner radius for border
    const borderOuter = svg`<path d="${this.describeArc(cx, cy, outerR, startAngle, endAngle)}" stroke="#000" stroke-width="1" fill="none" />`;
    const borderInner = svg`<path d="${this.describeArc(cx, cy, innerR, startAngle, endAngle)}" stroke="#000" stroke-width="1" fill="none" />`;

    const svgIcon = svg`<image href="${this.getIconDataUrl(weather.icon)}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" />`; // Weather icon

    // Draw min/max markers if enabled
    const minMaxMarkers = (() => {
      if (!this.config.show_min_max || this._minHpa === undefined || this._maxHpa === undefined) return nothing;
      const clampedMin = Math.max(minP, Math.min(maxP, this._minHpa));
      const clampedMax = Math.max(minP, Math.min(maxP, this._maxHpa));
      const minAngle = startAngle + ((clampedMin - minP) / (maxP - minP)) * (endAngle - startAngle);
      const maxAngle = startAngle + ((clampedMax - minP) / (maxP - minP)) * (endAngle - startAngle);
      
      const markerSize = min_max_marker_size;
      const rOuter = r + stroke_width / 2 + 2;
      const rInner = rOuter - markerSize * 1.5;

      const createArrow = (angle: number, color: string) => {
        const tip = this.polar(cx, cy, rInner, angle);
        const base1 = this.polar(cx, cy, rOuter, angle - 0.05);
        const base2 = this.polar(cx, cy, rOuter, angle + 0.05);
        return svg`
          <polygon points="${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}" 
                   fill="${color}" stroke="${color}" stroke-width="0.5" />
        `;
      };
      
      return svg`
        ${createArrow(minAngle, '#5599ff')} <!-- Min marker in blue -->
        ${createArrow(maxAngle, '#ff7755')} <!-- Max marker in orange -->
      `;
    })();

    // Draw trend indicator if enabled
    const trendIndicator = (() => {
      if (!this.config.show_trend || this._trend === undefined) return nothing;
      const trendX = cx + 58; // Position to the right of pressure value
      const trendY = pressureY - 11; // Center with pressure text (font-size 22 / 2)
      const size = 12; // Size of the trend triangle
      const halfSize = size / 2;

      let points = '';
      let fillColor = tick_color;

      if (this._trend === 'up') {
        points = `${trendX},${trendY - halfSize} ${trendX - halfSize},${trendY + halfSize} ${trendX + halfSize},${trendY + halfSize}`;
        fillColor = '#5599ff'; // Blue for upward trend
      } else if (this._trend === 'down') {
        points = `${trendX},${trendY + halfSize} ${trendX - halfSize},${trendY - halfSize} ${trendX + halfSize},${trendY - halfSize}`;
        fillColor = '#ff7755'; // Orange for downward trend
      } else { // stable
        points = `${trendX - halfSize},${trendY - halfSize} ${trendX + halfSize},${trendY - halfSize} ${trendX},${trendY + halfSize}`;
        fillColor = '#888'; // Gray for stable trend
      }

      return svg`<polygon points="${points}" fill="${fillColor}" stroke="${fillColor}" stroke-width="0.5" />`;
    })();

    const viewHeight = gaugeAngle === 180 ? 180 : 300; // Height of SVG viewBox
    const clipHeight = gaugeAngle === 180 ? (size! / 300) * 180 : 'auto'; // Clip height for 180° mode

    return html`
      <ha-card
        @click=${(e: MouseEvent) => this._handleAction(e, this.config.tap_action)} // Handle tap action
        @dblclick=${(e: MouseEvent) => this._handleAction(e, this.config.double_tap_action)} // Handle double tap action
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Prevent default behavior
            this._handleAction(e as any, this.config.tap_action); // Handle enter/space key
          }
        }}
        tabindex="0" // Make card focusable
      >
        <div style="overflow:hidden;height:${clipHeight};"></div> <!-- Clip container for height -->
        ${svg`<svg viewBox="0 0 300 ${viewHeight}" style="max-width:${size}px;height:auto">
          ${backgroundArc} <!-- Unfilled background arc -->
          ${filledArcs} <!-- Filled segments up to current value -->
          ${this.config.border !== 'none' && (this.config.border === 'inner' || this.config.border === 'both') ? borderInner : nothing} <!-- Inner border -->
          ${this.config.border === 'outer' || this.config.border === 'both' ? borderOuter : nothing} <!-- Outer border -->
          ${majorTicks} <!-- Major tick marks -->
          ${labels} <!-- Pressure value labels -->
          ${minMaxMarkers} <!-- Min/max markers -->
          ${this.config.show_icon ? svgIcon : nothing} <!-- Weather icon -->
          ${this.config.show_label ? svg`<text x="${cx}" y="${labelY}" font-size="14" class="label">${label}</text>` : nothing} <!-- Weather label -->
          <text x="${cx}" y="${pressureY}" font-size="22" font-weight="bold" class="label">
            ${this.config.unit === 'mm'
                ? Math.round(pressure) + ' mmHg'
                : this.config.unit === 'in'
                  ? pressure.toFixed(2) + ' inHg'
                  : Math.round(pressure) + ' hPa'
            }
          </text> <!-- Current pressure value -->
          ${trendIndicator} <!-- Trend indicator -->
        </svg>`}
      </ha-card>
    `;
  }

  // Return a custom element for the GUI editor
  static getConfigElement() {
    return document.createElement('ha-tbaro-card-editor');
  }

  // Provide a stub config for the card picker
  static getStubConfig() {
    return {
      entity: '', // Empty for user to fill (sensor entity)
      unit: 'hpa', // Default pressure unit
      size: 300, // Default card size
      angle: 270, // Default gauge angle
      stroke_width: 20, // Default gauge arc width
      show_min_max: true, // Default to show min/max
      show_trend: true, // Default to show trend
      history_days: 7, // Default history period
      tick_color: '#000000', // Default tick color
      unfilled_color: '#333333', // Default unfilled color
      segments: [
        { from: 950, to: 980, color: '#3399ff' }, // Sample low pressure segment
        { from: 980, to: 1000, color: '#4CAF50' }, // Sample normal low segment
        { from: 1000, to: 1020, color: '#FFD700' }, // Sample normal high segment
        { from: 1020, to: 1050, color: '#FF4500' } // Sample high pressure segment
      ]
    };
  }
}

// New custom editor element
class HaTbaroCardEditor extends LitElement {
  @property({ attribute: false }) hass!: any; // Home Assistant instance
  @property({ type: Object }) config?: BaroCardConfig; // Current configuration

  // Define the input schema for the form
  private get _schema() {
    return [
      {
        name: 'entity', // Entity selector for the barometer sensor
        selector: { entity: { domain: 'sensor' } }, // Restrict to sensor entities
        required: true
      },
      {
        name: 'unit', // Pressure unit selector
        selector: { select: { options: ['hpa', 'mm', 'in'] } }
      },
      {
        name: 'size', // Card size slider
        selector: { number: { min: 200, max: 500, step: 10 } }
      },
      {
        name: 'angle', // Gauge angle dropdown
        selector: { select: { options: [180, 270] } }
      },
      {
        name: 'stroke_width', // Gauge arc width slider
        selector: { number: { min: 5, max: 50, step: 1 } }
      },
      {
        name: 'show_min_max', // Toggle for min/max markers
        selector: { boolean: {} }
      },
      {
        name: 'show_trend', // Toggle for trend indicator
        selector: { boolean: {} }
      },
      {
        name: 'history_days', // History days slider
        selector: { number: { min: 1, max: 30, step: 1 } }
      },
      {
        name: 'tick_color', // Tick color picker
        selector: { color: {} }
      },
      {
        name: 'unfilled_color', // Unfilled arc color picker
        selector: { color: {} }
      }
      // Note: Segments array requires a custom repeater (see below for expansion)
    ];
  }

  // Render the editor form
  render() {
    if (!this.hass || !this.config) return html``; // Return empty if hass or config is missing

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${this._schema}
        .computeLabel=${(schema) => schema.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  // Handle config changes from the form
  private _valueChanged(ev: CustomEvent) {
    const newConfig = ev.detail.value;
    this.dispatchEvent(new CustomEvent('config-changed', {
      bubbles: true,
      composed: true,
      detail: { config: newConfig }
    }));
  }
}

// Register the editor element
customElements.define('ha-tbaro-card-editor', HaTbaroCardEditor);
