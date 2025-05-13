declare module '*.svg' {
    const content: string;
    export default content;
  }
  declare module './styles.js' {
    import { CSSResultGroup } from 'lit';
    const styles: CSSResultGroup;
    export default styles;
  }
  