# ha-tbaro-card

![TBaro Card](https://img.shields.io/github/v/release/trollix/ha-tbaro-card)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/trollix/ha-tbaro-card)](https://github.com/trollix/ha-tbaro-card/releases)
![GitHub Release Date](https://img.shields.io/github/release-date/trollix/ha-tbaro-card)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=flat)](https://github.com/custom-components/hacs)

Barometric gauge card for Home Assistant — clean, customizable, SVG-based.

![preview](https://github.com/trollix/ha-tbaro-card/blob/main/img_tbaro_en.png?raw=true)

## ✨ Features

- 🌀 Circular barometer gauge (fer à cheval)
- 🎨 Colored segments based on pressure ranges
- 📍 Animated needle
- 🌤️ Weather icons (sun, rain, partly, storm)
- 🌐 Multi-language support via external JSON files
- 🧩 Lovelace-compatible and HACS-ready

---

## 📦 Installation

### Option 1: via HACS (recommended)

✨ Install via HACS

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=trollix&repository=ha-tbaro-card)

1. In Home Assistant, go to **HACS > Frontend > Custom Repositories**
2. Add your repository: `https://github.com/trollix/ha-tbaro-card`
3. Select **Lovelace** as category
4. Click **Install** on `ha-tbaro-card`

### Option 2: manual

1. Copy `dist/ha-tbaro-card.js` into your `www` folder
2. Add to `configuration.yaml` or your Lovelace resources:

```yaml
resources:
  - url: /local/ha-tbaro-card.js
    type: module
```

---

## ⚙️ Options

### `angle`

- `270` (default): Fer à cheval (135° à 405°)
- `180` : Demi-cercle (180° à 360°)

---

## 🧪 Usage Example

```yaml
type: custom:ha-tbaro-card
entity: sensor.pessac_pressure
angle: 180  # or 270 (default)
show_icon: true
show_border: true
stroke_width: 20
size: 300
needle_color: '#000000'
tick_color: '#000080'
segments:
  - from: 950
    to: 980
    color: '#3399ff'
  - from: 980
    to: 1000
    color: '#4CAF50'
  - from: 1000
    to: 1020
    color: '#FFD700'
  - from: 1020
    to: 1050
    color: '#FF4500'
```

---

## 🌍 Localization

Translations are stored in `locales/`:

- `locales/en.json`
- `locales/fr.json`

By default, the card uses the current Home Assistant UI language.
You can override it explicitly using the `language` option:

```yaml
language: fr  # or enyaml
type: custom:ha-tbaro-card
entity: sensor.pessac_pressure
language: fr  # or en
```

---

## Preview

### Card (en)

#### Baro-en

![HA-TBARO-CARD](https://github.com/trollix/ha-tbaro-card/blob/main/img_tbaro_en.png?raw=true "Ha TBaro Card")

#### Form-en

![HA-TBARO-CARD](https://github.com/trollix/ha-tbaro-card/blob/main/img_form_border_en.png?raw=true "Ha TBaro Card")

### Card (fr)

#### Baro-fr

![HA-TBARO-CARD](https://github.com/trollix/ha-tbaro-card/blob/main/img_tbaro_fr.png?raw=true "Ha TBaro Card")

#### form-fr

![HA-TBARO-CARD](https://github.com/trollix/ha-tbaro-card/blob/main/img_form_border_fr.png?raw=true "Ha TBaro Card")

## 🛠️ Dev

```bash
git clone https://github.com/trollix/ha-tbaro-card.git
cd ha-tbaro-card
npm install
npm run build
```

---

## 🧾 License

MIT — by [@trollix](https://github.com/your-username)
