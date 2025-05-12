# ha-tbaro-card

A modern barometric gauge card for Home Assistant Lovelace UI. Fully customizable, responsive, and installable via HACS.

## Features

- SVG-based circular gauge
- Custom segments, ticks, labels, needle color
- Optional weather icon and label

## Installation

1. Add this repo as a [HACS custom repository](https://hacs.xyz/docs/faq/custom_repositories/).
2. Install `ha-tbaro-card` through HACS under "Frontend".
3. Add to `configuration.yaml` if needed:

```yaml
lovelace:
  resources:
    - url: /hacsfiles/ha-tbaro-card/ha-tbaro-card.js
      type: module
```

4. Use in a dashboard:

```yaml
type: custom:ha-tbaro-card
entity: sensor.pressure
size: 280
needle_color: "#222"
tick_color: "#191970"
show_icon: true
```

## Development

```bash
npm install
npm run build
```

Output: `dist/ha-tbaro-card.js`

---
MIT License
