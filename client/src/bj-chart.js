import { LitElement, html, css } from 'lit-element/lit-element.js';
import { createChart } from 'lightweight-charts';
import { fetchMixin } from './fetch-mixin.js';

class BjChart extends fetchMixin(LitElement) {

  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        background: #000;
      }

      :host([fullscreen]) {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        height: auto !important;
        z-index: 10;
      }

      to-icon {
        --to-icon-color: #fff;
      }

      .chart {
        position: relative;
        flex: 1;
      }

      .chart ::slotted(div) {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
      }

      .tools {
        padding: 20px;
        display: flex;
        align-items: center;
      }

      .tools > * + * {
        margin-left: 20px;
      }
    `;
  }

  render() {
    return html`
      <div class="tools">
        <div>${this.account}</div>
      </div>
      <div class="chart">
        <slot></slot>
      </div>
    `;
  }

  static get properties() {
    return {
      account: { type: String },
      fullscreen: { type: Boolean, reflect: true }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    
    this.chartEl = document.createElement('div');
    this.appendChild(this.chartEl);
  }

  firstUpdated() {
    this._chart = createChart(this.chartEl, {
      height: this.chartEl.offsetHeight,
      width: this.chartEl.offsetWidth
    });

    this._chart.applyOptions({
      layout: {
        backgroundColor: '#000',
        textColor: '#696969',
        fontSize: 12
      },
      grid: {
        vertLines: {
            color: 'rgba(70, 130, 180, 0.5)',
            style: 1,
            visible: true,
        },
        horzLines: {
            color: 'rgba(70, 130, 180, 0.5)',
            style: 1,
            visible: true,
        },
      },
      timeScale: {
        rightOffset: 12,
        barSpacing: 3,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
        borderVisible: false,
        borderColor: '#fff000',
        visible: true,
        timeVisible: true,
        secondsVisible: false,
      }
    });

    this._series = this._chart.addLineSeries({
      color: '#f48fb1',
      lineStyle: 0,
      lineWidth: 1,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      lineType: 1
    });

    this._series.applyOptions({
      priceFormat: {
        type: 'price',
        precision: 8,
        minMove: 0.00000001,
      },
    })

    setTimeout(() => {
      this._chart.timeScale().fitContent();
    }, 0);

    window.addEventListener('resize', () => {
      this._chart.resize(this.chartEl.offsetWidth, this.chartEl.offsetHeight);
    });

  }
  
  setRecords(records) {
    this._series.setData(records);
  }

  _fullscreen() {
    this.fullscreen = !this.fullscreen;

    this.updateComplete.then(() => {
      this._chart.resize(this.chartEl.offsetWidth, this.chartEl.offsetHeight);
    });
  }
}

window.customElements.define('bj-chart', BjChart);