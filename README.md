# ha-tbaro-card

Barometric gauge card for Home Assistant — clean, customizable, SVG-based.

![preview](https://user-images.githubusercontent.com/your-preview-image.png)

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

1. In Home Assistant, go to **HACS > Frontend > Custom Repositories**
2. Add your repository: `https://github.com/<your-username>/ha-tbaro-card`
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

## 🧪 Usage Example

```yaml
type: custom:ha-tbaro-card
entity: sensor.pessac_pressure
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

Auto-selected based on Home Assistant UI language.

---

## 🛠️ Dev

```bash
git clone https://github.com/<your-username>/ha-tbaro-card.git
cd ha-tbaro-card
npm install
npm run build
```

---

## 🧾 License

MIT — by [@your-username](https://github.com/your-username)
