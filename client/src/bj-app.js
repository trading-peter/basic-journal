/**
@license
Copyright (c) 2020 trading_peter
*/

import './bj-chart.js';
import './bj-trade-table.js';
import { LitElement, html } from 'lit-element';
import { fetchMixin } from './fetch-mixin.js';
import { parseISO, format } from 'date-fns';

class BjApp extends fetchMixin(LitElement) {
  render() {
    const accounts = this.accounts || [];
    const trades = this.trades || [];

    return html`
      <style>
        :host {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          overflow: auto;
          overflow-x: hidden;
        }

        bj-chart {
          height: 600px;
        }

        .tools {
          padding: 20px;
        }

        .trade-table {
          display: grid;
          grid-template-columns: 1fr auto auto;
          grid-column-gap: 20px;
          grid-row-gap: 10px;
          padding: 10px;
          max-width: 500px;
          margin: 10px;
        }

        .header {
          font-weight: bold;
        }

        .center {
          text-align: center;
        }
      </style>

      <div class="tools">
        <select id="account" @change=${this._selectAccount}>
          ${accounts.map(acc => html`
            <option value=${acc}>${acc}</option>
          `)}
        </select>
      </div>

      <div class="wrap">
        <bj-chart .account=${this._selAccount}></bj-chart>
      </div>

      <bj-trade-table .entries=${trades}></bj-trade-table>
    `;
  }

  static get properties() {
    return {
      accounts: { type: Object },
      trades: { type: Array },
      _selAccount: { type: String },
    };
  }

  constructor() {
    super();

    this.trades = [];
    this.balance = [];
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();

    await this._loadAppConfig();
  }

  async _loadAppConfig() {
    const resp = await this.get('/appConfig');
    this.accounts = resp.config.accounts;
    this._selAccount = this.accounts[0];
    this._loadStats();
  }

  async _loadStats() {
    const { trades, balance } = await this.post('/stats', { account: this._selAccount });
    this.trades = trades;
    this.querySelector('bj-chart').setRecords(balance.map(rec => {
      return {
        time: format(parseISO(rec.date), 'yyyy-MM-dd'),
        value: parseFloat(rec.balance)
      };
    }));
  }

  _selectAccount(e) {
    this._selAccount = e.target.value;
    this._loadStats();
  }
}

window.customElements.define('bj-app', BjApp);