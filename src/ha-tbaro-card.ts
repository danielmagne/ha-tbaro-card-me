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

interface Segment {
  from: number;
  to: number;
  color: string;
}

interface BaroCardConfig {
  entity: string;
  needle_color?: string;
  tick_color?: string;
  show_icon?: boolean;
  stroke_width?: number;
  size?: number;
  segments?: Segment[];
}

@customElement('ha-tbaro-card')
export class HaTbaroCard extends LitElement {
  @property({ attribute: false }) hass: any;
  @property({ type: Object }) config!: BaroCardConfig;

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
    this.config = {
      needle_color: '#000',
      tick_color: '#000',
      show_icon: true,
      stroke_width: 20,
      size: 300,
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



  getWeatherInfo(p: number): { label: string; icon: string } {
    if (p < 980) return { label: "Tempête", icon: "storm" };
    if (p < 1000) return { label: "Pluie probable", icon: "rain" };
    if (p < 1020) return { label: "Ciel dégagé", icon: "partly" };
    return { label: "Soleil radieux", icon: "sun" };
  }

  render() {
    const pressure = this.pressure;
    const { needle_color, tick_color, show_icon, stroke_width, size, segments } = this.config;
    const cx = 150, cy = 150, r = 110;
    const minP = 950, maxP = 1050;
    const angle = Math.PI * 0.75 + ((pressure - minP) / (maxP - minP)) * (Math.PI * 1.5);

    const arcs = segments!.map(seg => {
      const aStart = Math.PI * 0.75 + ((seg.from - minP) / (maxP - minP)) * Math.PI * 1.5;
      const aEnd = Math.PI * 0.75 + ((seg.to - minP) / (maxP - minP)) * Math.PI * 1.5;
      return svg`<path d="${this.describeArc(cx, cy, r, aStart, aEnd)}" stroke="${seg.color}" stroke-width="${stroke_width}" fill="none" />`;
    });

    const ticks = Array.from({ length: 11 }, (_, i) => 950 + i * 10).map(p => {
      const a = Math.PI * 0.75 + ((p - minP) / (maxP - minP)) * Math.PI * 1.5;
      const p1 = this.polar(cx, cy, r + 16, a);
      const p2 = this.polar(cx, cy, r - 24, a);
      return svg`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${tick_color}" stroke-width="2" />`;
    });

    const labels = [960, 980, 1000, 1020, 1040].map(p => {
      const a = Math.PI * 0.75 + ((p - minP) / (maxP - minP)) * Math.PI * 1.5;
      const pt = this.polar(cx, cy, r - 36, a);
      return svg`<text x="${pt.x}" y="${pt.y}" font-size="0.9em" font-weight="bolder" class="label">${p}</text>`;
    });

    const needle = (() => {
      const tip = this.polar(cx, cy, r - 35, angle);
      const base = this.polar(cx, cy, 16, angle);
      const sideAngle = angle + Math.PI / 2;
      const offset = 5;
      const baseL = { x: base.x + Math.cos(sideAngle) * offset, y: base.y + Math.sin(sideAngle) * offset };
      const baseR = { x: base.x - Math.cos(sideAngle) * offset, y: base.y - Math.sin(sideAngle) * offset };
      return svg`
        <polygon points="${tip.x},${tip.y} ${baseL.x},${baseL.y} ${baseR.x},${baseR.y}" fill="${needle_color}" />
        <circle cx="${cx}" cy="${cy}" r="10" fill="${tick_color}" />`;
    })();

    const label = pressure > 1020 ? 'Soleil radieux' : pressure < 980 ? 'Tempête' : pressure < 1000 ? 'Pluie probable' : 'Ciel dégagé';
    const weather = this.getWeatherInfo(pressure);

    return html`
      <ha-card style="box-shadow:none;background:transparent;border:none;border-radius:0;">
        ${svg`<svg viewBox="0 0 300 300" style="max-width:${size}px;height:auto">
          ${arcs}
          ${ticks}
          ${labels}
          ${needle}
          <image href="${this.getIconDataUrl(weather.icon)}" x="120" y="170" width="50" height="50" />
          <text x="${cx}" y="${cy + 60}" font-size="14" class="label">${weather.label}</text>
          <text x="${cx}" y="${cy + 85}" font-size="22" font-weight="bold" class="label">${pressure.toFixed(1)} hPa</text>
        </svg>`}

      </ha-card>
    `;
    //  si on veut afficher une image en HTML: ${show_icon ? this.getIcon(weather.icon) : nothing}
    // mais il faut le faire hors du svg.
  }
}
