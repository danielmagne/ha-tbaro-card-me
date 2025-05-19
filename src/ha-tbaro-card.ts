// ha-tbaro-card.ts
// Contenu complet déjà généré plus tôt, remis ici sous forme de fichier TypeScript dans src/

import { LitElement, html, css, svg, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

// Import des icônes SVG comme chaînes via rollup-plugin-string
// @ts-ignore
import weatherStyles from './styles.js';
import sunIcon from './icons/sun.svg';
import rainIcon from './icons/rain.svg';
import partlyIcon from './icons/partly.svg';
import stormIcon from './icons/storm.svg';


import fr from '../locales/fr.json';
import en from '../locales/en.json';

interface Segment {
  from: number;
  to: number;
  color: string;
}

interface BaroCardConfig {
  entity: string;
  language?: string;
  needle_color?: string;
  tick_color?: string;
  show_icon?: boolean;
  stroke_width?: number;
  size?: number;
  angle?: 180 | 270;
  show_border?: boolean;
  segments?: Segment[];
}

@customElement('ha-tbaro-card')
export class HaTbaroCard extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ type: Object }) config!: BaroCardConfig;

  private _translations: Record<string, string> = {};
  private static _localeMap: Record<string, Record<string, string>> = { fr, en };


  static styles = [
    css`
      :host {
        display: block;
      }
      svg {
        display: block;
        margin: auto;
      }
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

    const lang = config.language || this.hass?.locale?.language || 'en';
    this._translations = {};

    this.config = {
      needle_color: '#000',
      tick_color: '#000',
      show_icon: true,
      stroke_width: 20,
      show_border: false,
      size: 300,
      angle: 270,
      segments: [
        { from: 950, to: 980, color: '#3399ff' },
        { from: 980, to: 1000, color: '#4CAF50' },
        { from: 1000, to: 1020, color: '#FFD700' },
        { from: 1020, to: 1050, color: '#FF4500' }
      ],
      ...config
    };
  }


  get pressure(): number {
    const state = this.hass.states[this.config.entity];
    return state ? parseFloat(state.state) : 1013.25;
  }

  polar(cx: number, cy: number, r: number, angle: number) {
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  }

  describeArc(cx: number, cy: number, r: number, start: number, end: number) {
    const s = this.polar(cx, cy, r, start);
    const e = this.polar(cx, cy, r, end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  getIcon2(id: string) {
    const svgMap: Record<string, string> = {
      sun: sunIcon,
      rain: rainIcon,
      partly: partlyIcon,
      storm: stormIcon,
    };
  
    const src = svgMap[id];
    if (!src) return nothing;
  
    return html`
      <div class="icon">
        <img class="weather-img-svg" src="${src}" loading="lazy" />
      </div>
    `;
  }
  
  // pour créer un lien <img en HTML à partit d'une image en svg
  getIcon(id: string) {
    const svgMap: Record<string, string> = {
      sun: sunIcon,
      rain: rainIcon,
      partly: partlyIcon,
      storm: stormIcon,
    };

    const raw = svgMap[id];
    if (!raw) return nothing;

    const encoded = encodeURIComponent(raw)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    const dataUrl = `data:image/svg+xml,${encoded}`;

    return html`
      <img class="weather-img-svg" src="${dataUrl}" loading="lazy" width="32" height="32" style="display:block; margin: -30px auto 5px auto;" />
    `;
  }
  

  getIconDataUrl(id: string): string | undefined {
    const svgMap: Record<string, string> = {
      sun: sunIcon,
      rain: rainIcon,
      partly: partlyIcon,
      storm: stormIcon,
    };
    const raw = svgMap[id];
    if (!raw) return undefined;
    return `data:image/svg+xml,${encodeURIComponent(raw).replace(/'/g, '%27').replace(/"/g, '%22')}`;
  }



  getWeatherInfo(p: number): { key: string; icon: string } {
    if (p < 980) return { key: "storm", icon: "storm" };
    if (p < 1000) return { key: "rain", icon: "rain" };
    if (p < 1020) return { key: "partly", icon: "partly" };
    return { key: "sun", icon: "sun" };
  }

render() {
  const pressure = this.pressure;
  const {
    needle_color,
    tick_color,
    size,
    segments,
    angle: gaugeAngle = 270,  // ← ici l’angle
    show_border = false,
  } = this.config;

  const stroke_width = this.config.stroke_width ?? 20;
  const cx = 150, r = 110;
  const cy = gaugeAngle === 180 ? 150 : 150;
  const minP = 950, maxP = 1050;

  // Gestion de l'angle dynamique
  const startAngle = gaugeAngle === 180 ? Math.PI : Math.PI * 0.75;
  const endAngle = gaugeAngle === 180 ? Math.PI * 2 : Math.PI * 2.25;
  const valueAngle = startAngle + ((pressure - minP) / (maxP - minP)) * (endAngle - startAngle);

  // Position dynamique des éléments verticaux
  const weatherYOffset = gaugeAngle === 180 ? -90 : 0;
  const iconYOffset = gaugeAngle === 180 ? -90 : 0;
  const iconX = cx - 25;
  const iconY = (gaugeAngle === 180 ? cy+12 : cy+5 ) + iconYOffset;
  const labelY = (gaugeAngle === 180 ? cy - 35 : cy + 60);
  const pressureY = (gaugeAngle === 180 ? cy + 0 : cy + 85);


  // Arcs colorés
  const arcs = segments!.map(seg => {
    const aStart = startAngle + ((seg.from - minP) / (maxP - minP)) * (endAngle - startAngle);
    const aEnd = startAngle + ((seg.to - minP) / (maxP - minP)) * (endAngle - startAngle);
    return svg`<path d="${this.describeArc(cx, cy, r, aStart, aEnd)}" stroke="${seg.color}" stroke-width="${stroke_width}" fill="none" />`;
  });

  // Ticks
  const ticks = Array.from({ length: 11 }, (_, i) => 950 + i * 10).map(p => {
    const a = startAngle + ((p - minP) / (maxP - minP)) * (endAngle - startAngle);
    const p1 = this.polar(cx, cy, r + 16, a);
    const p2 = this.polar(cx, cy, r - 24, a);
    return svg`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${tick_color}" stroke-width="2" />`;
  });

  // Labels
  const labels = [960, 980, 1000, 1020, 1040].map(p => {
    const a = startAngle + ((p - minP) / (maxP - minP)) * (endAngle - startAngle);
    const pt = this.polar(cx, cy, r - 36, a);
    return svg`<text x="${pt.x}" y="${pt.y}" font-size="0.9em" font-weight="bolder" class="label">${p}</text>`;
  });

  // Aiguille
  const needle = (() => {

    //const needleLength = gaugeAngle === 180 ? r - 60 : r - 35;
    //const baseLength = gaugeAngle === 180 ? 30 : 16;
  
    //const cy_needle =  cy;
    //const tip = this.polar(cx, cy_needle, needleLength, valueAngle);
    //const base = this.polar(cx, cy_needle, baseLength, valueAngle);

    const needleLength = gaugeAngle === 180 ? r +5 : r - 35;
    const baseLength = gaugeAngle === 180 ? 60 : 16;
    const tip = this.polar(cx, cy, needleLength, valueAngle);
    const base = this.polar(cx, cy, baseLength, valueAngle);


    const centralDot = gaugeAngle === 180 ? nothing : svg`<circle cx="${cx}" cy="${cy}" r="10" fill="${tick_color}" />`;

    const sideAngle = valueAngle + Math.PI / 2;
    const offset = 5;
    const baseL = { x: base.x + Math.cos(sideAngle) * offset, y: base.y + Math.sin(sideAngle) * offset };
    const baseR = { x: base.x - Math.cos(sideAngle) * offset, y: base.y - Math.sin(sideAngle) * offset };
    return svg`
      <polygon points="${tip.x},${tip.y} ${baseL.x},${baseL.y} ${baseR.x},${baseR.y}" fill="${needle_color}" />
      ${centralDot}
      `;
  })();

    // gestiopn de la locale
    const lang = this.config.language || this.hass?.locale?.language || 'en';
    if (!Object.keys(this._translations).length || !this._translations[lang]) {
      this._translations = HaTbaroCard._localeMap[lang] || HaTbaroCard._localeMap['en'];
    }

// à ajouter avant ${arcs} si on veut un border 1px autour de la gauge:
// <circle cx="${cx}" cy="${cy}" r="${r + stroke_width / 2}" fill="none" stroke="#000" stroke-width="1" />

    //const label = pressure > 1020 ? 'Soleil radieux' : pressure < 980 ? 'Tempête' : pressure < 1000 ? 'Pluie probable' : 'Ciel dégagé';
    const weather = this.getWeatherInfo(pressure);
    const label = this._translations[weather.key] || weather.key;

    // début création border fer à cheval
    const borderRadius = r + stroke_width / 2 + 0.5;
    const borderArc = svg`<path d="${this.describeArc(cx, cy, borderRadius, startAngle, endAngle)}" stroke="#000" stroke-width="1" fill="none" />`;
  return html`
    <ha-card style="box-shadow:none;background:transparent;border:none;border-radius:0;">
      ${svg`<svg viewBox="0 0 300 300" style="max-width:${size}px;height:auto">
        ${show_border ? borderArc : nothing}
        ${arcs}
        ${ticks}
        ${labels}
        ${needle}
        <image href="${this.getIconDataUrl(weather.icon)}" x="${iconX}" y="${iconY}" width="50" height="50" />
        <text x="${cx}" y="${labelY}" font-size="14" class="label">${label}</text>
        <text x="${cx}" y="${pressureY}" font-size="22" font-weight="bold" class="label">${pressure.toFixed(1)} hPa</text>
      </svg>`}
    </ha-card>
  `;
    //  si on veut afficher une image en HTML: ${show_icon ? this.getIcon(weather.icon) : nothing}
    // mais il faut le faire hors du svg.
  }
}
